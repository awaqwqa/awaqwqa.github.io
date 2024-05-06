# php pwn学习

> 学习文章:[PHP堆开发简介 (deepunk.icu)](https://deepunk.icu/php-pwn/)
>
> [第5章 内存管理 - 5.1 Zend内存池 - 《[试读\] PHP7内核剖析》 - 书栈网 · BookStack](https://www.bookstack.cn/read/php7-internal/5-zend_alloc.md)

## php扩展学习

> 参考文章:[PHP pwn环境搭建+so文件的调试 | Pwn进你的心 (ywhkkx.github.io)](https://ywhkkx.github.io/2022/07/06/PHP pwn环境搭建+so文件的调试/)
>
> [第7章 扩展开发 - 7.2 扩展的实现原理 - 《[试读\] PHP7内核剖析》 - 书栈网 · BookStack](https://www.bookstack.cn/read/php7-internal/7-implement.md)



## heap相关学习

zend_alloc 

- 分为三种大小
  - zend_mm_alloc_small (小于3/4的2mb)
    - 内存中提前分配了30相同大小的内存slot 分配在不同的page上 
    - 如果大小合适会直接从这三十个slot中分配
  - zend_mm_alloc_large (大于2mb小于4k)
  - zend_mm_alloc_huge (小于2mb)
    - 单链表
    - 实际通过`zend_mm_chunk_alloc`分配

- 一个chunk 2mb 包含512 page

- 除了huge chunk chunk中第一页有这个结构体记录chunk的信息

-  _zend_mm_heap是内存池的一个结构 用于管理small large huge的分配

  > Zend中只有一个heap结构。

```c
struct _zend_mm_heap {
#if ZEND_MM_STAT
    size_t             size; //当前已用内存数
    size_t             peak; //内存单次申请的峰值
#endif
    zend_mm_free_slot *free_slot[ZEND_MM_BINS]; // 小内存分配的可用位置链表，ZEND_MM_BINS等于30，即此数组表示的是各种大小内存对应的链表头部
    ...
    zend_mm_huge_list *huge_list;               //大内存链表
    zend_mm_chunk     *main_chunk;              //指向chunk链表头部
    zend_mm_chunk     *cached_chunks;           //缓存的chunk链表
    int                chunks_count;            //已分配chunk数
    int                peak_chunks_count;       //当前request使用chunk峰值
    int                cached_chunks_count;     //缓存的chunk数
    double             avg_chunks_count;        //chunk使用均值，每次请求结束后会根据peak_chunks_count重新计算：(avg_chunks_count+peak_chunks_count)/2.0
}
struct _zend_mm_chunk {
    zend_mm_heap      *heap; //指向heap
    zend_mm_chunk     *next; //指向下一个chunk
    zend_mm_chunk     *prev; //指向上一个chunk
    int                free_pages; //当前chunk的剩余page数
    int                free_tail;               /* number of free pages at the end of chunk */
    int                num;
    char               reserve[64 - (sizeof(void*) * 3 + sizeof(int) * 3)];
    zend_mm_heap       heap_slot; //heap结构，只有主chunk会用到
    zend_mm_page_map   free_map; //标识各page是否已分配的bitmap数组，总大小512bit，对应page总数，每个page占一个bit位
    zend_mm_page_info  map[ZEND_MM_PAGES]; //各page的信息：当前page使用类型(用于large分配还是small)、占用的page数等
};
//按固定大小切好的small内存槽
struct _zend_mm_free_slot {
    zend_mm_free_slot *next_free_slot;//此指针只有内存未分配时用到，分配后整个结构体转为char使用
};

```

- 直接从文中抠出来的图 特别详细和好理解

![img](https://static.sitestack.cn/projects/php7-internal/img/zend_heap.png)

## small malloc and free

```c
static zend_always_inline void *zend_mm_alloc_small(zend_mm_heap *heap, int bin_num ZEND_FILE_LINE_DC ZEND_FILE_LINE_ORIG_DC)
{
#if ZEND_MM_STAT
	do {
		size_t size = heap->size + bin_data_size[bin_num];
		size_t peak = MAX(heap->peak, size);
		heap->size = size;
		heap->peak = peak;
	} while (0);
#endif

	if (EXPECTED(heap->free_slot[bin_num] != NULL)) {
		zend_mm_free_slot *p = heap->free_slot[bin_num];
		heap->free_slot[bin_num] = p->next_free_slot;
		return p;
	} else {
		return zend_mm_alloc_small_slow(heap, bin_num ZEND_FILE_LINE_RELAY_CC ZEND_FILE_LINE_ORIG_RELAY_CC);
	}
}
static zend_always_inline void zend_mm_free_small(zend_mm_heap *heap, void *ptr, int bin_num)
{
	zend_mm_free_slot *p;

#if ZEND_MM_STAT
	heap->size -= bin_data_size[bin_num];
#endif

#if ZEND_DEBUG
	do {
		zend_mm_debug_info *dbg = (zend_mm_debug_info*)((char*)ptr + bin_data_size[bin_num] - ZEND_MM_ALIGNED_SIZE(sizeof(zend_mm_debug_info)));
		dbg->size = 0;
	} while (0);
#endif

	p = (zend_mm_free_slot*)ptr;
	p->next_free_slot = heap->free_slot[bin_num];
	heap->free_slot[bin_num] = p;
}
```

## 调试

![image-20240428113615977](C:\Users\NewOm\AppData\Roaming\Typora\typora-user-images\image-20240428113615977.png)

- 每次emalloc下来的small chunk都是fd链中一条

  - 间距0x280

  ![image-20240428113701938](C:\Users\NewOm\AppData\Roaming\Typora\typora-user-images\image-20240428113701938.png)

- 依次向右取值

### malloc

```c
static zend_always_inline void *zend_mm_alloc_small(zend_mm_heap *heap, int bin_num ZEND_FILE_LINE_DC ZEND_FILE_LINE_ORIG_DC)
{
#if ZEND_MM_STAT
	do {
		size_t size = heap->size + bin_data_size[bin_num];
		size_t peak = MAX(heap->peak, size);
		heap->size = size;
		heap->peak = peak;
	} while (0);
#endif

	if (EXPECTED(heap->free_slot[bin_num] != NULL)) {
		zend_mm_free_slot *p = heap->free_slot[bin_num];
		heap->free_slot[bin_num] = p->next_free_slot;
		return p;
	} else {
		return zend_mm_alloc_small_slow(heap, bin_num ZEND_FILE_LINE_RELAY_CC ZEND_FILE_LINE_ORIG_RELAY_CC);
	}
}


```

- 会优先取 free_slot里面 头
  - 然后将free_slot[bin_num]指向下一个free slot

### free 

```c
static zend_always_inline void zend_mm_free_small(zend_mm_heap *heap, void *ptr, int bin_num)
{
	zend_mm_free_slot *p;

#if ZEND_MM_STAT
	heap->size -= bin_data_size[bin_num];
#endif

#if ZEND_DEBUG
	do {
		zend_mm_debug_info *dbg = (zend_mm_debug_info*)((char*)ptr + bin_data_size[bin_num] - ZEND_MM_ALIGNED_SIZE(sizeof(zend_mm_debug_info)));
		dbg->size = 0;
	} while (0);
#endif

	p = (zend_mm_free_slot*)ptr;
	p->next_free_slot = heap->free_slot[bin_num];
	heap->free_slot[bin_num] = p;
}


```

- 直接就是入链头部没什么好说的（
