# One_byte_ROP

## 题目

```c
void __noreturn sub_11A9()
{
  char v0; // [rsp+Fh] [rbp-11h] BYREF
  void *buf; // [rsp+10h] [rbp-10h] BYREF
  unsigned __int64 v2; // [rsp+18h] [rbp-8h]

  v2 = __readfsqword(0x28u);
  if ( !ptr )
    ptr = malloc(0x40000uLL);
  v0 = 0;
  buf = 0LL;
  read(0, &buf, 8uLL);
  read(0, &v0, 1uLL);
  *((_BYTE *)buf + (_QWORD)ptr) = v0;
  write(1, "HELLO WORLD", 0xCuLL);
  _Exit(0);
}
```

## 核心原理

> [Loora1N's Blog | 鹭雨 |](https://loora1n.github.io/2023/09/07/【trick】house of blindness/)参考文章

- ld 和libc加载到内存中的相对偏移是固定的
- malloc一个较大的chunk的时候 不是通过brk申请的而是通过mmap申请的
  - 所有的mmap地址是相邻近的

- 主要是研究_dl_fini 函数 也就是`house of blindness`

- exit会调用dl_fini函数，

  ```c
  extern void __run_exit_handlers (int status,
  				 struct exit_function_list **listp,
  				 bool run_list_atexit, bool run_dtors)
    attribute_hidden __attribute__ ((__noreturn__));
  ```

  

## _dl_fini函数

- 核心利用

  ```c
  # define DL_CALL_DT_FINI(map, start) ((fini_t) (start)) ()
  DL_CALL_DT_FINI
          (l, l->l_addr + l->l_info[DT_FINI]->d_un.d_ptr);
  
  ```

  - l为在ld中存放的link_map结构
  - 而`l_addr`和`l_info[DT_FINI]`正对应这我们前面谈到的codebase和.dynamic节上的偏移

## house of blindness

