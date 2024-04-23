# house of apple 原理细学习

> 其实还有很多house还没学 看见house of apple文章中提及了很多其他的house 顺便一起学了

## 参考文章:

- [[原创\] House of apple 一种新的glibc中IO攻击方法 (1)-Pwn-看雪-安全社区|安全招聘|kanxue.com](https://bbs.kanxue.com/thread-273418.htm)
- [glibc 2.35 pwn——house of apple v1 示例程序_pwn house of apple-CSDN博客](https://blog.csdn.net/qq_54218833/article/details/128624427)

## 条件 

- 触发exit函数 / main函数返回
- 泄露heap地址 libc地址
- 可进行largebin attack

## 原理

> 这里阅读了大致逻辑后进行总结

- 首先是通过一次largebin劫持`_IO_list_all` 伪造	
- 构造时将`vatble`填写`_IO_wstrn_jumps` 
- 触发exit函数 exit调用`_IO_flush_all_lockp`（原本会遍历所有的`File`结构体依次执行overflow函数）<br>由于我们劫持了vtable 所以最终调用了`_IO_wstrn_overflow`函数 会将`File`结构体中的`_wide_data`字段保存的地址附近写入值

### 覆盖vatble

> 也就是覆盖`FILE`结构体0xd8偏移位置的数据 为`_IO_wstrn_jumps`地址

![image-20240423173604690](https://awaqwqa.github.io/img/house_of_apple/image-20240423173604690.png)

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



