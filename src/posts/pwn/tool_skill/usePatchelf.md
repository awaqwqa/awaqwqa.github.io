---
date: 2024-2-21
tag:
  - pwn
---
# 记一次patchelf的使用+浅理解ld和libc

> 每次去使用xclibc的时候 都不是特别好使hhh 所以就重新了解一下patchelf的使用<br>参考文章:[linux动态链接库的加载顺序_动态链接库顺序-CSDN博客](https://blog.csdn.net/byxdaz/article/details/89405588)和[man ld.so 的翻译_ld-linux.so的man手册-CSDN博客](https://blog.csdn.net/Longyu_wlz/article/details/108511931)获取程序寻找libc的顺序<br>[[转\] Linux下程序的加载、运行和终止流程 - JollyWing - 博客园 (cnblogs.com)](https://www.cnblogs.com/jiqingwu/p/linux_binary_load_and_run.html)获取linux加载程序的流程

## 程序寻找libc的顺序

> 这里主要是学习一下程序在查找libc的时候的顺序 方便我们理解我们`patchelf`要修改哪些东西

- 优先寻找`dt_runpath` 如果不存在`dt_runpath`再去寻找`dt_rpath`

  - `runpath`会ld忽略`ld_library_path`所以当程序由runpath后我们就算修改`ld_libary_path`也不会起效果

- 然后就是寻找`ld_libary_path`

  > 还有个和这个很相似的变量:`libray_path`这个变量是`程序编译期间`查找动态链接库时指定查找共享库的路径 也就是动态共享库的路径 所以说这个变量是开发的时候编译使用 为了让编译器能够找到对应的动态库<br>`ld_libary_path`程序`加载运行期间`查找动态链接库的路径（系统默认系统之前查找）

- 从路径:`/etc/ld.so.scache`中查找文件

- 从`/lib`寻找

- 从`/usr/lib`中寻找

## linux程序加载简化流程

- 执行`exec(3)`系统调用

- 陷入系统内核操作 由操作系统加载该文件 内存映射将文件加载到内存中

- 如果文件头中存在`pt_interp`那么就会将ld找到 并且映射进入内存 然后准备对应环境 将控制权移交给ld、

  - ld的作用

  1. **解析依赖**：动态链接器检查程序的头部，找出程序依赖的所有共享库。
  2. **加载共享库**：动态链接器查找这些共享库的位置，并将它们加载到内存中。
  3. **符号解析**：动态链接器解析程序中的符号引用，确保它们指向正确的地址。

## 查看程序当前信息

> 获取目前程序的ld和libc的路径信息

```shell
ldd file_name
```

- 可以得到libc.so.6的当前绑定地址
- ld当前绑定地址

```shell
ldd --version
```

- 可以查看当前`libc`和`ld`的版本

## 修改程序的`ld`和`libc`地址

- 修改`ld`的地址

```shell
patchelf --set-interpreter ld_addr file_name
```

- 修改libc的地址

  > 这里old_libc就是ldd查到的那个ld地址(==>之前)比如:libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 那么就是libc.so.6

```shell
patchelf --replace-needed old_libc new_libc file_name
```

- 修改Libc的地址(不太稳定)

```shell
patchelf --set-rpath new_rpath your_file
```

