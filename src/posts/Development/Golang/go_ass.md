---
date: 2024-10-12
tag:
  - golang
  - cgo
---

# CGO

## 汇编

> 参考文章:https://mp.weixin.qq.com/s/YtTY23cWaE3M5ygAurj1Ig
>
> GO语言的汇编并不是针对硬件框架的汇编,而是抽象出来的可移植汇编
>
> 使用的是**GAS**汇编,也就是(Gnu ASsembler) 可以通过
>
> ```shell
> go build -gcflags "-N -l -S" main.go 2 > main.s
> ```
>
> 实现生成对应汇编代码

### 基础语法

> 大部分和平时接触的汇编是一样的,

```go
操作码   源操作数   目标操作数
MOVQ    $10,       AX      // 含义是：将 10 赋值给 AX 寄存器  
```

Go 汇编会在指令后加上 B , W , L 或 Q , 分别表示操作数的大小为1个，2个，4个或8个字节。

- MOVQ 数据传输
- LEAQ 地址传输
- PUSHQ 
- POPQ

- ....

**源操作数表达**

- Symbol +offset(register) offset是相对于symbol的偏移

**变量定义和声明**

其实主要是用`data`和`global`两个关键词 `SB`寄存器是全局静态基指针,用于声明函数,全局变量中

- Data 指定对应内存的值

  ```c
  DATA symbol+offset(SB)/width, value // symbol+offset 偏移量，width 宽度, value 初始值
  ```

- Global 声明一个变量对应的符号,变量对应内存大小

  ```c
  GLOBL symbol(SB), flag, width  // 名为 symbol, 内存宽度为 width, flag可省略        
  ```

**函数声明**

```c
TEXT pkgname·funcname(SB),flag,$16-24
```

- TEXT 代表函数的标识,告诉汇编器可以将数据放在TEXT区
- Pkgname 也就是包名
- Funcname 函数名字
- flag代表有特殊功能
- 16代表函数栈帧大小,24表示入参和返回大小

## C

> go里面调用c函数,并不是直接调用的,而是通过生成go函数来间接调用c函数

- 首先是将c语言函数转化为**_Cfunc_xxxx**的go函数
- 然后**_Cfunc_xxxx**会调用**_cgo_runtime_cgocall**
- 然后**_cgo_runtime_cgocall**再调用**runtime.cgocall**
- **runtime.cgocall**会调用**entersyscall**函数
- 最后调用**runtime.asmcgocall**

也就是调用链:

```c
_Cfunc_xxx->_cgo_runtime_cgocall->runtime.cgocallruntime.entersyscall -> runtime.asmcgocall 
```

在调用c函数的时候会创建一个 **M** 来运行 **goroutine**  并且标记**M**的`incgo`属性为true代表正在执行cgo

```
mp := getg().m
mp.ncgocall++
mp.ncgo++
```

然后调用**asmcgocall**就是核心了

### go的栈切换

> 参考文章:https://www.cnblogs.com/luozhiyun/p/14619585.html
>
> https://segmentfault.com/a/1190000045073620
>
> https://zhuanlan.zhihu.com/p/213745994
>
> 在分析asmcgocall之前,我们需要了解一下go语言是如何进行栈切换的,既然提到了栈就绕不开GMP模型.

**M**:线程  **G**:协程(goroutine) **P**:处理器

- G一般是由M进行调度的,所以正常情况一个M+G构成的消息队列就可以实现调度. 

- 计算机一般是多核cpu,所以有多个M,**想想多个线程M从全局可运行协程队列获取协程的时候，是不是需要加锁呢？而加锁意味着低效。**从而引入了**P**(一般与cpu的数目一致)来管理一个协程队列

- **P**只能被一个M绑定,所以M通过P进行获取协程队列

每个M都有一个调度协程**g0** ,**g0**不仅负责调度也负责创建,栈增长,垃圾收集,defer函数分配等工作,由于负责繁杂的工作,**g0**通常有着**固定更大**的栈,当然在这里我们更在意他的分配

