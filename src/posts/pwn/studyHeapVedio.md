---
date:2024-2-17
---

# NTUSTISC - Pwn 2学习笔记

> 查看glibc的源码网址:https://elixir.bootlin.com/glibc/glibc-2.23/source/malloc/malloc.c

## TSL 了解

### gdb 如何查 fs？

```python
print (void)arch_prctl(option_num,addr)
```

- option_num 是决定是我们的操作  比如0x1003就是取fs的值
- addr就是取fs放在什么地方

- pwngdb的话直接输入`tls`也可以查到

## bin

### free 源码分析

- 运行`_int_free`函数
- 如果`size`小于get_max_fast()就进入`fastbin`
- 通过fastbin_index(size)获取对应大小的`fastbin`
- `fastbin(av,idx)`获取fastbin的位置
- 然后chunk入链

### malloc源码分析

- 运行`_int_malloc`函数
- 先获取我们真正需要的 `chunk` 大小
- 判断是否是`fastbin`范围
- 获取对应大小的`fastbin`然后获取位置
- 然后 chunk出链

### Fastbin

- fd指向下一个`free chunk`的`chunk head`(也就是下一个free的chunk)
- 不去修改p

### Tcache

- 从libc2.26开始引入
- 从0x20到0x410
- 每个tcache最多收取7个chunk
- 用结构`tcache_perthread_struct`管理`tcache`
  - 存在于`TLS`
  - 一共两个部分 一个是对应大小的tcache bin的链表(每个最多存7个chunk) 一个是对应链表的元素数量

- chunk的bk是一串随机的安全数 防止double free的
- fd指向的是 下一个`free chunk`的`mem`(也就是payload的部分)

## Fastbin dup

> 算是一个正式的攻击手段

- 利用`double free`让整个链表陷入循环

  > 比如现在fastBin->chunk1->chunk2 然后此时`chunk1`的fd指向`chunk2`然后我们再次free `chunk2`那么chunk2的fd指向`chunk1`就会变成:<br>fastBin->chunk2->chunk1->chunk2->chunk1的死循环

-  然后我们`malloc`一下 获取了`chunk2`然后此时链表:`fastbin->chunk1->chunk2->chunk1...`

- 然后我们修改`chunk2`fd指向我们想要修改的地方 那么链表:`fastbin->chunk1->chunk2->addr_we_want`

- 那么我们`malloc`三次获取我们想要的地址的读写权

  > 记住是我们想要写入地址-0x10 因为还有`prev_size`+`size`

- 然后根据源码 我们可以知道

  - size检查

  > 我们的size得>=2*SIZE_SZ然后必须<=av->system_mem

  ```c
   if (__builtin_expect (chunk_at_offset (p, size)->size <= 2 * SIZE_SZ, 0)
  	|| __builtin_expect (chunksize (chunk_at_offset (p, size))
  			     >= av->system_mem, 0))
        {
  	/* We might not have a lock at this point and concurrent modifications
  	   of system_mem might have let to a false positive.  Redo the test
  	   after getting the lock.  */
  	if (have_lock
  	    || ({ assert (locked == 0);
  		  mutex_lock(&av->mutex);
  		  locked = 1;
  		  chunk_at_offset (p, size)->size <= 2 * SIZE_SZ
  		    || chunksize (chunk_at_offset (p, size)) >= av->system_mem;
  	      }))
  	  {
  	    errstr = "free(): invalid next size (fast)";
  	    goto errout;
  	  }
  	if (! have_lock)
  	  {
  	    (void)mutex_unlock(&av->mutex);
  	    locked = 0;
  	  }
        }
  
  ```

  - 检查`double chunk`

    > 仅仅是检查bin中第一个chunk是否是`相同`的chunk

    ```c
    free_perturb (chunk2mem(p), size - 2 * SIZE_SZ);
    
        set_fastchunks(av);
        unsigned int idx = fastbin_index(size);
        fb = &fastbin (av, idx);
    
        /* Atomically link P to its fastbin: P->FD = *FB; *FB = P;  */
        mchunkptr old = *fb, old2;
        unsigned int old_idx = ~0u;
        do
          {
    	/* Check that the top of the bin is not the record we are going to add
    	   (i.e., double free).  */
    	if (__builtin_expect (old == p, 0))
    	  {
    	    errstr = "double free or corruption (fasttop)";
    	    goto errout;
    	  }
    	/* Check that size of fastbin chunk at the top is the same as
    	   size of the chunk that we are adding.  We can dereference OLD
    	   only if we have the lock, otherwise it might have already been
    	   deallocated.  See use of OLD_IDX below for the actual check.  */
    	if (have_lock && old != NULL)
    	  old_idx = fastbin_index(chunksize(old));
    	p->fd = old2 = old;
          }
        while ((old = catomic_compare_and_exchange_val_rel (fb, p, old2)) != old2);
    
        if (have_lock && old != NULL && __builtin_expect (old_idx != idx, 0))
          {
    	errstr = "invalid fastbin entry (free)";
    	goto errout;
          }
    ```

  ### Tcache利用

  > 大多数性质和fastbin是一样的 但是`calloc`是不会拿`tcache`的 所以我们一般把tcache填满来绕过

