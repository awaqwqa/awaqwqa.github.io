---
date: 2024-01-01
tag:
  - pwn
---

## 8byte（简单栈迁移）

## 栈迁移

> 这里好好学一下栈迁移这个知识点 确实重要 因为已经遇到了很多次了

### 栈迁移的大致操作

- 通过将`ebp`覆盖成构造的`fake_ebp` ，再利用`leave_ret`这个`gadget`将`esp`劫持到`fake_ebp`的地址上。

> 这里写个小插曲 因为大多数时候我都是去ida直接找的这个gadget 但是好像可以用命令行来解决这个问题<br>比如我们这里用指令
>
> ```shell
> $ ROPgadget --binary pwn --only "leave|ret"
> ```

### 栈迁移核心

> 因为我们常使用leave_ret gadget链来实现

- ` leave`指令

  - 首先是依靠这个指令来实现把`rbp`寄存器值变为我们希望的一个地址 这样就可以实现栈的移动

    > 这里说一下我自己的浅薄理解 因为我们使用的栈其实本质就是基于rbp/rsp定位的 所以我们只需要把寄存器的值改变就实现了`栈迁移` 新的fake 地址后面的内容会被当成栈

  - 那么这个指令的本质:

    ```assembly
    mov esp,ebp;
    pop ebp;
    ```

- `ret` 指令

  ```assembly
  pop eip
  ```

  

- 那么下面是实现原理图

  ![原理](https://awaqwqa.github.io/img/栈迁移/原理.png)

  - 这里是执行`mov esp ,ebp;`这个操作之前的栈结构 我们在`ebp`这个位置放入我们我们希望这个栈最终`落脚点` 然后就会执行

  - ​	![原理2](https://awaqwqa.github.io/img/栈迁移/原理2.png)

  - 这里就是`pop ebp;`这个操作 因为 pop操作我们的rsp向下移动一格 ebp寄存器 存入fake_ebp1_addr

  - 然后执行指令`ret--> pop eip;` 这个指令 那么同理 rsp向下移动一格 eip存入我们的read_plt 

    > 这里需要注意eip这个寄存器很特殊 这个寄存器是存入的我们下一条执行的指令地址 所以当执行完ret后整个程序流程就跑到了read_plt这里 

- 那么 到现在我们就可以理清楚了核心需要实现的部分:

  - 将rbp寄存器改值 ---- >栈迁移
  - 将rip寄存器改值 ------ >劫持程序流程

  > 换句话说 我们只要能够实现这两个部分就可以了

- 接下来我们需要理解 栈的指针寄存器:`rsp` 还任然留在了原地 以及最容易理解错的是 当我们执行read函数的时候 程序会自动保存下一个指令的地址 这是`函数的调用约定`所以当我们执行完后read函数后 我们来到了leave_ret指令的地方 

  - 此时我们`rsp = rbp` 那么我们的rsp也成功完成了迁移工作 来到了 fake_ebp的地方

  - 然后 把fake_ebp2的地址给了rbp rsp向下跑一下 

  - ![原理3](https://awaqwqa.github.io/img/栈迁移/原理3.png)

    > 所以这里我们是需要构造第二个fake_ebp的 

    - 然后我们就成功完成了一次栈迁移