- g0会获取一个可以运行的协程G
  - 优先从全局可运行协程队列中获取协程
  - 每个**P**都有一个可运行的协程队列,直接从**P**获取可用协程
  - 当**P**和全局都没有协程的时候,忙碌的**g0**师傅就会选择去**偷**了,此时**g0**会去其他的**P**那里偷协程
- 然后切换到G的上下文上

### asmcgocall

```
// func asmcgocall(fn, arg unsafe.Pointer) int32
// 在调度器栈上调用 fn(arg), 已为 gcc ABI 对齐，见 cgocall.go
TEXT ·asmcgocall(SB),NOSPLIT,$0-20
	MOVQ	fn+0(FP), AX
	MOVQ	arg+8(FP), BX

	MOVQ	SP, DX
	// get_tls(CX) 获取TLS(线程局部存储)的goroutine指针
	get_tls(CX)
	// 将goroutine发送给R8寄存器
	MOVQ	g(CX), R8
	// 检查goroutine指针是否存在	
	CMPQ	R8, $0
	JEQ	nosave
	// 有goroutine指针则继续执行
	// 将g_m发送给r8 (M)
	MOVQ	g_m(R8), R8
	// g0 发送给si (g0)
	MOVQ	m_g0(R8), SI
	// g发送给di （G）
	MOVQ	g(CX), DI
	// 比较g0是否等于当前的g
	CMPQ	SI, DI
	// 如果等于则条转
	JEQ	nosave
	// 获取g0发送给si
	MOVQ	m_gsignal(R8), SI
	CMPQ	SI, DI
	JEQ	nosave
	
	// g0发送给si
	MOVQ	m_g0(R8), SI
	// 保存goroutine的状态
	CALL	gosave<>(SB)
	// 将g0换成当前的栈
	MOVQ	SI, g(CX)
	// g0的sched+gobuf(用于保存goroutine信息)的sp给sp
	MOVQ	(g_sched+gobuf_sp)(SI), SP

	// 于调度栈中（pthread 新创建的栈）
	// 确保有足够的空间给四个 stack-based fast-call 寄存器
	// 为使得 windows amd64 调用服务
	// 开辟64空间
	SUBQ	$64, SP
	ANDQ	$~15, SP	// 为 gcc ABI 对齐
	// 将原本的g放在48位置
	MOVQ	DI, 48(SP)	// 保存 g
	// 将原本的栈顶发送给DI
	MOVQ	(g_stack+stack_hi)(DI), DI
	SUBQ	DX, DI
	MOVQ	DI, 40(SP)	// 保存栈深 (不能仅保存 SP, 因为栈可能在回调时被复制)
	MOVQ	BX, DI		// DI = AMD64 ABI 第一个参数
	MOVQ	BX, CX		// CX = Win64 第一个参数
	CALL	AX		// 调用 fn

	// 恢复寄存器、 g、栈指针
	get_tls(CX)
	MOVQ	48(SP), DI
	MOVQ	(g_stack+stack_hi)(DI), SI
	SUBQ	40(SP), SI
	MOVQ	DI, g(CX)
	MOVQ	SI, SP

	MOVL	AX, ret+16(FP)
	RET

nosave:
	// 在系统栈上运行，可能没有 g
	// 没有 g 的情况发生在线程创建中或线程结束中（比如 Solaris 平台上的 needm/dropm）
	// 这段代码和上面类似，但没有保存和恢复 g，且没有考虑栈的移动问题（因为我们在系统栈上，而非 goroutine 栈）
	// 如果已经在系统栈上，则上面的代码可被直接使用，但而后进入这段代码的情况非常少见的 Solaris 上。
	// 使用这段代码来为所有 "已经在系统栈" 的调用进行服务，从而保持正确性。
	SUBQ	$64, SP
	ANDQ	$~15, SP	// ABI 对齐
	MOVQ	$0, 48(SP)	// 上面的代码保存了 g, 确保 debug 时可用
	MOVQ	DX, 40(SP)	// 保存原始的栈指针
	MOVQ	BX, DI		// DI = AMD64 ABI 第一个参数
	MOVQ	BX, CX		// CX = Win64 第一个参数
	CALL	AX
	MOVQ	40(SP), SI	// 恢复原来的栈指针
	MOVQ	SI, SP
	MOVL	AX, ret+16(FP)
	RET
```

