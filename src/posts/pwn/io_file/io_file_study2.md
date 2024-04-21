---
date: 2024-3-27
tag:
  - pwn
  - io_file
---
# FSOP细读

> io_file中经典利用 核心L_IO_flush_all_lockp函数的利用

## 利用条件

- 知道libc基地址

  > _IO_list_all 是作为全局变量储存在 libc.so 中的

## _IO_flush_all_lockp(libc 2.23)

> 三种情况下会被自动触发:
>
> 1. 当 libc 执行 abort 流程时
>
> 2. 当执行 exit 函数时
>
> 3. 当执行流从 main 函数返回时

### 获取fp

![image-20240328105659625](https://awaqwqa.github.io/img/io_file_study2/image-20240328105659625.png)

### 所有的文件流

> 我们主要的利用都是这里 所以重点分析这里

![image-20240328105736546](https://awaqwqa.github.io/img/io_file_study2/image-20240328105736546.png)

#### 条件

> 我们可以发现这里的条件主要是两部分 

```c
(fp->_mode <= 0 && fp->_IO_write_ptr > fp->_IO_write_base) ||  (_IO_vtable_offset(fp) == 0 && fp->_mode > 0 && (fp->_wide_data->_IO_write_ptr > fp->_wide_data->_IO_write_base))
```

- 第一部分

  - fp->_mode <= 0 表示文件不可写

  -  fp->_IO_write_ptr > fp->_IO_write_base  

    > 当数据写入缓冲区的时候 `IO_write_ptr`会逐渐增加 指向下一个可用的位置
    >
    > `IO_write_base  `是缓冲区起始位置

- 第二部分

  - _IO_vtable_offset(fp) == 0 虚表偏移量为0 也就是标准文件流
  - fp->_mode > 0  文件可写

  - (fp->_wide_data->_IO_write_ptr > fp->_wide_data->_IO_write_base) 宽字符数据的写入缓冲区中有待写入的数据

## libc2.24 防御机制

- 2.24之下多了 `IO_validate_vtable`和`_IO_vtable_check`两大函数

### IO_validate_vtable

> 这个函数主要是检测了你的vtable是否在合法区域范围之内（__libc_IO_vtables）

```c
// 验证虚表指针 如果验证失败则中止进程
static inline const struct _IO_jump_t *
IO_validate_vtable (const struct _IO_jump_t *vtable)
{
  /* Fast path: The vtable pointer is within the __libc_IO_vtables
     section.  */
   // 虚函数表指针在__libc_IO_vtables部分内
  uintptr_t section_length = __stop___libc_IO_vtables - __start___libc_IO_vtables;
  // 获取vtable
  const char *ptr = (const char *) vtable;
  // 查看offset是否在这个区间范围之内
  uintptr_t offset = ptr - __start___libc_IO_vtables;
  if (__glibc_unlikely (offset >= section_length))
    /* The vtable pointer is not in the expected section.  Use the
       slow path, which will terminate the process if necessary.  */
    _IO_vtable_check ();
  return vtable;
}

```

## libc2.24 IO_file利用

> 由于已经对vtable进行了限制 我们可以另外再想办法 比如对scanf等函数进行操作

### 小知识点

- _IO_buf_base 表示操作的起始地址
- _IO_buf_end 表示结束地址

### 对_IO_buf_base进行劫持

> 这里用wiki中提供的代码进行调试理解
>
> ```c
> #include "stdio.h"
> 
> char buf[100];
> 
> int main()
> {
>  char stack_buf[100];
>  scanf("%s",stack_buf);
>  scanf("%s",stack_buf);
> 
> }
> ```

- 没调用scanf之前

  ![image-20240421003231028](https://awaqwqa.github.io/img/io_file_study2/image-20240421003231028.png)

- 调用scanf后

  ![image-20240421154819197](https://awaqwqa.github.io/img/io_file_study2/image-20240421154819197.png)
  
  - 这样可能不方便观察 我们带符号打印一下
  
    ![image-20240421154901421](https://awaqwqa.github.io/img/io_file_study2/image-20240421154901421.png)
  
  - 可以发现`_IO_buf_base`和` _IO_buf_end`被赋值 分别是缓冲区chunk的开头和末尾 那么我们如果可以劫持这两个 修改这两个值就可以实现任意地址的修改



