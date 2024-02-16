# 深入学习堆结构

> 做hgame的时候 有点做不动heap的题 所以来学习一下基本功<br>学习文章:[【pwn】学pwn日记（堆结构学习）（随缘更新）_pwn 堆特性-CSDN博客](https://blog.csdn.net/woodwhale/article/details/119832041)

## 堆管理器

- 在linux中 堆管理器 由libc.so.6链接库实现
  - `brk`
  - `mmap`

- `brk`函数

  - 申请小的内存空间 从heap下方的data段 向上申请内存

- mmap函数

  - 一般申请较大的内存空间 从`shared libraries`里面开新的空间

  - 子线程只能用mmap函数

## 流程

- 用户使用`malloc`函数向堆管理器申请一块内存空间
- 堆管理器用`brk`或者`mmap`函数去获取内存

## chunk结构

- `完整的chunk` 一般是`prev_size` ,`size(含AMP)`,`fd`,` bk`,` fd`,_`nextsize`,`bk`,`_nextsize`这几个组成

  > 需要注意的是 prev_size有且仅当 上一个chunk处于free状态的时候来表示 上一个chunk的大小否则 就作为上一个chunk的一部分来存数据

  ![chunk_struct](https://awaqwqa.github.io/img/chunk/chunk.jpg)

- `alloced chunk`  由于是使用状态所以 在使用的就只有prev_size 和size两个部分

  ![alloced_chunk](https://awaqwqa.github.io/img/chunk/alloced_chunk.png)

- `free chunk`常见的就是携带fd 和bk 然后当p为0的时候 两个chunk会合并为一个较大的chunk
- `fast bin`的chunk
  - 保留最基本结构 最简单的结构 也就是	`prev_size`+`size`+`fd`+`data` 所以 fastbin最小结构为0x20 也就是`4`* `0x8`(64位)
- `top chunk` 也就是一个超大的chunk 用户申请内存的时候 会先搜索`bins` 然后再搜索`top chunk`实在不够才会去调用`brk`函数申请空间 然后再从`top chunk`中申请

## 申请内存的过程

> 这里原文章讲特别好 我直接copy了(虽然之前也是copy)

1. `申请内存`<64bytes 则从`tcachebin`(tcachebin 从glibc2.26引入),`fast bins`或者`smallbin`找
2. `申请内存` >64bytes 则从`unsorted bin`找
3. `unsorted bin`无和是bin则遍历`unsorted bin`合并`free chunk` 然后找 如果有合适的就直接给 否则将合并后的放入对应bin
4. 去`large bin`找
5. 向`top chunk`中找
6. `brk`函数申请 然后从`top chunk`中找
7. `mmap`函数 申请 然后从`top chunk`中找

- 当我们申请`0xn0`和`0xn8`内存大小的时候 系统其实给我们的是一样的chunk大小 因为我们可以利用下一面一个chunk的`prev_size`的空间 刚好0x8的空间(64位)

