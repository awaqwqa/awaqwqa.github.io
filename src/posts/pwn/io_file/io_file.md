---
date: 2024-3-25
tag:
  - pwn
  - heap
---
# 浅学习Io_file

> io_file相关学习有点蛋疼 感觉较为复杂 找到了大佬的blog感觉摸到了皮毛 为了深入
>
> 整体脉络:[IO_FILE相关利用 | Alex's blog~ (la13x.github.io)](https://la13x.github.io/2021/07/27/IO-FILE/#IO-FILE相关知识)
>
> 源码阅读:[IO函数源码阅读 (bambooiii.github.io)](https://bambooiii.github.io/2024/03/03/IO函数源码阅读/)

## 核心结构体

```c
struct _IO_FILE_plus
{
  FILE file;
  // 这里是常量指针 请记住和指针常量的区别
  // 指针常量本质是常量 存储的是指针 也就是说其记录的指针不能被修改 但是指针指向的内容是可以修改的
  // 常量指针是指针 只不过指针所指向的地址得是个常量 所以指针本身值可以被修改 但是其内容不可被修改
  // 所以在开发者最初设想中 这里的vtable的值可以改变 但是它指向的内容是不可变的
  // vtable指向的是类型为_IO_jump_t的常量数据
  const struct _IO_jump_t *vtable;
};
```

### file

- 一般开发的时候 我们喜欢把write 和open等函数操作的文件 叫做文件流 (file) 在以前我的理解就是这是存储的文件数据的一个结构
- fread 和fwrite函数需要文件流指针调用虚表函数
- fopen函数会自动通过malloc 创建 file(文件流)  所以这里`_IO_FILE_plus`结构体的第一个属性`file`就是存储这个文件流的（倒不如说它就是文件流）

- 代码过于复杂  暂时不搬出来了 这里我们理解即可(大概)

### vtable

> 这里我是这样理解的当我们自己设计一个文件读取管理器 我们如何设计一个结构体？方便我们进行处理
>
> 我可能会选择这样 先创建一个FILE结构体 然后一个属性为data也就是数据本身 然后各种回调函数属性 
>
> 这样我们只需要调用FILE.xxxxxx()函数就可以轻易完成对文件地操作 所以这里的设计了一个vtable 指针
>
> 用于指向各种处理函数 方便我们进行调用

- 指向的是一个类型为`_IO_jump_t`的常量数据 这个数据主要存着各种函数

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

## IO函数函数的原理

> 这里阅读一下IO函数的源码 方便我们直观看见 `_IO_FILE_plus`结构体与这些相关函数的联系 如果只是想要懂个流程就是浏览一下这部分就行 如果要详细了解一下就看文章后面调试深入理解部分的内容 这里推荐自己用有符号的libc自己调试几下 一会儿思维就通了

### fopen函数

- 分配对应大小的空间

  ```c
   struct locked_FILE
    {
      struct _IO_FILE_plus fp;
  #ifdef _IO_MTSAFE_IO   //没执行
      _IO_lock_t lock;
  #endif
      struct _IO_wide_data wd;
    } *new_f = (struct locked_FILE *) malloc (sizeof (struct locked_FILE));   //first:分配空间
  
  ```

- 初始化`_IO_FILE_plus`结构体数据 by `_IO_no_init`

  > 这里的初始值几乎全部都是赋值的null

  ```c
  if (new_f == NULL)
      return NULL;
  #ifdef _IO_MTSAFE_IO   //没执行
    new_f->fp.file._lock = &new_f->lock;
  #endif
    _IO_no_init (&new_f->fp.file, 0, 0, &new_f->wd, &_IO_wfile_jumps);    //second：初始化
    _IO_JUMPS (&new_f->fp) = &_IO_file_jumps;                    //说明所有的_io_file_jump都是同一个vtable
  ```



- 将`_IO_FILE_plus`结构体链接到`_IO_list_all` by `_io_file_init_internal`

  > 相当于让`_io_file_plus`入链 假如之前`_IO_list_all`指向的`stderr`则链接后
  >
  > _io_list_all ->fp->stderr  (fp._chain->stderr) 这里上大佬的图

  ![fpmKdFRYo6VeTh5](https://awaqwqa.github.io/img/io_file/fpmKdFRYo6VeTh5.png)

  ```c
   _IO_new_file_init_internal (&new_f->fp);//third：将file链接到_IO_list_all
  ```

- 打开文件 by `_IO_file_fopen`

  ```c
    if (_IO_file_fopen ((FILE *) new_f, filename, mode, is32) != NULL)   //forth：打开文件
      return __fopen_maybe_mmap (&new_f->fp.file);
  ```

- 函数尾部

  ```c
  _IO_un_link (&new_f->fp);
  free (new_f);
  return NULL;
  ```

## 调试源码 深入理解

```c
#include <stdio.h>
#define system_ptr 0x7ffff7a52390;
#include <string.h>
int main(void)
{
    FILE *fp;
    long long *vtable_ptr;
    fp=fopen("flag.txt","rw");
    vtable_ptr=(long long*)((long long)fp+0xd8);     //get vtable

    memcpy(fp,"sh",3);

    vtable_ptr[7]=system_ptr //xsputn


    fwrite("hi",2,1,fp);
}
```

### 进入open64

![image-20240327010609541](https://awaqwqa.github.io/img/io_file/image-20240327010609541.png)

### malloc 部分

#### 源码

```c
  struct locked_FILE
  {
    struct _IO_FILE_plus fp;
#ifdef _IO_MTSAFE_IO   //没执行
    _IO_lock_t lock;
#endif
    struct _IO_wide_data wd;
  } *new_f = (struct locked_FILE *) malloc (sizeof (struct locked_FILE)); 
```

#### 调试

![image-20240327011453742](https://awaqwqa.github.io/img/io_file/image-20240327011453742.png)

- malloc 后new_f的值

  ![image-20240327011540293](https://awaqwqa.github.io/img/io_file/image-20240327011540293.png)

  ```c
  $2 = {
    fp = {
      file = {
        _flags = 0,
        _IO_read_ptr = 0x0,
        _IO_read_end = 0x0,
        _IO_read_base = 0x0,
        _IO_write_base = 0x0,
        _IO_write_ptr = 0x0,
        _IO_write_end = 0x0,
        _IO_buf_base = 0x0,
        _IO_buf_end = 0x0,
        _IO_save_base = 0x0,
        _IO_backup_base = 0x0,
        _IO_save_end = 0x0,
        _markers = 0x0,
        _chain = 0x0,
        _fileno = 0,
        _flags2 = 0,
        _old_offset = 0,
        _cur_column = 0,
        _vtable_offset = 0 '\000',
        _shortbuf = "",
        _lock = 0x0,
        _offset = 0,
        _codecvt = 0x0,
        _wide_data = 0x0,
        _freeres_list = 0x0,
        _freeres_buf = 0x0,
        __pad5 = 0,
        _mode = 0,
        _unused2 = '\000' <repeats 19 times>
      },
      vtable = 0x0
    },
    lock = {
      lock = 0,
      cnt = 0,
      owner = 0x0
    },
    wd = {
      _IO_read_ptr = 0x0,
      _IO_read_end = 0x0,
      _IO_read_base = 0x0,
      _IO_write_base = 0x0,
      _IO_write_ptr = 0x0,
      _IO_write_end = 0x0,
      _IO_buf_base = 0x0,
      _IO_buf_end = 0x0,
      _IO_save_base = 0x0,
      _IO_backup_base = 0x0,
      _IO_save_end = 0x0,
      _IO_state = {
        __count = 0,
        __value = {
          __wch = 0,
          __wchb = "\000\000\000"
        }
      },
      _IO_last_state = {
        __count = 0,
        __value = {
          __wch = 0,
          __wchb = "\000\000\000"
        }
      },
      _codecvt = {
        __cd_in = {
          step = 0x0,
          step_data = {
            __outbuf = 0x0,
            __outbufend = 0x0,
            __flags = 0,
            __invocation_counter = 0,
            __internal_use = 0,
            __statep = 0x0,
            __state = {
              __count = 0,
              __value = {
                __wch = 0,
                __wchb = "\000\000\000"
              }
            }
          }
        },
        __cd_out = {
          step = 0x0,
          step_data = {
            __outbuf = 0x0,
            __outbufend = 0x0,
            __flags = 0,
            __invocation_counter = 0,
            __internal_use = 0,
            __statep = 0x0,
            __state = {
              __count = 0,
              __value = {
                __wch = 0,
                __wchb = "\000\000\000"
              }
            }
          }
        }
      },
      _shortbuf = L"",
      _wide_vtable = 0x0
    }
  }
  
  
  ```

**扩展: wd结构体**

```c
struct _IO_wide_data
{
  wchar_t *_IO_read_ptr;	/* Current read pointer */  //unsigned short
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

### 初始化 _IO_no_init

#### 源码

```c
_IO_no_init (&new_f->fp.file, 0, 0, &new_f->wd, &_IO_wfile_jumps);    //second：初始化
// _IO_no_init源码

void
_IO_no_init (FILE *fp, int flags, int orientation,
	     struct _IO_wide_data *wd, const struct _IO_jump_t *jmp)
{
  _IO_old_init (fp, flags);
  fp->_mode = orientation;
  if (orientation >= 0)
    {
      fp->_wide_data = wd;
      fp->_wide_data->_IO_buf_base = NULL;
      fp->_wide_data->_IO_buf_end = NULL;
      fp->_wide_data->_IO_read_base = NULL;
      fp->_wide_data->_IO_read_ptr = NULL;
      fp->_wide_data->_IO_read_end = NULL;
      fp->_wide_data->_IO_write_base = NULL;
      fp->_wide_data->_IO_write_ptr = NULL;
      fp->_wide_data->_IO_write_end = NULL;
      fp->_wide_data->_IO_save_base = NULL;
      fp->_wide_data->_IO_backup_base = NULL;
      fp->_wide_data->_IO_save_end = NULL;

      fp->_wide_data->_wide_vtable = jmp;
    }
  else
    /* Cause predictable crash when a wide function is called on a byte
       stream.  */
    fp->_wide_data = (struct _IO_wide_data *) -1L;
  fp->_freeres_list = NULL;
}
```

#### 调试

![image-20240327011904072](https://awaqwqa.github.io/img/io_file/image-20240327011904072.png)

- 执行后new_f变化

  - (*new_f).file._flags变化

    ```c
     _flags = -72548352,
    ```

  - (*new_f).wd._wide_vtable 变化

    ```c
    _wide_vtable = 0x7ffff7fb5f60 <_IO_wfile_jumps>
    ```

### vtable表赋值

#### 源码

```c
_IO_JUMPS(&new_f->fp) = &_IO_file_jumps;
```

#### 调试

![image-20240327013258111](https://awaqwqa.github.io/img/io_file/image-20240327013258111.png)

- 我们对_io_file_jumps数据进行查看一下 满足好奇心

  > 可以发现就是塞满了各种函数

  ![image-20240327013517671](https://awaqwqa.github.io/img/io_file/image-20240327013517671.png)

  ![image-20240327013607798](https://awaqwqa.github.io/img/io_file/image-20240327013607798.png)

### 链接部分

#### 源码

```c
_IO_new_file_init_internal(&new_f->fp);
```

#### 调试

![image-20240327013056474](https://awaqwqa.github.io/img/io_file/image-20240327013056474.png)

- _io_new_file_init_internal函数

  ```c
  void _IO_new_file_init_internal(struct _IO_FILE_plus *fp)
  {
      /* POSIX.1 allows another file handle to be used to change the position
         of our file descriptor.  Hence we actually don't know the actual
         position before we do the first fseek (and until a following fflush). */
      fp->file._offset = _IO_pos_BAD;
      fp->file._flags |= CLOSED_FILEBUF_FLAGS;
  
      _IO_link_in(fp);
      fp->file._fileno = -1; // 设置_fileno -1
  }
  
  ```

  ![image-20240327014215956](https://awaqwqa.github.io/img/io_file/image-20240327014215956.png)

- _IO_link_in

  ```c
  void _IO_link_in(struct _IO_FILE_plus *fp)
  {
      if ((fp->file._flags & _IO_LINKED) == 0)
      {
          fp->file._flags |= _IO_LINKED;
  		// ...
          fp->file._chain = (FILE *)_IO_list_all;
          _IO_list_all = fp;
  		// ...
      }
  }
  ```

- 变化

  ![image-20240327014539222](https://awaqwqa.github.io/img/io_file/image-20240327014539222.png)

  - _chain链接`_IO_2_1_stderr`

  - _lock 修改值
  - _wide_data修改值

- 查看list_all链

  > 可以发现和我们的fp一模一样 所以我们的`_IO_list_all`此时是指向的我们fp

  ![image-20240327015022273](https://awaqwqa.github.io/img/io_file/image-20240327015022273.png)

- 查看`_IO_2_1_stderr_`

  > 可以发现_chain是指向的其他file 所以此时整条链是 _IO_list_all->fp 然后后面的通过_chain链接起来

  ![image-20240327015201921](https://awaqwqa.github.io/img/io_file/image-20240327015201921.png)

  

### 打开文件

#### 源码

```c
if (_IO_file_fopen((FILE *)new_f, filename, mode, is32) != NULL)
    return __fopen_maybe_mmap(&new_f->fp.file);
```

#### 调试

![image-20240327015402527](https://awaqwqa.github.io/img/io_file/image-20240327015402527.png)

- _io_file_fopen函数 太长了 主要就是判断打开模式 然后调用 `io_file_open`函数来打开

  ![image-20240327020322439](https://awaqwqa.github.io/img/io_file/image-20240327020322439.png)

- _io_file_open函数 最终调用open 去打开文件

  ![image-20240327020501416](https://awaqwqa.github.io/img/io_file/image-20240327020501416.png)

- fp 变化

  - _fileno 变成对应的文件描述符了

  - _offset变为了-1

    ![image-20240327020644254](https://awaqwqa.github.io/img/io_file/image-20240327020644254.png)

