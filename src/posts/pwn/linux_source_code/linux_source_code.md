---
date: 2024-2-26
tag:
  - pwn
  - linux
---
# linux源码阅读(1)

> 阅读 《linux源码趣读》读书笔记 仅仅作为个人回顾使用

## 最开始的两行代码

- cpu开机后初始化指向BIOS
- BIOS将硬盘启动区中`512B`内容写入内存0x7c00位置
- 并跳转到0x7c00位置

- 然后执行代码

  ```assembly
  mov ax,0x07c0;
  mov ds,ax
  ```

### 解释

- cpu中`pc寄存器`初始值为`0xFFFF0`然后刚好指向`ROM(BIOS)`

  ![rom](https://awaqwqa.github.io/img/linux/内存.png)

- 这里ds也就是段基地址寄存器
  - 所以`mov ax,[0x0001];`也就相当于`mov ax,[ds:0x0001];`

## 0x7c00到0x90000

```assembly
mov ax,0x07c0
mov ds,ax

mov ax,0x9000
mov es,ax

mov cx,#256

sub si,si
sub di,di

rep movw

jmpi go,0x9000
go:
	mov ax,cs
	mov ds,ax
```

- 在`rep movw`这个操作之前就是完成

  ```assembly
  ds:0x07c0
  es:0x9000
  cs:256
  si:0
  di:0
  ```

- 然后`rep movw`这个操作就是重复执行movw 
  - `movw`就是将`ds:si`复制到`es:di`位置去 所以就是0x7c00移动到0x90000位置去
  - 每次移动两字节(w)
  - 移动cs寄存器存的数据下:256下
  - 所以就是将0x7c00往后512b的内容移动到0x90000去

- `jmpi`后就是跳转到`go+0x90000`(这里是0x90000而不是0x9000)

  - x86为了让自己在16位这个实模式(Real Mode)下能访问到20位的地址线 所以段基址要先左移4位

  > 因为x86下的cpu寄存器就是16位 但是我们访问的内存高达20位所以我们采用ds寄存器+便宜的位置完成剩下4位的补充 所以我们需要ds的值左移4位<br>当今的64位操作系统是没有这个东西的 因为我们用的是`平坦模式(Flat Model)`