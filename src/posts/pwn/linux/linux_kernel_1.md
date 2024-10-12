# 不好看的linux内核安全学习 (1) - 复现d3ctf 2022 d3kheap

## 题目启动

> 本blog大量内容都是对参考文章的摘录汇总，方便本人查看（ 所以更推荐直接看参考文章
>
> 以及这道题有较多的知识点所以整个文章会有点冗余
>
> 可能往后linux内核学习的文章都是这样的形式,通过一个cve或者一个题来学习大量知识点,这样会导致文章都很冗余(充斥大量copy内容),所以我给这个系列叫做《不好看的linux内核安全学习》
>
> 内核题在比赛时一般是上传 C 语言程序的 base64 编码到服务器，然后运行
>
> 参考文章:[浅谈linux中的根文件系统（rootfs的原理和介绍）-CSDN博客](https://blog.csdn.net/LEON1741/article/details/78159754)
>
> [几种linux内核文件的区别(vmlinux、zImage、bzImage、uImage、vmlinuz、initrd )_zimage是什么-CSDN博客](https://blog.csdn.net/hanxuefan/article/details/7454352)
>
> [D3CTF2022 - Pwn - d3kheap 题解 - 先知社区 (aliyun.com)](https://xz.aliyun.com/t/11370?time__1311=Cq0xR70QeiuDlxGgx%2BOADgGEoKK7T4FpD)
>
> [qemu常用参数选项说明_qemu 参数-CSDN博客](https://blog.csdn.net/weixin_39871788/article/details/123250595)
>
> [Kernel pwn CTF 入门 | Kiprey's Blog](https://kiprey.github.io/2021/10/kernel_pwn_introduction/#二、环境配置)
>
> [cpio文件系统的解压和制作方法_window cpio文件直接添加文件-CSDN博客](https://blog.csdn.net/dba_monkey/article/details/60767147)
>
> [Linux下编写和加载 .ko 文件（驱动模块文件）_qt 加载 .ko-CSDN博客](https://blog.csdn.net/qq_38880380/article/details/79227760)
>
> [Linux 系统设置 : insmod 命令详解_linx如何进入insmod-CSDN博客](https://blog.csdn.net/yexiangCSDN/article/details/82828055)
>
> [Linux内核模块详解_linux编写内核模块-CSDN博客](https://blog.csdn.net/qq_33406883/article/details/100071183)
>
> [【Linux驱动开发100问】什么是模块？如何编写和使用模块？_什么是谷歌挂载模块程序-CSDN博客](https://blog.csdn.net/qq_45172832/article/details/129228731#:~:text=在Linux内核中，模块可以被动态地插入和卸载，因此模块通常被用来扩展内核的功能。,而驱动则是一种特殊的模块，用于管理硬件设备，控制硬件设备的操作。 在Linux中，驱动通常也以模块的形式存在于内核中，从而使得内核可以支持更多的硬件设备。)
>
> [Linux内核的ioctl函数学习 - the_tops - 博客园 (cnblogs.com)](https://www.cnblogs.com/the-tops/p/6738089.html#:~:text=ioctl是设备驱动程序中对设备的I%2FO通道进行管理的函数。 所谓对I%2FO通道进行管理，就是对设备的一些特性进行控制，例如串口的传输波特率、马达的转速等等。 它的调用个数如下： int ioctl (int,fd%2C ind cmd%2C …)； 其中fd就是用户程序打开设备时使用open函数返回的文件标示符，cmd就是用户程序对设备的控制命令，至于后面的省略号，那是一些补充参数，一般最多一个，有或没有是和cmd的意义相关的。 ioctl函数是文件结构中的一个属性分量，就是说如果你的驱动程序提供了对ioctl的支持，用户就可以在用户程序中使用ioctl函数控制设备的I%2FO通道。)
>
> [内核与用户空间的通信实现——ioctl（驱动+用户程序）_ioctl 释放设备-CSDN博客](https://blog.csdn.net/ljl113/article/details/127013196)
>
> linux kernel漏洞系列文章:[Pwn In Kernel（一）：基础知识 - FreeBuf网络安全行业门户](https://www.freebuf.com/articles/system/227357.html)
>
> linux内核源码:[Index of /sites/ftp.kernel.org/pub/linux/kernel/ (sjtu.edu.cn)](http://ftp.sjtu.edu.cn/sites/ftp.kernel.org/pub/linux/kernel/)
>
> userfaultfd学习:https://brieflyx.me/2020/linux-tools/userfaultfd-internals/
>
> https://blog.jcix.top/2018-10-01/userfaultfd_intro/
>
> https://blog.csdn.net/seaaseesa/article/details/104650794
>
> sk_buff结构体:https://blog.csdn.net/wangquan1992/article/details/112572572
>
> d3kheap复现:https://ywhkkx.github.io/2022/06/30/msg_msg-sk_buff%E7%9A%84%E7%BB%84%E5%90%88%E5%88%A9%E7%94%A8+pipe_buffer%20attack/

### 文件类型

`rootfs`：根文件系统只是文件系统中的一种比较特殊的形式

- cpio -idmv < XXX.cpio 可以解压得到整个系统文件

- 根文件系统是内核启动所挂载( mount 在 Linux 中将一个文件系统与一个存储设备关联起来的过程称为挂载 )的第一个文件系统,并且内核代码的`映像文件`保存在根文件系统中,随后启动一些初始化脚本。
  - `init进程`的应用必须运行在根文件系统上
  - 根文件系统提供了根目录`/`
  - shell命令程序必须运行在根文件系统上

- 根文件系统必须包含的目录
  - `/etc`：存储重要的配置文件。
  - `/bin`：存储常用且开机时必须用到的执行文件。
  - `/sbin`：存储着开机过程中所需的系统执行文件。
  - `/lib`：存储/bin/及/sbin/的执行文件所需的链接库，以及Linux的内核模块。
  - `/dev`：存储设备文件。须

`bzImage`内核文件

- vmlinux 编译出来的最原始的内核文件，未压缩。
- zImage  是vmlinux经过gzip压缩后的文件
- bzimage zImage解压缩内核到低端内存(第一个640K)，bzImage解压缩内核到高端内存(1M以上)。如果内核比较小，那么采用zImage或bzImage都行，如果比较大应该用bzImage。
- vmlinuz 是bzImage/zImage文件的拷贝或指向bzImage/zImage的链接

`ko` （kernel object）内核模块 (下方单独拿一个板块进行分析ko)

-  该文件的意义就是把内核的一些功能移动到内核外边， 需要的时候插入内核，不需要时卸载。
- 加载驱动的方法
  - insmod xxx.ko （**insmod命令**用于将给定的模块加载到内核中 rmmod就是卸载模块 属于动态加载）
  - 卸载模块:rmmod xxx.ko
  - 查看已经加载的模块 : lsmod

### 构建环境

- 题目启动脚本

```sh
#!/bin/bash
# 设置退出指令是ctl+c
stty intr ^]
cd `dirname $0`
qemu-system-x86_64 \
	-m 256M \
	-cpu kvm64,+smep,+smap \
    -smp cores=2,threads=2 \
	-kernel bzImage \
	-initrd ./rootfs.cpio \
    -nographic \
	-monitor /dev/null \
	-snapshot \
	-append "console=ttyS0 kaslr pti=on quiet oops=panic panic=1" \
	-no-reboot \
    -s

```

直接在安装了qemu的linux环境下运行run.sh即可就可以得到环境了

#### `Qemu`启动参数

> 如果要加载vmlinx符号表,必须在-append的时候指定为`nokaslr`关闭kernel ASLR功能
>
> 如果Qemu用-s -S `调试模式`打开了 那么我们就可以用gdb -q -ex "target remote localhost:1234"进行链接

- 内存大小(-m)
- 核心数（-smp）

- 取消仿真GUI（-nographic）

- gdb调试(-gdb tcp::1234 -S 或者-s -S)

- 快照模式(-snapshot)这样qemu启动虚拟机创建一个写时拷贝（cow）的临时层 所有对虚拟机磁盘的写操作都会被写入到这个临时层，而不会影响底层的原始磁盘映像。也就是说，虚拟机运行期间的所有更改都是暂时的，一旦虚拟机关闭或重启，这些更改就会被丢弃。

- 向内核传递参数(-append)
  - console=tty50 指定内核的控制台输出使用串行端口tty50 这很重要因为在-nographic情况下
  - kaslr 开启linux kaslr功能 也就是内核随机化内存布局
  - pti=on 也就是启动页表隔离
  - quiet减少内核启动的日志输出,只显示关键信息,隐藏一般性日志
  - oops=panic也就是当内核出现非致命内核错误的时候立刻触发panic（调试）

  - 关闭自动重启虚拟机 -no-reboott

  - 设置内核文件 -kernel
  - 设置根文件系统 -initrd 

#### gdb附着

然后可以用`gdb -q -ex "target remote localhost:1234"`进行连接

## 前置知识

### 模块(ko)

> 先将rootfs利用指令进行解压(上文提到了),然后将文件传输出来,找到*.ko文件,拖入ida进行分析
>
> 模块机制的完整叫法应该是动态可加载内核模块(Loadable Kernel Module)或 LKM
>
> 模块可以是设备驱动、文件系统、网络协议、安全模块等

- Linux操作系统的内核是单一体系结构(monolithic kernel) 整个内核是一个单独的非常大的程序

- Windows NT采用的就是微内核体系结构  操作系统的核心部分是一个很小的内核，实现一些最基本的服务，如创建和删除进程、内存管理、中断管理等等 而文件系统、网络协议等其它部分都在微内核外的用户空间里运行

- 模块是一种目标对象文件 无链接 不能独立运行 模块不是作为一个进程进行运行 而是相当于静态连接的内核函数
- 内核是运行在内核空间的

#### 正式编写

- 首先导入<linux/moudule.h>头文件（当然还有很多其他必要的头文件） 包含了我们编写内核模块所必须的结构定义等内容  

  -  跟模块有关的数据结构存放在include/linux/module.h中 比如struct module
    -  在内核中每一个内核模块都由一个module对象描述
    -  所有module对象连成一个链表，链表第一个元素为: static LIST_HEAD(modules)
  - 还有`skernel_symbol`存储着内核符号

- 然后定义 `init_module`和`cleanup_module`函数 

  - init_module主要是向内核注册新功能 也就是`insmod`模块的时候触发 

    ```c
    static int __init hello_init(void) // 初始化函数
    {
        printk(KERN_ALERT "Hello, world!\n");  // 打印信息
        return 0;
    }
    ```

  - clearnup_moudule主要是注销模块注册的功能 也就是`rmmod`模块的时候触发

    ```c
    static void __exit hello_exit(void) // 退出函数
    {
        printk(KERN_ALERT "Goodbye, cruel world!\n"); // 打印信息
    }
    ```

    

#### 内核符号表(?)

- 内核的符号表存放的符号 所有的模块都可以访问 模块声明的`全局符号`都会加入`内核符号表`
- `内核符号表`所处位置:`/proc/kallsyms`
- `内核符号表`处于内核代码段的`_skymtab`部分 其开始地址和结束地址是由C编译器所产生的两个符号来指定：`__start___ksymtab`和`__stop___ksymtab`。



### file_operations结构体

> Linux 内核文件 **include/linux/fs.h** 中有个叫做 **file_operations** 的结构体。通过这个结构体可以指定系统调用对应的驱动函数。

每一个系统调用都会对应一个驱动程序中的函数。如系统调用的open会对应驱动程序中的一个open，用户使用的系统调用open在进入到内核空间后实际上执行的就是驱动程序中与open对应的函数。

#### ioctl函数

> 用户程序可以通过调用ioctl函数来实现将一个cmd传给内核，而内核驱动根据switch case来实现预先设定好cmd对应执行的相关程序
>
> 在内核题里面基本都有`ioctl`函数,ioctl是设备驱动程序中对设备的I/O通道进行管理的函数
>
> 也就是驱动程序写好ioctl接口,然后用户态程序open对应的/dev/驱动,就可以根据对应的fd进行传参数

我们常说的驱动实际上就是驱动程序。以字符设备为例，驱动函数在加载成功后，会在/dev目录下生成一个驱动名称的文件夹，即/dev/xx。应用程序通过系统调用open()打开这个文件夹，然后通过对这个文件的操作来调用相应的驱动程序去控制硬件

```c
int ioctl(int fd, ind cmd, …)
```

- fd是用户程序打开设备时使用open函数返回的文件描述符
- cmd是用户程序对设备的控制命令
- 一般ioctl函数中有一个类似于switch case结构每一个case对应一个命令码

### linux内核管理

> 内存的结构不过多重复,主要了解slub分配器
>
> [linux内存管理笔记(二十八）----内存管理 slub算法_linux的slub分配算法-CSDN博客](https://blog.csdn.net/u012489236/article/details/108188375)
>
> [linux内核-内存管理_kmem cache alloc trace-CSDN博客](https://blog.csdn.net/csdn546229768/article/details/128795525)

- 内核管理内存主要使用两种算法,`伙伴算法`和`slub算法` 伙伴算法以`页`为单位管理内存,然后通过slub进行

#### slub结构

slub把内存分组管理，每个组分别包含 8、64、512、…2048个字节,以及96b 192b两个分组 总计11组 也就是`kmallloc_caches`结构体

```c
struct kmem_cache *kmalloc_caches[KMALLOC_SHIFT_HIGH + 1]; // 12
```

- 每个kmalloc_caches有两个大部分
  - Kmem_cache_node(类似于仓库) `慢速通道`
  - Kmem_cache_cpu 一般情况就保留一个`slab`(也就是kmem_cache批发的连续整页内存 一个slab可能包含多个连续的内存页) `快速通道` 

#### slub分配

> 可以通过cat /proc/slabinfo来查看slab的信息

因为物理页面被按照对象大小组织成单向链表,kmem_cache

```c
struct kmem_cache_node {
	spinlock_t list_lock;

#ifdef CONFIG_SLAB
	struct list_head slabs_partial;	/* partial list first, better asm code */
	struct list_head slabs_full;
	struct list_head slabs_free;
	unsigned long total_slabs;	/* length of all slab lists */
	unsigned long free_slabs;	/* length of free slab list only */
	unsigned long free_objects;
	unsigned int free_limit;
	unsigned int colour_next;	/* Per-node cache coloring */
	struct array_cache *shared;	/* shared per node */
	struct alien_cache **alien;	/* on other nodes */
	unsigned long next_reap;	/* updated without locking */
	int free_touched;		/* updated without locking */
#endif

#ifdef CONFIG_SLUB
	unsigned long nr_partial;
	struct list_head partial;
#ifdef CONFIG_SLUB_DEBUG
	atomic_long_t nr_slabs;
	atomic_long_t total_objects;
	struct list_head full;
#endif
#endif

};
struct kmem_cache_cpu {
	void **freelist;	/* Pointer to next available object */
	unsigned long tid;	/* Globally unique transaction id */
	struct slab *slab;	/* The slab from which we are allocating */
#ifdef CONFIG_SLUB_CPU_PARTIAL
	struct slab *partial;	/* Partially allocated frozen slabs */
#endif
	local_lock_t lock;	/* Protects the fields above */
#ifdef CONFIG_SLUB_STATS
	unsigned stat[NR_SLUB_STAT_ITEMS];
#endif
};
```

- slub系统刚刚创建 第一次申请slub内存
  - 回去向伙伴内存中申请可用的内存项,并且把页面分成很多object,取出一个object标记为占用
- 当kmem_cache_cpu有slab并且有空闲的object可以使用 则把空闲的object给用户 然后把`freelist`指向下一个空闲`object` 
- 当kmem_cache_cpu没有空闲的object,但是kmem_cache_node中`partial`有空闲的object 则从`kmem_cache_node`的partial变量里面获取空闲的object的slab,并且把空闲的object返回给用户

#### slub的释放

- 当kmem_cache_cpu缓存的slab就是object所在的slab的时候 就直接把slab加入`kmem_cache_cpu`的`free_list`即可
- 当kmem_cache_cpu缓存的slab不是object所在的slab的时候直接把object释放到object所在的slab里面

![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/d0a5b45aa34a19ea774453d799220834.png)

#### kmem_cache_alloc_trace（TODO）

> `kmem_cache_alloc_trace`函数就是`kmem_cache_create + kmem_cache_alloc`这样就通过`slub分配器`分配了一块内存了

```c
void *
kmem_cache_alloc_trace(struct kmem_cache *cachep, gfp_t flags, size_t size)
{
	void *ret;

	ret = slab_alloc(cachep, NULL, flags, size, _RET_IP_);

	ret = kasan_kmalloc(cachep, ret, size, flags);
	trace_kmalloc(_RET_IP_, ret, cachep,
		      size, cachep->size, flags);
	return ret;
}
```

- Kmem_cache_create

- Kmem_cache_alloc

  ```c
  void *kmem_cache_alloc(struct kmem_cache *cachep, gfp_t flags)
  ```

  - cachep是给定的缓存的结构指针 也就是kmalloc_caches
  - flags是分配的标志

## userfaultfd学习

> 参考文章:https://blog.jcix.top/2018-10-01/userfaultfd_intro/
>
> https://blog.csdn.net/seaaseesa/article/details/104650794

内核为了提升开发的灵活性,将一些内核处理的任务拿给了用户态来完成.其中就有匿名页的缺页处理

### 使用

- 创建一个描述符**uffd**

  ```c
  uffd = syscall(__NR_userfaultfd, O_CLOEXEC | O_NONBLOCK);
  ```

- 随后可以通过**ioctl**+**uffd**与模块进行通信

  - `UFFDIO_REGISTER` 注册监视区域 需要搭配结构体进行传递必要参数

    ```c
    // 注册时要用一个struct uffdio_register结构传递注册信息:
    // struct uffdio_range {
    // __u64 start;    /* Start of range */
    // __u64 len;      /* Length of range (bytes) */
    // };
    //
    // struct uffdio_register {
    // struct uffdio_range range;
    // __u64 mode;     /* Desired mode of operation (input) */
    // __u64 ioctls;   /* Available ioctl() operations (output) */
    // };
    
    addr = mmap(NULL, page_size, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0)
    // addr 和 len 分别是我匿名映射返回的地址和长度，赋值到uffdio_register
    uffdio_register.range.start = (unsigned long) addr;
    uffdio_register.range.len = len;
    // mode 只支持 UFFDIO_REGISTER_MODE_MISSING
    uffdio_register.mode = UFFDIO_REGISTER_MODE_MISSING;
    // 用ioctl的UFFDIO_REGISTER注册
    ioctl(uffd, UFFDIO_REGISTER, &uffdio_register);
    ```

### pwn中利用

因为这样的处理机制很方便我们进行条件竞争(大大提升)

比如当我们内核在执行`copy_from_user(ptr,user_buf,len);`的时候,如果我们的**user_buf**是mmap映射的并且未初始化的,那么在执行的时候会发生缺页错误从而暂停.我们另外个线程将ptr释放掉,再将其他结构申请为ptr对应的内存.从而就可以实现对对应结构体的修改.

![code](/Users/elegy/Pictures/代码截图/code.png)

- 通过**registerUserfault**函数我们可以注册指定的内存页面
- (TODO)

## UAF-堆喷(msg)

> 参考文章:[从ciscn 2022半决赛赛题：浅析msg_msg结构体 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/625446910)

消息队列是linux用来模块之间进行交流的流程大概是:

- msgget函数创建了一个消息队列
  - 返回消息队列的`msgid`作为进程的唯一标识符；失败则返回`-1`
- msgsnd函数向消息队列中发送消息
- msgrcv函数读取消息

`/include/linux/msg.h`源码位置

```c
struct msg_msg {
	struct list_head m_list;
	long m_type;
	size_t m_ts;		/* message text size */
	struct msg_msgseg *next;
	void *security;
	/* the actual message follows immediately */
};
struct list_head {
	struct list_head *next, *prev;
};
struct msg_msgseg {
	struct msg_msgseg *next;
	/* the next part of the message follows immediately */
};
```

- m_list是双向链表
- next就是个单链表

### 开发角度浅了解消息队列机制

> 参考文章:[Linux下的消息队列msgrcv实现及应用 (linux消息队列msgrcv) – 后浪云 (idc.net)](https://www.idc.net/help/151603/)
>
> 消息队列是一种进程间通信方式，它是消息的链表，存放在内核中

- `msgrcv`函数

  ```c
  ssize_t msgrcv(int msqid, void *msgp, size_t msgsz, long msgtyp, int msg);
  ```

  - **msqid** 消息队列标识符,通过**msgget**函数创建消息队列后返回的一个值
  - **msgp** 消息的接受缓冲区指针,调用**msgrcv**函数后,内核将消息从消息队列中取到该缓冲区中,也就是存在kernelToUser
  - **msgsz** 接受缓冲区大小（至少应该是消息的长度）
  - **msgtyp** 也就是所读消息的类型,其值为0 可以从消息队列中读取一条消息,其他值就是值为`msgtyp`的消息将会被获取
  - **msg**也就是消息接受方式
    - IPC_NOWT 如果消息队列中没有符合要求的消息，则返回-1，并将errno设置为ENOMSG。
    - MSG_NOERROR：如果消息长度超过msgsz，则被截断。
    - MSG_EXCEPT：读取类型为msgtyp以外所有类型的消息，而不是读取类型为msgtyp的消息。
    - MSG_COPY：读取类型为msgtyp的消息时，内核将消息从消息队列中移除，并将其复制到`msgp`中，而不是返回一个指向缓冲区的指针 也就是将消息从内核消息中拷贝到`msgp`中(我们指定的缓冲区)

- 发送端

  ![code](/Users/elegy/Pictures/code.png)

### msgget函数

> 原文:msgget函数可以创建新的消息队列或者获取已经拥有的消息队列
>
> 会创建一个msg_queue结构体当消息队列msg_msg双向循环链表的起点
>
> **需要注意的是后续若某进程调用`msgsnd`函数对消息队列进行写操作，需要该进程有写权限**
>
> **同理`msgrcv`需要有读权限。这是由`msgget`函数中的第二个参数中的权限控制符所决定的。**

```c
int msgget(key_t key, int msgflag)
```

- key的值为函数ftok的返回值或IPC_PRIVATE，若为
  IPC_PRIVATE则直接创建新的消息队列

### msgsnd函数

> 相当于向指定的消息队列上发送一条指定大小的message时,会建立`msg_msg`结构体
>
> 然后这里会调用load_msg函数对msg进行初始化
>
> 并且我们可以看见do_msgsnd里面定义了`msg_queue`作为`msg_msg`队列的链表头。

- 原文中对msgsnd概括性解释

![img](https://pic2.zhimg.com/v2-c8cbafbb660d672c74bffe776a6cc7ff_r.jpg)

- 下面是源码

![QQ_1726781237796](/Users/elegy/Library/Containers/com.tencent.qq/Data/tmp/QQ_1726781237796.png)

- 然后load_msg会调用`alloc_msg`并且将用户态的数据copy到msg去

```c
struct msg_msg *load_msg(const void __user *src, size_t len)
{
	struct msg_msg *msg;
	struct msg_msgseg *seg;
	int err = -EFAULT;
	size_t alen;

	msg = alloc_msg(len);
	if (msg == NULL)
		return ERR_PTR(-ENOMEM);

	alen = min(len, DATALEN_MSG);
	if (copy_from_user(msg + 1, src, alen))
		goto out_err;

	for (seg = msg->next; seg != NULL; seg = seg->next) {
		len -= alen;
		src = (char __user *)src + alen;
		alen = min(len, DATALEN_SEG);
		if (copy_from_user(seg + 1, src, alen))
			goto out_err;
	}

	err = security_msg_msg_alloc(msg);
	if (err)
		goto out_err;

	return msg;

out_err:
	free_msg(msg);
	return ERR_PTR(err);
}
```

- `copy_from_user`函数将用户态数据拷贝到内核去

- `alloc_msg`去申请内存

  ```c
  static struct msg_msg *alloc_msg(size_t len)
  {
  	struct msg_msg *msg;
  	struct msg_msgseg **pseg;
  	size_t alen;
    // #define DATALEN_MSG ((size_t)PAGE_SIZE - sizeof(struct msg_msg))  
  	alen = min(len, DATALEN_MSG);
  	// struct msg_msg {
  		// 	struct list_head m_list;
  		// 	long m_type;
  		// 	size_t m_ts; /* message text size */
  		// 	struct msg_msgseg *next;
  		// 	void *security;
  		// 	/* the actual message follows immediately */
  	// };
    msg = kmalloc(sizeof(*msg) + alen, GFP_KERNEL_ACCOUNT);
  	if (msg == NULL)
  		return NULL;
  
  	msg->next = NULL;
  	msg->security = NULL;
  
  	len -= alen;
  	pseg = &msg->next;
  	while (len > 0) {
  		struct msg_msgseg *seg;
  
  		cond_resched();
  	
  		alen = min(len, DATALEN_SEG);
  		seg = kmalloc(sizeof(*seg) + alen, GFP_KERNEL_ACCOUNT);
  		if (seg == NULL)
  			goto out_err;
  		*pseg = seg;
  		seg->next = NULL;
  		pseg = &seg->next;
  		len -= alen;
  	}
  
  	return msg;
  
  out_err:
  	free_msg(msg);
  	return NULL;
  }
  ```
  
  - 所以msg_msg最大申请page_size - header_size的大小 因为保底需要header_size也就是0x30空间来存储header
  
  - 如果大小过大导致超过了`DATATLEN_MSG`就让seg来存储源码中的while循环正是完成的这个 seg结构体简单 只是包含了必要的next指针其他全是数据
  
    ```c
    struct msg_msgseg {
    	struct msg_msgseg *next;
    	/* the next part of the message follows immediately */
    };
    ```
  
  - 这里借用原文中的图 描述我们的单个消息存储形式
  
    ![img](https://pic1.zhimg.com/80/v2-618c515207d7a3549b21dee56d146212_1440w.webp)
  
  - 然后多个`msg_msg`是通过`list_head`组成的双向循环链表进行关联 并且定义了`msg_queue`作为`msg_msg`队列的链表头。（前面提及过）
  
    ```c
    struct msg_queue {
    	struct kern_ipc_perm q_perm;
    	time64_t q_stime;		/* last msgsnd time */
    	time64_t q_rtime;		/* last msgrcv time */
    	time64_t q_ctime;		/* last change time */
    	unsigned long q_cbytes;		/* current number of bytes on queue */
    	unsigned long q_qnum;		/* number of messages in queue */
    	unsigned long q_qbytes;		/* max number of bytes on queue */
    	struct pid *q_lspid;		/* pid of last msgsnd */
    	struct pid *q_lrpid;		/* last receive pid */
    
    	struct list_head q_messages;
    	struct list_head q_receivers;
    	struct list_head q_senders;
    } __randomize_layout;
    struct kern_ipc_perm *ipc_obtain_object_idr(struct ipc_ids *ids, int id);
    
    ```
  
    ![QQ_1726784121279](/Users/elegy/Library/Containers/com.tencent.qq/Data/tmp/QQ_1726784121279.png)

### msgrcv函数

> 原文:`msgrcv`系统调用能从消息队列上接受指定大小的消息，并且选择性（是否）释放`msg_msg`结构体。具体实现源码在`/ipc/msg.c`的`do_msgrcv`中。

```c
size_t msgrcv(int msqid, void *msgp, size_t msgsz, long msgtyp,int msgflg)
```

- 原文中对msgrcv的概括性解释

![img](https://picx.zhimg.com/80/v2-465a08a27503a64eaa3a602ee69120fb_1440w.webp)

#### 定位

- 通过find_msg函数进行定位

![QQ_1726817712243](/Users/elegy/Library/Containers/com.tencent.qq/Data/tmp/QQ_1726817712243.png)

- 通过convert_mode函数获取mode

  ```c
  static inline int convert_mode(long *msgtyp, int msgflg)
  {
  	if (msgflg & MSG_COPY)
  		return SEARCH_NUMBER;
  	/*
  	 *  find message of correct type.
  	 *  msgtyp = 0 => get first.
  	 *  msgtyp > 0 => get first message of matching type.
  	 *  msgtyp < 0 => get message with least type must be < abs(msgtype).
  	 */
  	if (*msgtyp == 0)
  		return SEARCH_ANY;
  	if (*msgtyp < 0) {
  		if (*msgtyp == LONG_MIN) /* -LONG_MIN is undefined */
  			*msgtyp = LONG_MAX;
  		else
  			*msgtyp = -*msgtyp;
  		return SEARCH_LESSEQUAL;
  	}
  	if (msgflg & MSG_EXCEPT)
  		return SEARCH_NOTEQUAL;
  	return SEARCH_EQUAL;
  }
  ```

  - 其实也就是msgflg如果有`MSG_COPY`标志位有值则mode等于`SEARCH_NUMBER`
    - 这里其实就是找到第**msgtyp**条消息
  - 如果msgflg有`MSG_EXCEPT`标志位有值则mode等于`SEARCH_NOTEQUAL`
    - 那么是找到第一个不等于msgtyp的消息
  - `msgtyp`小于0 mode等于`SEARCH_LESSEQUAL`(less equal) 
    - 这里其实msgtyp<0的时候去匹配m_type小于msgtyp的最小消息
  - `msgtyp`等于0 则返回`SEARCH_ANY`(any) 
    - 这里其实匹配任意消息也就是第一个消息
  - 如果都不是则返回`SEARCH_EQUAL` 
    - 这里其实是找到第一个msgtyp等于m_type的消息

- **find_msg**

> 也就是遍历了所有`msg_msg`队列的头节点。然后调用`testmsg`，根据`mode`和传入的`msgtyp`来筛选：

```c
static struct msg_msg *find_msg(struct msg_queue *msq, long *msgtyp, int mode)
{
	struct msg_msg *msg, *found = NULL;
	long count = 0;

	list_for_each_entry(msg, &msq->q_messages, m_list) {
		if (testmsg(msg, *msgtyp, mode) &&
		    !security_msg_queue_msgrcv(&msq->q_perm, msg, current,
					       *msgtyp, mode)) {
			if (mode == SEARCH_LESSEQUAL && msg->m_type != 1) {
				*msgtyp = msg->m_type - 1;
				found = msg;
			} else if (mode == SEARCH_NUMBER) {
				if (*msgtyp == count)
					return msg;
			} else
				return msg;
			count++;
		}
	}

	return found ?: ERR_PTR(-EAGAIN);
}
```

- **testmsg**函数

  ```c
  
  static int testmsg(struct msg_msg *msg, long type, int mode)
  {
  	switch (mode) {
  	case SEARCH_ANY:
  	case SEARCH_NUMBER:
  		return 1;
  	case SEARCH_LESSEQUAL:
  		if (msg->m_type <= type)
  			return 1;
  		break;
  	case SEARCH_EQUAL:
  		if (msg->m_type == type)
  			return 1;
  		break;
  	case SEARCH_NOTEQUAL:
  		if (msg->m_type != type)
  			return 1;
  		break;
  	}
  	return 0;
  }
  ```

#### 释放消息(**list_del**,**free_msg**)

- 也就是list_del先脱链`msg_queue`函数 (unlink)
- **free_msg**释放`msg_msg`单向链表上的所有信息

```c
long ksys_msgrcv(int msqid, struct msgbuf __user *msgp, size_t msgsz,
		 long msgtyp, int msgflg)
{
	return do_msgrcv(msqid, msgp, msgsz, msgtyp, msgflg, do_msg_fill);
}
static long do_msgrcv(int msqid, void __user *buf, size_t bufsz, long msgtyp, int msgflg,
long (*msg_handler)(void __user *, struct msg_msg *, size_t))
{
    int mode;
    struct msg_queue *msq;
    struct ipc_namespace *ns;
    struct msg_msg *msg, *copy = NULL;
    ...........
    ...........
    list_del(&msg->m_list);
    ...........
    ...........

    bufsz = msg_handler(buf, msg, bufsz);
    free_msg(msg);

    return bufsz;
}
```

#### 返回消息

返回消息就是msg_handler进行返回给用户态消息

- KernelToUser消息拷贝

  - 这里msg_handler看`ksys_msgrev`可以发现其实是`do_msg_fill`函数 进行拷贝

    (keys_msgrc/do_msgrcv/do_msg_fill/)

    ```c
    #define put_user(x, ptr) \
      __put_user_check((__typeof__(*(ptr)))(x), (ptr), sizeof(*(ptr)))
    static long do_msg_fill(void __user *dest, struct msg_msg *msg, size_t bufsz)
    {
    	struct msgbuf __user *msgp = dest;
    	size_t msgsz;
    
    	if (put_user(msg->m_type, &msgp->mtype))
    		return -EFAULT;
    
    	msgsz = (bufsz > msg->m_ts) ? msg->m_ts : bufsz;
    	if (store_msg(msgp->mtext, msg, msgsz))
    		return -EFAULT;
    	return msgsz;
    }
    
    ```

  - 然后就是用store_msg进行数据拷贝

    (keys_msgrc/do_msgrcv/do_msg_fill/store_msg)

    ```c
    int store_msg(void __user *dest, struct msg_msg *msg, size_t len)
    {
    	size_t alen;
    	struct msg_msgseg *seg;
    
    	alen = min(len, DATALEN_MSG);
    	if (copy_to_user(dest, msg + 1, alen))
    		return -1;
    
    	for (seg = msg->next; seg != NULL; seg = seg->next) {
    		len -= alen;
    		dest = (char __user *)dest + alen;
    		alen = min(len, DATALEN_SEG);
    		if (copy_to_user(dest, seg + 1, alen))
    			return -1;
    	}
    	return 0;
    }
    ```

  - 我们可以看见这里其实和原本放入消息的时候基本一致,进行大量copy将整个msg_msg的消息发送给用户

  - 这里复制的长度是根据len来定的 而我们的len是msgsz也就是**do_msg_fill**函数

    ```
    msgsz = (bufsz > msg->m_ts) ? msg->m_ts : bufsz;
    ```

    - 也就是我们给msgrcv传入的第三个参数(bufsz)的大小 但是最大为消息本身的大小

#### msg_copy特殊位

```c

static long do_msgrcv(int msqid, void __user *buf, size_t bufsz, long msgtyp, int msgflg,
	       long (*msg_handler)(void __user *, struct msg_msg *, size_t))
{
	int mode;
	struct msg_queue *msq;
	struct ipc_namespace *ns;
	struct msg_msg *msg, *copy = NULL;
	DEFINE_WAKE_Q(wake_q);
	ns = current->nsproxy->ipc_ns;
	...
  if (msgflg & MSG_COPY) {
		....
      // 准备copy文件
		copy = prepare_copy(buf, min_t(size_t, bufsz, ns->msg_ctlmax));
		....
	}
  ...
	for (;;) {
		...
		msg = find_msg(msq, &msgtyp, mode);
		if (!IS_ERR(msg)) {
			...
			/*
			 * If we are copying, then do not unlink message and do
			 * not update queue parameters.
			 */
			if (msgflg & MSG_COPY) {
				msg = copy_msg(msg, copy);
				goto out_unlock0;
			}
		....
		}
		....
  }
out_unlock0:
	ipc_unlock_object(&msq->q_perm);
	wake_up_q(&wake_q);
out_unlock1:
	rcu_read_unlock();
	if (IS_ERR(msg)) {
    // 走入这里
		free_copy(copy);
		return PTR_ERR(msg);
	}
	...
}
```

- 我们会发现当我们携带`MSG_COPY`信息的时候,
  - find_msg首先会找到合适的msg
  - 然后直接进行拷贝操作不会进行del_list正对应了我们前面的`SEARCH_NUMBER`对应操作,也就是将对应的消息拷贝出来然后发送给我们随后将拷贝出来的消息给释放掉从而让我们拥有了多次读取一条消息的能力

### 任意读

上文我们在msgrcv的时候携带`MSG_COPY`的时候,会调用`copy_msg`来进行拷贝消息

```c
struct msg_msg *copy_msg(struct msg_msg *src, struct msg_msg *dst)
{
	struct msg_msgseg *dst_pseg, *src_pseg;
	size_t len = src->m_ts;
	size_t alen;

	if (src->m_ts > dst->m_ts)
		return ERR_PTR(-EINVAL);

	alen = min(len, DATALEN_MSG);
	memcpy(dst + 1, src + 1, alen);

	for (dst_pseg = dst->next, src_pseg = src->next;
	     src_pseg != NULL;
	     dst_pseg = dst_pseg->next, src_pseg = src_pseg->next) {

		len -= alen;
		alen = min(len, DATALEN_SEG);
		memcpy(dst_pseg + 1, src_pseg + 1, alen);
	}

	dst->m_type = src->m_type;
	dst->m_ts = src->m_ts;

	return dst;
}
```

- 然后我们知道调用句子是

  ```c
  msg = copy_msg(msg, copy);
  ```

- 所以我们需要保证取出的消息的m_ts（消息大小）要小于我们需要的消息大小(bufsz)
- 当能主动修改msg_msg->m_ts的时候我们就可以读取最多一页的内存实现越界读取
- 可以修改m_ts和m_list的next指针,堆喷其他结构体然后越界读从而获取一些内核地址

### 任意写

因为`do_msgsnd`调用了load_msg进行用户到内核的数据拷贝,所以我们可以利用userfault的机制暂停一个线程篡改msg->next指针实现任意地址写

## sk_buff结构体

> 参考文章:https://blog.csdn.net/wangquan1992/article/details/112572572
>
> https://ywhkkx.github.io/2022/06/30/msg_msg-sk_buff%E7%9A%84%E7%BB%84%E5%90%88%E5%88%A9%E7%94%A8+pipe_buffer%20attack/

sk_buff也就是socket buffer,所以一般用于socket中

**主要管理控制接受或发送数据包**,因为数据包没有固定大小,所以sk_buff也可以提供任意大小对象的分配写入和释放

- Sk_buff本体不提供任何用户数据.用户数据单独存放在一个object中,然后sk_buff存放指向用户数据的指针

  ![1656479312235-1663329194251](/Users/elegy/Pictures/blog/linux_kernel/1656479312235-1663329194251.png)

- sk_buff 在内核网络协议栈中代表一个「包」，我们只需要**创建一对 socke，在上面发送与接收数据包就能完成 sk_buff 的分配与释放**

## d3kheap复现

### 信息

```shell
Linux (none) 5.13.19 #1 SMP Thu Feb 17 08:21:42 PST 2022 x86_64 GNU/Linux
```

### 申请chunk

```c
kmem_cache_alloc_trace(kmalloc_caches[10], 3264LL, 1024LL);
```

- 这里是kamlloc_caches[10]也就是2的10次方 1024也就是0x400大小的chunk

### UAF

因为是否可以free的标准是ref_count,但是ref_count的初始值为:1.所以我们可以free两次chunk或者UAF 这是个利用点

