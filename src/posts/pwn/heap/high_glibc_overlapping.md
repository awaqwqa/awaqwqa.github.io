---
date : 2024-3-17
tag :
  - pwn
  - heap
---

# 记一次高版本glibc(2.34)下常规overlapping失败的原因（vctf 2024 apples）

> 昨天做vctf被打自闭了 由于对glibc高版本的保护不熟悉 第二题apples 连leak libc都没实现
>
>  这里记录一下为什么常规overlapping会失效

## 版本

- glibc 2.34
- off_by_one漏洞

## 读题

- 首先是add user部分 存在off_by_one漏洞

  ![image-20240317100413787](https://awaqwqa.github.io/img/high_glibc_overlapping/image-20240317100413787.png)

- delete部分无懈可击()

  ![img](https://awaqwqa.github.io/img/high_glibc_overlapping/def73b9b58504d503336012d80f05fd4.png)

## 错误思路

由于前段时间做了hgame的week3的一道overlapping 所以我就自然想到了这题先利用overlapping leak出来我们的libc地址

- 大概思路就是:

  - 先malloc 11个（第十一个防止合并）chunk 然后free 7个chunk 占满tacache 

  - 然后free 第9chunk malloc回来 写入刚好size大小的数据（并且构造好prev_size） 让0溢出到 第10个chunk上
  - 最后我们free 第10个chunk 就可以利用合并机制 将fd和bk包含在这个大chunk中 再利用分割机制就可以泄露libc

- 简化后的流程图就是:

  ![img](https://awaqwqa.github.io/img/high_glibc_overlapping/img.png)

## 失败原因

> 主要是glibc在高版本下的安全检查机制

- 合并时对prev_chunk的size检查

  > 我们可以明显发现 这里多了一条if检查语句 用于检查计算prev_size得出的chunk的size大小是否等于我们的prev_size大小 这样就阻止了我们跨chunk进行合并 

  - glic-2.27下

    ![image-20240317101747206](https://awaqwqa.github.io/img/high_glibc_overlapping/image-20240317101747206.png)

  - glibc-2.34下

    ![image-20240317101823846](https://awaqwqa.github.io/img/high_glibc_overlapping/image-20240317101823846.png)

