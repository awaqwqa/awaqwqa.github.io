## c2018-HitCon-gundam(tcahe机制+泄露libc地址)

## 重要知识点

> 由于linux中使用`free()`进行内存释放时，不大于 `max_fast` （默认值为 64B）的 chunk 被释放后，首先会被放到 `fast bins`中，大于`max_fast`的chunk或者`fast bins` 中的空闲 chunk 合并后会被放入`unsorted bin`中。而在fastbin为空时，`unsortbin`的fd和bk指向自身`main_arena`中，该地址的相对偏移值存放在libc.so中，可以通过use after free后打印出`main_arena`的实际地址，结合偏移值从而得到libc的加载地址。

### tcahe机制

> 学习文章:[glibc Tcache机制-CSDN博客](https://blog.csdn.net/qq_40890756/article/details/102560506)

- 一共有64个bins
- Tcache缓存的是**非Large Chunk的chunk**。

- 首先是`tcahe`是单链表结构,每条链上最多可以有7个chunk
- `free`后 当对应的tcahe bin放满了 才会放入fastbin,unsorted bin
- `malloc`的时候优先去tcahe中找

#### 机制

- 代码:

  > 这里tcache_perthread_struct 首先
  >
  > - counts代表着每个bin当前所有的chunk数量
  > - tcache_entry代表着当前bin的首个chunk
  > - 由于是单链形式 所以结构体属性就是下一个chunk的指针

  ```c
  typedef struct tcache_entry
  {
    struct tcache_entry *next;
  } tcache_entry;
  
  /* There is one of these for each thread, which contains the
     per-thread cache (hence "tcache_perthread_struct").  Keeping
     overall size low is mildly important.  Note that COUNTS and ENTRIES
     are redundant (we could have just counted the linked list each
     time), this is for performance reasons.  */
  typedef struct tcache_perthread_struct
  {
    char counts[TCACHE_MAX_BINS];
    tcache_entry *entries[TCACHE_MAX_BINS];
  } tcache_perthread_struct;
  
  static __thread tcache_perthread_struct *tcache = NULL;
  
  ```

- 结构图

![机制](C:\Users\61428\Desktop\wp合集\pwn\gundam\img\tcahe结构体.png)

#### 利用tcache泄露地址

> `tcache`位于heap最前端 也属于一个堆块

- 用vmmap指令查找heap最开始的位置![vmmap](https://awaqwqa.github.io/img/tcahe/vmmap.png)

- 用x/26gx 指令来查看对应地址 堆结构 （`x/26gx 0x55e22cd98000+0x10`）

  ![heap](https://awaqwqa.github.io/img/tcahe/tcache_heap.png)

  > 也就是最后一个加入tcache的chunk

- 我们通过连续申请8个gundam,让第八个gundam出现在unsorted bin里面 那么我们如何找到它呢?

- 我们这里知道了第七个地址 那么第八个的地址:**x/26gx 0x000055e22cd98a10+0x30+0x110-0x10**

  - 一个gundam包含两个chunk,大小为0x30,另一个为0x110

- 那么输入指令后我们找到了这个chunk

  ![unsorted_bins](https://awaqwqa.github.io/img/tcahe/unsorted_bin.png)

  - 我们可以发现这个地方fd和bk都指向了 同一个地址 也就是**main_arena+88**(unsortedbin头结点)

- 然后我们就得到了main_arena的地址

- 再去查找libc的基地址 **vmmap**得到的:![libc_addr](https://awaqwqa.github.io/img/tcahe/libc_addr.png)

- 计算:

  - 0x7f566befac78-libc基地址0x7f566bb4f000=偏移0x3ac78
  - 这里我们就得到了偏移 这样在远程服务器的时候就可以利用这个偏移获取libc基地址

  