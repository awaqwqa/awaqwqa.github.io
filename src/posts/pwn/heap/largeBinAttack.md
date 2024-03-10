---
date: 2024-3-4
tag:
  - pwn
  - heap
---

# large Bin Attack学习（_int_malloc源码细读 ）

> 参考文章:<br>wiki:[Large Bin Attack - CTF Wiki (ctf-wiki.org)](https://ctf-wiki.org/pwn/linux/user-mode/heap/ptmalloc2/large-bin-attack/)<br>源码级调试glibc:[源码级调试glibc_glibc cannot be compiled without optimization-CSDN博客](https://blog.csdn.net/astrotycoon/article/details/52662685)<br>源码分析:[glibc 2.31 malloc与free 源码分析（持续更新） - PwnKi - 博客园 (cnblogs.com)](https://www.cnblogs.com/luoleqi/p/15520621.html)+[glibc malloc源码分析 - PwnKi - 博客园 (cnblogs.com)](https://www.cnblogs.com/luoleqi/p/12731875.html#_int_malloc)<br>详细拆分了_int_malloc的流程 并且按照功能分了标题 想要了解对应部分就直接点击标题跳转即可<br>第一次阅读glibc的源码然后进行分析 有错误的地方请大佬指正

## 源码分析(largebin malloc)

> 每次去看别人文章分析总结的 总感觉比较难记住 每个libc版本的区别 然后也没彻底理解一些操作 所以进行阅读源码
>
> 然后重点是检查机制部分 如果只想看重点就直接跳转到[largebin入链操作](#largebin)

- 然后在正式阅读源码之前 我们先理清楚largebin的结构（去除了头部的fd_nextsize/bk_nextsize 为了图片干净一点）

  ![largebin_struct](https://awaqwqa.github.io/img/large_bin_attack/largebin_attack.png)

  - 我们可以简化一下 去除尾链的fd和头链的bk方便我们理清逻辑
  
    ![large_struct](https://awaqwqa.github.io/img/large_bin_attack/struct.png)

  - 大概就是这个样子 也就是bin头部通过fd/bk链接chunk size链表的头部和尾部 然后chunk size链表之间通过fd_nextsize/bk_nextsize链接
  - chunksize链表中 同一个大小的chunk通过fd/bk进行链接
  - 所以largebin的fd和bk和其他的双向链不同我们不能通过从bin一路通过fd返回到large bin的头部
  
  

### Unsortedbin的合并/入链/分配操作

### 遍历的开始（梦的开始）

> 后面的操作中最重要的就是Victim变量 这个变量是当前循环到的unsortedbin chunk<br>bck变量 也就是bck <-------> victim 这个关系

- 从unsorted_chunk最后一位开始遍历 直到碰到unsorted_bin的头部 我在这里 没很确定是否unsortedbin可不可以指向自己 我们可以调试看看

    ```c
    while ((victim = unsorted_chunks (av)->bk) != unsorted_chunks (av)){
        bck = victim->bk;
        size = chunksize (victim);  /* 计算 size */
        // ...
    }
    ```

### 调试

```shell
unsortedbin
all: 0x555555559680 —▸ 0x7ffff7fb9be0 (main_arena+96) ◂— 0x555555559680
```

- 然后查看chunk结构

  ```shell
  Free chunk (unsortedbin) | PREV_INUSE
  Addr: 0x555555559680
  Size: 0x90 (with flag bits: 0x91)
  fd: 0x7ffff7fb9be0
  bk: 0x7ffff7fb9be0
  ```

- 查看unsortedbin的大小

  ```shell
  pwndbg> tel  0x7ffff7fb9be0
  00:0000│ rdx r10 r11 0x7ffff7fb9be0 (main_arena+96) —▸ 0x5555555597a0 ◂— 0x0
  01:0008│             0x7ffff7fb9be8 (main_arena+104) ◂— 0x0
  02:0010│             0x7ffff7fb9bf0 (main_arena+112) —▸ 0x555555559680 ◂— 0x0
  03:0018│             0x7ffff7fb9bf8 (main_arena+120) —▸ 0x555555559680 ◂— 0x0
  04:0020│             0x7ffff7fb9c00 (main_arena+128) —▸ 0x7ffff7fb9bf0 (main_arena+112) —▸ 0x555555559680 ◂— 0x0
  05:0028│             0x7ffff7fb9c08 (main_arena+136) —▸ 0x7ffff7fb9bf0 (main_arena+112) —▸ 0x555555559680 ◂— 0x0
  06:0030│             0x7ffff7fb9c10 (main_arena+144) —▸ 0x7ffff7fb9c00 (main_arena+128) —▸ 0x7ffff7fb9bf0 (main_arena+112) —▸ 0x555555559680 ◂— 0x0
  07:0038│             0x7ffff7fb9c18 (main_arena+152) —▸ 0x7ffff7fb9c00 (main_arena+128) —▸ 0x7ffff7fb9bf0 (main_arena+112) —▸ 0x555555559680 ◂— 0x0
  ```

- 可以发现fd bk都是指向的unsortedbin中第一个chunk 我们清空unsortedbin看看 

  ```shelll
  pwndbg> tel 0x7ffff7fb9be0
  00:0000│ rsi r11 0x7ffff7fb9be0 (main_arena+96) —▸ 0x555555559830 ◂— 0x0
  01:0008│         0x7ffff7fb9be8 (main_arena+104) —▸ 0x555555559710 ◂— 0x90
  02:0010│         0x7ffff7fb9bf0 (main_arena+112) —▸ 0x7ffff7fb9be0 (main_arena+96) —▸ 0x555555559830 ◂— 0x0
  03:0018│         0x7ffff7fb9bf8 (main_arena+120) —▸ 0x7ffff7fb9be0 (main_arena+96) —▸ 0x555555559830 ◂— 0x0
  04:0020│         0x7ffff7fb9c00 (main_arena+128) —▸ 0x7ffff7fb9bf0 (main_arena+112) —▸ 0x7ffff7fb9be0 (main_arena+96) —▸ 0x555555559830 ◂— 0x0
  05:0028│         0x7ffff7fb9c08 (main_arena+136) —▸ 0x7ffff7fb9bf0 (main_arena+112) —▸ 0x7ffff7fb9be0 (main_arena+96) —▸ 0x555555559830 ◂— 0x0
  06:0030│         0x7ffff7fb9c10 (main_arena+144) —▸ 0x7ffff7fb9c00 (main_arena+128) —▸ 0x7ffff7fb9bf0 (main_arena+112) —▸ 0x7ffff7fb9be0 (main_arena+96) —▸ 0x555555559830 ◂— ...
  07:0038│         0x7ffff7fb9c18 (main_arena+152) —▸ 0x7ffff7fb9c00 (main_arena+128) —▸ 0x7ffff7fb9bf0 (main_arena+112) —▸ 0x7ffff7fb9be0 (main_arena+96) —▸ 0x55555555983
  ```

  - 我们会发现fd和bk都是指向了自己本身也就是main_arena+96这个位置

### 安全检查机制

> 这里的安全机制全是对unsortedbin中的chunk进行的检查

- 不能小于2*SIZE_SZ不能大于av->system_men也就是该分配去的内存分配总量

  ```c
  if (__glibc_unlikely (size <= 2 * SIZE_SZ)
                || __glibc_unlikely (size > av->system_mem))
              malloc_printerr ("malloc(): invalid size (unsorted)");
  ```

  - 对next chunk(物理意义上的紧挨着)也进行一样的操作

    >  mchunkptr next = chunk_at_offset (victim, size);  /* 获得指向内存空间中当前 chunk 的下一个chunk 的指针 */

    ```c
    if (__glibc_unlikely (chunksize_nomask (next) < 2 * SIZE_SZ)|| __glibc_unlikely (chunksize_nomask (next) > av->system_mem))
         malloc_printerr ("malloc(): invalid next size (unsorted)");
    ```

- 检查next chunk的prev_size 是否等于当前的chunk size

  > size = chunksize (victim);  /* 计算 size */

  ```c
  /* 如果 next chunk 中记录前一个 chunk 大小的 prev_size 与 size 不符，则报错 */
  if (__glibc_unlikely ((prev_size (next) & ~(SIZE_BITS)) != size))
      malloc_printerr ("malloc(): mismatching next->prev_size (unsorted)");
  ```

- 检查bck的fd是否为当前chunk 或者当前chunk的fd是否是bin的头结点

  > bck = victim->bk;
  >
  > victim = unsorted_chunks (av)->bk)
  >
  > 应该就是检查下一个chunk是否是合法的

  ```c
  if (__glibc_unlikely (bck->fd != victim)
                || __glibc_unlikely (victim->fd != unsorted_chunks (av)))
              malloc_printerr ("malloc(): unsorted double linked list corrupted");
  ```

- 检查当前chunk是否是free的 通过next chunk的p值 

  ```c
   /* 如果 next chunk 中的显示前一个 chunk 是否正在使用的标志位为1，*/
   /* 即前一个 chunk 正在使用，则报错 */
   if (__glibc_unlikely (prev_inuse (next)))
   	malloc_printerr ("malloc(): invalid next->prev_inuse (unsorted)");
  ```

### 直接返回smallbin_chunk情况

> 然后就是从unsortedbin割small chunk 如果符合条件
>
> - 所需chunk大小在smallbin的范围之内
>
> - bck为unsortedbin的头 也就是unsortedbin中仅有一个chunk
> - victim为last remainder chunk 也就是分割过一次
> - 大小刚好大于所需nb大小+Minsize(这里猜测就是一个最小chunk 这样才能切割)
>
> 满足以上条件 就直接分割 然后将victim返回给用户

```c
if (in_smallbin_range (nb) &&
    bck == unsorted_chunks (av) &&
    victim == av->last_remainder &&
    (unsigned long) (size) > (unsigned long) (nb + MINSIZE)) {
    remainder_size = size - nb;
    remainder = chunk_at_offset (victim, nb);
    unsorted_chunks (av)->bk = unsorted_chunks (av)->fd = remainder;
    av->last_remainder = remainder;
    remainder->bk = remainder->fd = unsorted_chunks (av);
    if (!in_smallbin_range (remainder_size)){
        remainder->fd_nextsize = NULL;
        remainder->bk_nextsize = NULL;
    }
    set_head (victim, nb | PREV_INUSE | (av != &main_arena ? NON_MAIN_ARENA : 0));
    set_head (remainder, remainder_size | PREV_INUSE);
    set_foot (remainder, remainder_size);

    check_malloced_chunk (av, victim, nb);
    void *p = chunk2mem (victim);
    alloc_perturb (p, bytes);
    return p;
}
```

### 从unsortedbin中移除

> 在这里已经将chunk从unsortdbin中移除

```c
 unsorted_chunks (av)->bk = bck;
 bck->fd = unsorted_chunks (av);
```

### 大小刚好相等情况

- 如果chunk和当前需要的chunk大小一致 则直接返回chunk 并且设置物理意义上紧挨着的下一个chunk的size中p为0也就是free状态

  ```c
  set_inuse_bit_at_offset (victim, size);
  ```

- 如果开启了tcache机制 且tcache未满则将chunk放入tcache中

  ```c
  if (tcache_nb && tcache->counts[tc_idx] < mp_.tcache_count){
      tcache_put (victim, tc_idx); 
      return_cached = 1;
      continue;
  }
  ```

- 然后直接返回

  ```c
  check_malloced_chunk (av, victim, nb);
  void *p = chunk2mem (victim);
  alloc_perturb (p, bytes);
  return p;  /* 返回内存指针 */
  ```

### 归类入链操作<span id = "largebin"></span>

> 这里主要是将unsortedbin合并后的 入small链表或者large链表的操作
>
> 这里的fwd和bck记好了 我们从unsortedbin抠出来的chunk就要合并进入fwd和bck的中间
>
> 这后面的操作往往是先让fwd到指定的位置 然后bck通过fwd->bk来进行的定位

### small 和 large最终入bin操作

> 这里把最后的部分 直接提前 拿出来 因为smallbin和largebin的入链操作都含这个代码
>
> largebin还有chunk size的入链操作 以及其他的复杂检查

```c
mark_bin (av, victim_index);
victim->bk = bck;
victim->fd = fwd;
fwd->bk = victim;
bck->fd = victim;
```

### smallbin的fwd bck赋值

- 如果属于small bin则进行fwd和bck的赋值

  > small bin 的链表表头赋值给 bck:bck = bin_at (av, victim_index);
  >
  > 首个chunk赋值给fwd :fwd = bck->fd;
  
  ```c
  if (in_smallbin_range (size)){
      victim_index = smallbin_index (size);
      bck = bin_at (av, victim_index);
      fwd = bck->fd;
  }
  ```

### largebin 入bin链和chunk size链

- 如果属于large_bins同理进行赋值 然后判断该插入什么合适的位置

  > 因为largebin是按照大小进行的排序 由大到小 所以最小的在链表最后

  ```c
  victim_index = largebin_index (size);
  bck = bin_at (av, victim_index);
  fwd = bck->fd;
  ```

  - 判断large是否有空闲chunk:

    ```c
    if (fwd != bck)
    ```

  - 如果当前chunk比最后一位chunk还小则直接加入链表末尾

    >   bck是头 bck->bk应该就是最后一位
    >
    >   然后要加入fwd和bck之间 我们应该先调整fwd和bck 所以bck改为链表最后一位 fwd改为链表头
    >
    >   bck<----->chunk<----->fwd
  
    ```c
    if ((unsigned long) (size)< (unsigned long) chunksize_nomask (bck->bk)){
        fwd = bck;
        bck = bck->bk;
        victim->fd_nextsize = fwd->fd;
        victim->bk_nextsize = fwd->fd->bk_nextsize;
        fwd->fd->bk_nextsize = victim->bk_nextsize->fd_nextsize = victim;
    }
    ```
  
  - 否则进行遍历判断 匹配第一个小于等于 当前chunk的
  
    ```c
    while ((unsigned long) size < chunksize_nomask (fwd)){
        fwd = fwd->fd_nextsize;
        assert (chunk_main_arena (fwd));
    }
    ```

  - 如果该chunk与当前chunk相同则让chunk插入fwd之后 所以
  
    > 因为large bin是按照大小进行的排序 所以我们为了不额外修改chunk size链表 直接将chunk链接到fwd后面 
  
    ```c
    if ((unsigned long) size== (unsigned long) chunksize_nomask (fwd))
        fwd = fwd->fd;
    ```
  
  - **当我们需求的chunk size大于large中所有的chunk size的情况** 执行largebin的入chunk_size链操作:<span id = "attack"></span>
  
    > 这里我理解的是largebin存在两条链 也就是chunk size的链 和fd bk构成的bins链 这里先是入的chunk size的链
    
    ```c
    victim->fd_nextsize = fwd;
    victim->bk_nextsize = fwd->bk_nextsize;
    if (__glibc_unlikely (fwd->bk_nextsize->fd_nextsize != fwd))
        malloc_printerr ("malloc(): largebin double linked list corrupted (nextsize)");
    fwd->bk_nextsize = victim;
    victim->bk_nextsize->fd_nextsize = victim;
    ```
  
    - 这里就是重点了 也就是large bin的入链操作
    
    - 首先这是初始状态


  ![status01](https://awaqwqa.github.io/img/large_bin_attack/start.png) ![status1](https://awaqwqa.github.io/img/large_bin_attack/status02.png)![status1](https://awaqwqa.github.io/img/large_bin_attack/status03.png)![status1](https://awaqwqa.github.io/img/large_bin_attack/status04.png)

  - 让bck等于fwd->bk 也就是把bck提到fwd前方 并且进行安全检查

    ```c
    bck = fwd->bk;
    if (bck->fd != fwd)
        malloc_printerr ("malloc(): largebin double linked list corrupted (bk)");
    ```

  - 最后就是执行入链操作了

    > 在一开始的时候提过

    ```c
    mark_bin (av, victim_index);
    victim->bk = bck;
    victim->fd = fwd;
    fwd->bk = victim;
    bck->fd = victim;
    ```

### 从largebin中获取chunk

- largebin情况

  ```c
  if (!in_smallbin_range (nb))
  ```

### chunk脱链 remainder chunk入链

> 首先是判断情况 我们只处理这一种情况:largebin中有chunk 然后largebin中最大的chunk大于我们的需求
>
> 接下来的代码都是从largebin中获取chunk

```c
if ((victim = first (bin)) != bin && (unsigned long) chunksize_nomask (victim)>= (unsigned long) (nb))
```

- 取最小的chunk 反方向循环 找到刚好大于等于我们所需chunk size的 chunk

  > 如果一个大小的chunk链表中有多个chunk 优先取第二个 不轻易改变chunk size链表的值

  ```c
  // 取largebin的最后一个chunk 也就是最小的那个chunk 
  victim = victim->bk_nextsize;
  // 取首个大于所需的chunk size的large chunk
  while (((unsigned long) (size = chunksize (victim)) < (unsigned long) (nb)))
      victim = victim->bk_nextsize;
  
  /* Avoid removing the first entry for a size so that the skip
                   list does not have to be rerouted.  */
  //  这里避免删除chunk size链中的首个chunk 避免我们修改chunk size链表 所以我们取第二个
  if (victim != last (bin) && chunksize_nomask (victim) == chunksize_nomask (victim->fd))
      victim = victim->fd;
  ```

- chunk 通过unlink脱链 remainder chunk入unsortedbin链

  > 安全检查 是否切割后的chunk大于minsize 与安全检查 largebin第一个chunk和头的互锁状态

  ```c
   // 算剩余的remainder_size
   remainder_size = size - nb;
   // 对 我们large bin中的chunk 进行unlink操作
   unlink_chunk (av, victim);
  
  /* Exhaust */
  // 安全检查 如果切割的chunk 小于Minsize 则 设置下一个chunk p为0
  if (remainder_size < MINSIZE){
  	set_inuse_bit_at_offset (victim, size);
  	if (av != &main_arena)
  		set_non_main_arena (victim);
  }else{
       remainder = chunk_at_offset (victim, nb);
      /* We cannot assume the unsorted list is empty and therefore
                       have to perform a complete insert here.  */
      // 根据注释大概知道是进行完整的插入操作
      // 取得unsorted_chunk bin链表的的头
      bck = unsorted_chunks(av);
      // 取 第一个chunk
      fwd = bck->fd;
      // 安全检查:检查第一个chunk的bk是否为unsorted bin的头
      if (__glibc_unlikely (fwd->bk != bck)){
          malloc_printerr ("malloc(): corrupted unsorted chunks");
      }
      // remainder 入unsortedbin
      remainder->bk = bck;
      remainder->fd = fwd;
      bck->fd = remainder;
      fwd->bk = remainder;
      // 如果是remiander 则将fd_nextsize bk_nextsize 设置为null
      if (!in_smallbin_range (remainder_size)){
          remainder->fd_nextsize = NULL;
          remainder->bk_nextsize = NULL;
      }
      // 这里应该是设置head的一系列操作
      set_head (victim, nb | PREV_INUSE |
                (av != &main_arena ? NON_MAIN_ARENA : 0));
      set_head (remainder, remainder_size | PREV_INUSE);
      // foot就是下一个chunk的prev_size部分 
      set_foot (remainder, remainder_size);
  }
  ```

### 返回被切割后的chunk

```c
check_malloced_chunk (av, victim, nb);
void *p = chunk2mem (victim);
alloc_perturb (p, bytes);
return p;
```

### 从topchunk中获取chunk

> 我是大概浏览的 大概意思是去剩下的chunk中寻找 如果没找到就去topchunk分配 如果topchunk不够就去系统申请

### _int_free_源码

```c

static void
_int_free (mstate av, mchunkptr p, int have_lock)
{
  INTERNAL_SIZE_T size;        /* its size */
  mfastbinptr *fb;             /* associated fastbin */
  mchunkptr nextchunk;         /* next contiguous chunk */
  INTERNAL_SIZE_T nextsize;    /* its size */
  int nextinuse;               /* true if nextchunk is used */
  INTERNAL_SIZE_T prevsize;    /* size of previous contiguous chunk */
  mchunkptr bck;               /* misc temp for linking */
  mchunkptr fwd;               /* misc temp for linking */
  // 获取size大小 
  size = chunksize (p);

  /* Little security check which won't hurt performance: the
     allocator never wrapps around at the end of the address space.
     Therefore we can exclude some size values which might appear
     here by accident or by "design" from some intruder.  */
  if (__builtin_expect ((uintptr_t) p > (uintptr_t) -size, 0)
      || __builtin_expect (misaligned_chunk (p), 0))
    malloc_printerr ("free(): invalid pointer");
  
  /* We know that each chunk is at least MINSIZE bytes in size or a
     multiple of MALLOC_ALIGNMENT.  */
    //  要大于MINSIZE 以及内存对齐?
  if (__glibc_unlikely (size < MINSIZE || !aligned_OK (size)))
    malloc_printerr ("free(): invalid size");

  check_inuse_chunk(av, p);

#if USE_TCACHE
  {
    size_t tc_idx = csize2tidx (size);

    if (tcache
	&& tc_idx < mp_.tcache_bins
	&& tcache->counts[tc_idx] < mp_.tcache_count)
      {
	tcache_put (p, tc_idx);
	return;
      }
  }
#endif

  /*
    If eligible, place chunk on a fastbin so it can be found
    and used quickly in malloc.
  */
    //  如果是fastbin区间的
  if ((unsigned long)(size) <= (unsigned long)(get_max_fast ())

#if TRIM_FASTBINS
      /*
	If TRIM_FASTBINS set, don't place chunks
	bordering top into fastbins
      */
      && (chunk_at_offset(p, size) != av->top)
#endif
      ) {
    // chunk的size值 得大于chunk最小值 得小于该区域分配的最大size
    if (__builtin_expect (chunksize_nomask (chunk_at_offset (p, size))<= 2 * SIZE_SZ, 0)|| __builtin_expect (chunksize (chunk_at_offset (p, size))>= av->system_mem, 0)){
	    bool fail = true;
	/* We might not have a lock at this point and concurrent modifications
	   of system_mem might result in a false positive.  Redo the test after
	   getting the lock.  */
        if (!have_lock){
            __libc_lock_lock (av->mutex);
            fail = (chunksize_nomask (chunk_at_offset (p, size)) <= 2 * SIZE_SZ
                || chunksize (chunk_at_offset (p, size)) >= av->system_mem);
            __libc_lock_unlock (av->mutex);
        }

        if (fail)
            malloc_printerr ("free(): invalid next size (fast)");
    }


    // 清空chunk中除了prev_size 和size的地方
    free_perturb (chunk2mem(p), size - 2 * SIZE_SZ);

    atomic_store_relaxed (&av->have_fastchunks, true);
    // 获取对应fastbin链
    unsigned int idx = fastbin_index(size);
    fb = &fastbin (av, idx);

    /* Atomically link P to its fastbin: P->FD = *FB; *FB = P;  */
    // 将块 P 插入到 fastbin 中。首先，它将当前 fastbin 的头部指针的值赋给块 P 的 FD 字段
    mchunkptr old = *fb, old2;

    if (SINGLE_THREAD_P){
	/* Check that the top of the bin is not the record we are going to
	   add (i.e., double free).  */
       // 检查fastbin的头部chunk是否为当前free的chunk
        if (__builtin_expect (old == p, 0))
            malloc_printerr ("double free or corruption (fasttop)");
        // p->old
        p->fd = old;
        *fb = p;
    }else
        do{
        /* Check that the top of the bin is not the record we are going to
            add (i.e., double free).  */
            if (__builtin_expect (old == p, 0))
                malloc_printerr ("double free or corruption (fasttop)");
            p->fd = old2 = old;
        }while ((old = catomic_compare_and_exchange_val_rel (fb, p, old2))
            != old2);

        /* Check that size of fastbin chunk at the top is the same as
        size of the chunk that we are adding.  We can dereference OLD
        only if we have the lock, otherwise it might have already been
        allocated again.  */
        if (have_lock && old != NULL&& __builtin_expect (fastbin_index (chunksize (old)) != idx, 0))
            malloc_printerr ("invalid fastbin entry (free)");
  }

  /*
    Consolidate other non-mmapped chunks as they arrive.
  */
    // 如果释放的chunk不属于fastbin 且不是mmap分配的 就获取下一个chunk的指针 nextchunk和nextsize
    // 如果前一个chunk空闲 就合并 通过unlink将该chunk脱离出来
    // 如果取出来的chunk下一个chunk也是free chunk 且不为top chunk 则也设置为空闲 
    // 去除unsortedbin头指针 将合并后的chunk 塞入unsortedbin中
    // 如果为top chunk则直接合并
  else if (!chunk_is_mmapped(p)) {

    /* If we're single-threaded, don't lock the arena.  */
    if (SINGLE_THREAD_P)
      have_lock = true;

    if (!have_lock)
      __libc_lock_lock (av->mutex);

    nextchunk = chunk_at_offset(p, size);

    /* Lightweight tests: check whether the block is already the
       top block.  */
    //    检查是否等于头一个chunk
    if (__glibc_unlikely (p == av->top))
      malloc_printerr ("double free or corruption (top)");
    /* Or whether the next chunk is beyond the boundaries of the arena.  */
    // 查看下一个chunk是否大于整个内存空间的边界
    if (__builtin_expect (contiguous (av)
			  && (char *) nextchunk
			  >= ((char *) av->top + chunksize(av->top)), 0))
	    malloc_printerr ("double free or corruption (out)");
    /* Or whether the block is actually not marked used.  */
    // 如果通过nextchunk查看下一个chunk是free状态 也就是当前我们要free的chunk 是free状态 则报错double free
    if (__glibc_unlikely (!prev_inuse(nextchunk)))
      malloc_printerr ("double free or corruption (!prev)");
    // 获取物理上下一个chunk的大小
    nextsize = chunksize(nextchunk);
    // 进行2*size+sz<size<system_mem的传统检查
    if (__builtin_expect (chunksize_nomask (nextchunk) <= 2 * SIZE_SZ, 0)
	|| __builtin_expect (nextsize >= av->system_mem, 0))
      malloc_printerr ("free(): invalid next size (normal)");
    // 清空要free的chunk 
    free_perturb (chunk2mem(p), size - 2 * SIZE_SZ);
    // 如果当前chunk的p为0也就是下一个chunk为freechunk则进行合并
    /* consolidate backward */
    if (!prev_inuse(p)) {
    // 获取prev_size作为上一个chunk的size大小
      prevsize = prev_size (p);
      // size+prevsize也就是新的chunk的大小
      size += prevsize;
      // 获取上一个chunk的头指针
      p = chunk_at_offset(p, -((long) prevsize));
      // 进行unlink操作
      unlink(av, p, bck, fwd);
    }
    // 如果下一个chunk不为top chunk 
    // 下一个chunk也是free chunk 则继续进行合并
    if (nextchunk != av->top) {
      /* get and clear inuse bit */
      // 应该是根据指针 和size 算出下一个chunk的size p位置
      nextinuse = inuse_bit_at_offset(nextchunk, nextsize);

      /* consolidate forward */
      if (!nextinuse) {
        unlink(av, nextchunk, bck, fwd);
        size += nextsize;
      } else
      // 设置nextchunk size p 的部分清空
      clear_inuse_bit_at_offset(nextchunk, 0);

      /*
	Place the chunk in unsorted chunk list. Chunks are
	not placed into regular bins until after they have
	been given one chance to be used in malloc.
      */

      bck = unsorted_chunks(av);
      fwd = bck->fd;
    //   检查unsortedbin是否合法
      if (__glibc_unlikely (fwd->bk != bck))
	        malloc_printerr ("free(): corrupted unsorted chunks");
    // p入unsortedbin链
      p->fd = fwd;
      p->bk = bck;
    //   属于largebin大小则设置fd_nextsize bk_nextsize为null
      if (!in_smallbin_range(size)){
        p->fd_nextsize = NULL;
        p->bk_nextsize = NULL;
	  }
    // 正式入链
      bck->fd = p;
      fwd->bk = p;
    //正常设置size 和foot
      set_head(p, size | PREV_INUSE);
      set_foot(p, size);

      check_free_chunk(av, p);
    }

    /*
      If the chunk borders the current high end of memory,
      consolidate into top
    */
    else {
      size += nextsize;
      set_head(p, size | PREV_INUSE);
      av->top = p;
      check_chunk(av, p);
    }

    /*
      If freeing a large space, consolidate possibly-surrounding
      chunks. Then, if the total unused topmost memory exceeds trim
      threshold, ask malloc_trim to reduce top.

      Unless max_fast is 0, we don't know if there are fastbins
      bordering top, so we cannot tell for sure whether threshold
      has been reached unless fastbins are consolidated.  But we
      don't want to consolidate on each free.  As a compromise,
      consolidation is performed if FASTBIN_CONSOLIDATION_THRESHOLD
      is reached.
    */

    if ((unsigned long)(size) >= FASTBIN_CONSOLIDATION_THRESHOLD) {
      if (atomic_load_relaxed (&av->have_fastchunks))
	    malloc_consolidate(av);

      if (av == &main_arena) {
#ifndef MORECORE_CANNOT_TRIM
	if ((unsigned long)(chunksize(av->top)) >=
	    (unsigned long)(mp_.trim_threshold))
	  systrim(mp_.top_pad, av);
#endif
      } else {
	/* Always try heap_trim(), even if the top chunk is not
	   large, because the corresponding heap might go away.  */
	heap_info *heap = heap_for_ptr(top(av));

	assert(heap->ar_ptr == av);
	heap_trim(heap, mp_.top_pad);
      }
    }

    if (!have_lock)
      __libc_lock_unlock (av->mutex);
  }
  /*
    If the chunk was allocated via mmap, release via munmap().
  */

  else {
    munmap_chunk (p);
  }
}

```



## 漏洞利用

> 我们主要是利用:[largechunk中最大的chunk还是小于我们所需求的chunk大小](#attack)这种情况 我们来详细分析一下这个流程中究竟干了什么

```c
victim->fd_nextsize = fwd;
victim->bk_nextsize = fwd->bk_nextsize;
if (__glibc_unlikely (fwd->bk_nextsize->fd_nextsize != fwd))
    malloc_printerr ("malloc(): largebin double linked list corrupted (nextsize)");
fwd->bk_nextsize = victim;
victim->bk_nextsize->fd_nextsize = victim;
// 以及
victim->bk = bck;
victim->fd = fwd;
fwd->bk = victim;
bck->fd = victim;
```

- 我们可以发现 这里的代码 危险的地方在于 如果现在我们能够修改largebin中fwd位置的chunk 我们就能够泄露victim的地址 

  > 我们主要利用这两行代码

  ```
  victim->bk_nextsize->fd_nextsize = victim;
  bck->fd = victim;
  ```

- 如何实现？比如
  - 我们修改largebin中的chunk 也就是fwd的bk为我们想要泄露到的`目标地址-0x10`时
    - 所以fwd->bk->fd也就是`目标地址` 
    - 阅读前后逻辑我们知道这段代码中bck=fwd->bk
    - bck->fd 最后被赋值victim
    - 所以也就是fwd->bk->fd被赋值victim 也就是目标地址赋值victim
  - 我们修改fwd的bk_nextsize为`目标地址-0x20`
    - 所以fwd->bk_nextsize->fd_nextsize等于目标地址
    - 然后也因为victim->bk_nextsize = fwd->bk_nextsize; 和victim->bk_nextsize->fd_nextsize = victim所以等价替换
    -  fwd->bk_nextsize->fd_nextsize=victim也就是目标地址等于victim
