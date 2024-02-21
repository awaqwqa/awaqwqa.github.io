---
date: 2024-2-19
tag:
  - pwn
  - heap
---

# NTUSTISC-PWN3阅读笔记（1）

> 主要是看NTUSTISC

## tcache dup

> tcache在libc2.31里面引用了key检查 然后在malloc的时候没有检查`size` 其次tcache的fd指向的是`chunk data`

- 会在free进入tcache后在bk位置写入随机数 用于检查
- 当检查一样时候 会for循环迭代tcache查看是否有指针和这个即将free的chunk的指针一样
- 如果一样提示`double free`

```c
size_t tc_idx = csize2tidx (size);
if (tcache != NULL && tc_idx < mp_.tcache_bins)
{
    /* Check to see if it's already in the tcache.  */
    tcache_entry *e = (tcache_entry *) chunk2mem (p);

    /* This test succeeds on double free.  However, we don't 100%
	   trust it (it also matches random payload data at a 1 in
	   2^<size_t> chance), so verify it's not an unlikely
	   coincidence before aborting.  */
    // 这里就是检查bk是否等于tcache
    if (__glibc_unlikely (e->key == tcache))
    {
        tcache_entry *tmp;
        LIBC_PROBE (memory_tcache_double_free, 2, e, tc_idx);
        for (tmp = tcache->entries[tc_idx];
             tmp;
             tmp = tmp->next)
            if (tmp == e)
                malloc_printerr ("free(): double free detected in tcache 2");
        /* If we get here, it was a coincidence.  We've wasted a
	       few cycles, but don't abort.  */
    }

    if (tcache->counts[tc_idx] < mp_.tcache_count)
    {
        tcache_put (p, tc_idx);
        return;
    }
}
```

## UnsortedBin

- 被free的chunk的上一块chunk是`free chunk`就合并
- 如果下一块chunk是`top chunk`则合并到`top chunk`里面

- 首个是main_arena然后双向链表

## Consolidate

> unsortedBin在合并的时候 会使用`unlink_chunk`进行一个拖链操作

- 首先获取p的`size`然后去找到下一个chunk 看下一个chunk的prev_size是否等于这个`size`
- 通过p的fd获取上一个chunk bk获取下一个chunk 
  - FD = p->fd
  - BK = p->bk

- 然后`FD->bk`和`BK->fd`是否等于p
- 然后`BK->bk`等于`FD` and`Fd->fd`等于`BK`
- 这样就完成了脱链操作

```c
static void
unlink_chunk (mstate av, mchunkptr p)
{
  if (chunksize (p) != prev_size (next_chunk (p)))
    malloc_printerr ("corrupted size vs. prev_size");

  mchunkptr fd = p->fd;
  mchunkptr bk = p->bk;

  if (__builtin_expect (fd->bk != p || bk->fd != p, 0))
    malloc_printerr ("corrupted double-linked list");

  fd->bk = bk;
  bk->fd = fd;
  if (!in_smallbin_range (chunksize_nomask (p)) && p->fd_nextsize != NULL)
    {
      if (p->fd_nextsize->bk_nextsize != p
	  || p->bk_nextsize->fd_nextsize != p)
	malloc_printerr ("corrupted double-linked list (not small)");

      if (fd->fd_nextsize == NULL)
	{
	  if (p->fd_nextsize == p)
	    fd->fd_nextsize = fd->bk_nextsize = fd;
	  else
	    {
	      fd->fd_nextsize = p->fd_nextsize;
	      fd->bk_nextsize = p->bk_nextsize;
	      p->fd_nextsize->bk_nextsize = fd;
	      p->bk_nextsize->fd_nextsize = fd;
	    }
	}
      else
	{
	  p->fd_nextsize->bk_nextsize = p->bk_nextsize;
	  p->bk_nextsize->fd_nextsize = p->fd_nextsize;
	}
    }
}
```

## UnsafeUnlink + off_by_one

> 这里主要是绕过unlink 来实现一个fake chunk的利用 主要运用在

![fakeUnlink](https://awaqwqa.github.io/img/studyHeapVedio/fakeUnlink.png)

- 当我们可以多写一个字节的时候我们可以构造一个`fake chunk`

  - `prev_size` 0即可

  - `size` payload的长度+1

  - `fd`和`bk`

    > 这两个就比较重要了 因为要绕过`unlink`的安全检查 也就是检查`FD->bk == p == BK->fd` and `p->size = nextchunk(p)->prev_size`

    - 所以我们可以构造fd为`ptr-0x18` 那么`FD->bk`也就是FD+0X18的位置为p 绕过检查
    - bk 同理设计为`ptr-0x10`

  - `next_chunk_prev_size` 也就是下一个chunk的prev_size 这个构造等于payload的长度

  - 然后多的一个字节为0的话 我们就相当于chunk的p为0也就是我们构造的`fake chunk`会被当做`free chunk`而且这个`free chunk`的起始位置是根据`prev_size`来定的

- 然后那么根据源码最终ptr会指向fd也就是`ptr-0x18`的位置

  - 这里的fd->bk和bk->fd都是p

  ```c
   if (chunksize (p) != prev_size (next_chunk (p)))
      malloc_printerr ("corrupted size vs. prev_size");
  
    mchunkptr fd = p->fd;
    mchunkptr bk = p->bk;
  
    if (__builtin_expect (fd->bk != p || bk->fd != p, 0))
      malloc_printerr ("corrupted double-linked list");
  
    fd->bk = bk;
    bk->fd = fd;
  ```

  