---
date: 2024-9-29
tag:
  - pwn
  - kernel
---

# linux内核学习(2) dirty pipe/cow学习

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

## 前置知识

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

然后在第二部的时候如果我们恰好能执行madvise从而让副本释放掉,就会将进程的页表重新指向原始的映射内存物理块,那么再次写入数据的时候就会导致只读文件被写入数据

## DirtyPipe漏洞成因