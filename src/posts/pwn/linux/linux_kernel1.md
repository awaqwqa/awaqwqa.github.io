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
>
> msg_msg CVE-2021-22555 :https://www.freebuf.com/articles/system/286366.html

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

### Msg_msg堆喷 UAF

> msg_msg消息队列通常用于进行进程之间的相互沟通,由于其可以在内核中申请任意大小的堆的原因,这个结构体在内核利用中是比较好使的.
>
> https://www.freebuf.com/articles/system/286366.html参考文章:

这里的应用其实很简单,由于**msg_msg**可以先创建大量消息队列

**msgget**函数(对应内核**ksys_msgget**)会创建一个`msg_queue`结构体当消息队列`msg_msg`双向循环链表的起始节点 然后将我们后续发送的消息变成**msg_msg**结构体与这个**msg_queue**链接起来构成双循环链表 

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

```

然后**msg_msg**的存储逻辑是当我们发送了消息后会直接申请**一整页**(0x1000)以内的内存页面

当**msg_msg**结构体+我们的消息大于**pagesize**的时候,会去主动分配一个新的内存页面也就是**msg_msgseg** 类似于下面的状态

![QQ_1729066251434](https://awaqwqa.github.io/img/linux_kernel1/QQ_1729066251434.png)

然后**msg_msg**又是和**msg_queue**构成双向循环链表 类似于下方. (这很类似于largebin的形式)

![QQ_1729066349724](https://awaqwqa.github.io/img/linux_kernel1/QQ_1729066349724.png)

这就给我们申请小于0x1000大小的任意主消息和副消息的能力了,这很适合用于堆喷!!!

所以如果我们有一个**double free**的机会,就可以先申请一个chunk,然后free掉这个chunk。通过堆喷合适大小的**msg_msg**,让**msg_msg**副消息去捕获到这个消息。然后再次free从而实现**UAF**。

那么这个时候这个chunk处于freelist链中,但是chunk也被msg_msg正在使用.我们就可以让一些特殊结构体申请到这个内存页面,从而实现泄漏信息或者触发ROP链子 这里是很巧妙的做法 

但是这里有个问题我们并不知道到底是哪个chunk抓到了我们的free的chunk,我们需要借助一下其他小trcik才行.这里是利用的**sk_buf**结构体进行堆喷

### sk_buf 堆喷 定位

> **sk_buf**也可以进行申请区间较大的内存堆,从而可以实现堆喷到被释放的那个**msg_msg**,然后就可以往里面写入数据了.

当我们**sk_buf**捕获到那个chunk后,向里面写入数据让**msgrcv**函数返回错误,但是不触发**kernel panic**从而定位到谁被捕获了。然后再利用**sk_buf**自己本身的释放机制,让chunk再次进入freelist链好让我们进行进一步的**UAF**操作

那么此时我们就成功可以伪造一个**msg_msg**了
