---
date: 2024-5-6
tag: 
  - pwn
  - thread
  - heap
---

# 多线程pwn(ptmalloc)

> 参考文章:[ptmalloc堆概述-多线程支持_ptmalloc主arena存在的意义-CSDN博客](https://blog.csdn.net/luozhaotian/article/details/80267185) 
>
> 推荐(讲得很清晰):[ptmalloc源码分析 - 主分配区和非主分配区Arena的实现（04）_malloc main arena-CSDN博客](https://blog.csdn.net/initphp/article/details/127750294)
>
> [ptmalloc源码分析 - 分配区状态机malloc_state（02）-CSDN博客](https://initphp.blog.csdn.net/article/details/109489720)
>
> [ptmalloc源码分析 - 分配区heap_info结构实现（05）-CSDN博客](https://initphp.blog.csdn.net/article/details/132564546?spm=1001.2014.3001.5502)

## 主分配区 和 非主分配区

> ptmalloc通过**malloc_state**结构体来管理内存的分配等一系列操作 我们可以看见我们相对熟悉的`fastbinsY`和`bins`也就是我们接触最多的fastbin,unsortedbin,smallbin,largebin等 这里我们主要观察`next`,`next_free`

- ptmalloc中用主分配区和非主分配区用来解决线程争夺问题

- 非主分配区用mmap来映射获取内存

- 主分配区和非主分配区用`next`形成一个`环形链表`进行管理  `next`链接的是非主分配区

  ```c
  /* 分配区全局链表：分配区链表，主分配区放头部，新加入的分配区放main_arean.next 位置 Linked list */
    struct malloc_state *next;
  ```

```c
/**
 * 全局malloc状态管理
 */
struct malloc_state
{
  /* Serialize access. 同步访问互斥锁 */
  __libc_lock_define (, mutex);
 
  /* Flags (formerly in max_fast).
   * 用于标记当前主分配区的状态
   *  */
  int flags;
 
  /* Set if the fastbin chunks contain recently inserted free blocks.  */
  /* Note this is a bool but not all targets support atomics on booleans.  */
  /* 用于标记是否有fastchunk */
  int have_fastchunks;
 
  /* Fastbins fast bins。
   * fast bins是bins的高速缓冲区，大约有10个定长队列。
   * 当用户释放一块不大于max_fast（默认值64）的chunk（一般小内存）的时候，会默认会被放到fast bins上。
   * */
  mfastbinptr fastbinsY[NFASTBINS];
 
  /* Base of the topmost chunk -- not otherwise kept in a bin */
  /* Top chunk ：并不是所有的chunk都会被放到bins上。
   * top chunk相当于分配区的顶部空闲内存，当bins上都不能满足内存分配要求的时候，就会来top chunk上分配。 */
  mchunkptr top;
 
  /* The remainder from the most recent split of a small request */
  mchunkptr last_remainder;
 
  /* Normal bins packed as described above
   * 常规 bins chunk的链表数组
   * 1. unsorted bin：是bins的一个缓冲区。当用户释放的内存大于max_fast或者fast bins合并后的chunk都会进入unsorted bin上
   * 2. small bins和large bins。small bins和large bins是真正用来放置chunk双向链表的。每个bin之间相差8个字节，并且通过上面的这个列表，
   * 可以快速定位到合适大小的空闲chunk。
   * 3. 下标1是unsorted bin，2到63是small bin，64到126是large bin，共126个bin
   * */
  mchunkptr bins[NBINS * 2 - 2];
 
  /* Bitmap of bins
   * 表示bin数组当中某一个下标的bin是否为空，用来在分配的时候加速
   * */
  unsigned int binmap[BINMAPSIZE];
 
  /* 分配区全局链表：分配区链表，主分配区放头部，新加入的分配区放main_arean.next 位置 Linked list */
  struct malloc_state *next;
 
  /* 分配区空闲链表 Linked list for free arenas.  Access to this field is serialized
     by free_list_lock in arena.c.  */
  struct malloc_state *next_free;
 
  /* Number of threads attached to this arena.  0 if the arena is on
     the free list.  Access to this field is serialized by
     free_list_lock in arena.c.  */
    // 空闲链表的状态记录，0-空闲，n-正在使用中，关联的线程个数（一个分配区可以给多个线程使用）
  INTERNAL_SIZE_T attached_threads;
 
  /* Memory allocated from the system in this arena.  */
  INTERNAL_SIZE_T system_mem;
  INTERNAL_SIZE_T max_system_mem;
};
```

## 多线程分配

> malloc/arena.c/_int_new_arena函数中

### 流程

- 线程中malloc 会检查线程中是否存在`分配区`，如果存在直接加锁，并且进行内存分配

- 否则通过`next`遍历链表查看有未加锁`分配区` 然后加锁分配

- 如果无的话 会`ptamlloc`一个新的分配区 加入`malloc_state->next` 然后加锁进行分配

  > 下方是malloc一个新的分区的情况

  ```c
  __libc_lock_init (a->mutex);
  __libc_lock_lock (list_lock);
  /* Add the new arena to the global list.  */
  a->next = main_arena.next;
  /* FIXME: The barrier is an attempt to synchronize with read access
       in reused_arena, which does not acquire list_lock while
       traversing the list.  */
  atomic_write_barrier ();
  main_arena.next = a;
  __libc_lock_unlock (list_lock);
  __libc_lock_lock (free_list_lock);
  detach_arena (replaced_arena);
  __libc_lock_unlock (free_list_lock);
  ```

### 调用链:

```c
__libc_malloc->
    	arena_get
    	arena_get2->
    		_int_new_arena
```

- 先调用arena_get失败则调用arena_get2然后arena_get2中如果分配没有满则调用_int_new_arena满了调用**reused_arena**

### arena_get

> 调用主要是__libc_malloc函数中

- 从`thread_arena`中获取分配区 如果成功则加锁 没有成功则通过`arena_get2`进行分配区的申请与初始化

  > 每个线程都会设置这么一个变量`thread_arena` 该变量保存对应的分配区。如果是主线程，则thread_arena设置成main_arena。
  >
  > `main_arena`是在ptamlloc_init的时候初始化的 主线程对应主分配区

  ```C
  #define arena_get(ptr, size) do { \
        ptr = thread_arena;						      \
        arena_lock (ptr, size);						      \
    } while (0)
  static mstate
  arena_get_retry (mstate ar_ptr, size_t bytes)
  {
    LIBC_PROBE (memory_arena_retry, 2, bytes, ar_ptr);
    if (ar_ptr != &main_arena)
      {
        __libc_lock_unlock (ar_ptr->mutex);
        ar_ptr = &main_arena;
        __libc_lock_lock (ar_ptr->mutex);
      }
    else
      {
        __libc_lock_unlock (ar_ptr->mutex);
        ar_ptr = arena_get2 (bytes, ar_ptr);
      }
  
    return ar_ptr;
  }
  ```

  ![image-20240506184605509](https://awaqwqa.github.io/img/thread_pwn/image-20240506184605509.png)

### **arena_get2**

> 这里出现的`arena`数量的上限 64位数量是`8*cores+1` 32位是`2*cores+1`

```c

static mstate
arena_get2 (size_t size, mstate avoid_arena)
{
  mstate a;

  static size_t narenas_limit;
    // 从空闲链表中获取一个分配区，如果空闲链表中有该分配区，则直接使用，返回结果
  a = get_free_list ();
    // 获取失败的情况
  if (a == NULL)
    {
      /* Nothing immediately available, so generate a new arena.  */
      if (narenas_limit == 0)
        {
          if (mp_.arena_max != 0)
            narenas_limit = mp_.arena_max;
          else if (narenas > mp_.arena_test)
            {
              int n = __get_nprocs_sched ();

              if (n >= 1)
                narenas_limit = NARENAS_FROM_NCORES (n);
              else
                /* We have no information about the system.  Assume two
                   cores.  */
                narenas_limit = NARENAS_FROM_NCORES (2);
            }
        }
    repeat:;
      size_t n = narenas;
      /* NB: the following depends on the fact that (size_t)0 - 1 is a
         very large number and that the underflow is OK.  If arena_max
         is set the value of arena_test is irrelevant.  If arena_test
         is set but narenas is not yet larger or equal to arena_test
         narenas_limit is 0.  There is no possibility for narenas to
         be too big for the test to always fail since there is not
         enough address space to create that many arenas.  */
      if (__glibc_unlikely (n <= narenas_limit - 1))
        {
          if (catomic_compare_and_exchange_bool_acq (&narenas, n + 1, n))
            goto repeat;
          a = _int_new_arena (size);
	  if (__glibc_unlikely (a == NULL))
            catomic_decrement (&narenas);
        }
      else
          // 如果
        a = reused_arena (avoid_arena);
    }
  return a;
}
```

### **_int_new_arena**(new arena)

> 创建一个非主分配区

```c
/**
 * 初始化一个新的分配区arena
 * 该函数主要创建：非主分配区
 * 主分配区在ptmalloc_init中初始化，并且设置了全局变量main_arena的值
 */
static mstate _int_new_arena(size_t size) {
	mstate a;
	heap_info *h;
	char *ptr;
	unsigned long misalign;
 
	/* 分配一个heap_info，用于记录堆的信息，非主分配区一般都是通过MMAP向系统申请内存；非主分配区申请后，是不能被销毁的 */
	// new_heap是仅仅在非主分配区使用的
    h = new_heap(size + (sizeof(*h) + sizeof(*a) + MALLOC_ALIGNMENT),
			mp_.top_pad);å
	if (!h) {
		/* Maybe size is too large to fit in a single heap.  So, just try
		 to create a minimally-sized arena and let _int_malloc() attempt
		 to deal with the large request via mmap_chunk().  */
		h = new_heap(sizeof(*h) + sizeof(*a) + MALLOC_ALIGNMENT, mp_.top_pad);
		if (!h)
			return 0;
	}
	a = h->ar_ptr = (mstate)(h + 1); //heap_info->ar_ptr的值设置成mstate的分配区状态机的数据结构
 
	malloc_init_state(a); //初始化mstate
	a->attached_threads = 1; //设置进程关联个数
	/*a->next = NULL;*/
	a->system_mem = a->max_system_mem = h->size;
 
	/* Set up the top chunk, with proper alignment. */
	ptr = (char *) (a + 1);
	misalign = (unsigned long) chunk2mem(ptr) & MALLOC_ALIGN_MASK;
	if (misalign > 0)
		ptr += MALLOC_ALIGNMENT - misalign;
	top (a) = (mchunkptr) ptr;
	set_head(top(a), (((char *) h + h->size) - ptr) | PREV_INUSE);
 
	LIBC_PROBE(memory_arena_new, 2, a, size);
	mstate replaced_arena = thread_arena;
	thread_arena = a; //将当前线程设置mstate
	__libc_lock_init(a->mutex); //初始化分配区锁
 
	__libc_lock_lock(list_lock); //加上分配区锁
 
	/* 将新的分配区加入到全局链表上，新申请的分配区都会放入主分配区的下一个位置*/
	/* Add the new arena to the global list.  */
	a->next = main_arena.next;
	/* FIXME: The barrier is an attempt to synchronize with read access
	 in reused_arena, which does not acquire list_lock while
	 traversing the list.  */
	atomic_write_barrier();
	main_arena.next = a;
	__libc_lock_unlock(list_lock);
 
	/* 调整attached_threads状态*/
	__libc_lock_lock(free_list_lock);
	detach_arena(replaced_arena);
	__libc_lock_unlock(free_list_lock);
 
 
	 __malloc_fork_lock_parent.  */
 
	__libc_lock_lock(a->mutex); //解除分配区锁
 
	return a;
}
 
/* Remove the arena from the free list (if it is present).
 free_list_lock must have been acquired by the caller.
 移动链表地址，移除free_list上的分配区结构*/
static void remove_from_free_list(mstate arena) {
	mstate *previous = &free_list;
	for (mstate p = free_list; p != NULL; p = p->next_free) {
		assert(p->attached_threads == 0);
		if (p == arena) {
			/* Remove the requested arena from the list.  */
			*previous = p->next_free;
			break;
		} else
			previous = &p->next_free;
	}
}
```

### **reused_arena**

> 简单来说就是遍历整个分配区表判断是否有锁 没锁就能用 这样就可以实现循环利用



