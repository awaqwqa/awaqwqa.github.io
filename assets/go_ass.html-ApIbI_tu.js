import{_ as n}from"./plugin-vue_export-helper-x3n3nnut.js";import{o as s,c as i,e}from"./app-9CYERY7T.js";const a={},l=e(`<h1 id="cgo" tabindex="-1"><a class="header-anchor" href="#cgo" aria-hidden="true">#</a> CGO</h1><h2 id="汇编" tabindex="-1"><a class="header-anchor" href="#汇编" aria-hidden="true">#</a> 汇编</h2><blockquote><p>参考文章:https://mp.weixin.qq.com/s/YtTY23cWaE3M5ygAurj1Ig</p><p>GO语言的汇编并不是针对硬件框架的汇编,而是抽象出来的可移植汇编</p><p>使用的是<strong>GAS</strong>汇编,也就是(Gnu ASsembler) 可以通过</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code>go build <span class="token parameter variable">-gcflags</span> <span class="token string">&quot;-N -l -S&quot;</span> main.go <span class="token number">2</span> <span class="token operator">&gt;</span> main.s
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>实现生成对应汇编代码</p></blockquote><h3 id="基础语法" tabindex="-1"><a class="header-anchor" href="#基础语法" aria-hidden="true">#</a> 基础语法</h3><blockquote><p>大部分和平时接触的汇编是一样的,</p></blockquote><div class="language-go line-numbers-mode" data-ext="go"><pre class="language-go"><code>操作码   源操作数   目标操作数
MOVQ    $<span class="token number">10</span><span class="token punctuation">,</span>       AX      <span class="token comment">// 含义是：将 10 赋值给 AX 寄存器  </span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div></div></div><p>Go 汇编会在指令后加上 B , W , L 或 Q , 分别表示操作数的大小为1个，2个，4个或8个字节。</p><ul><li><p>MOVQ 数据传输</p></li><li><p>LEAQ 地址传输</p></li><li><p>PUSHQ</p></li><li><p>POPQ</p></li><li><p>....</p></li></ul><p><strong>源操作数表达</strong></p><ul><li>Symbol +offset(register) offset是相对于symbol的偏移</li></ul><p><strong>变量定义和声明</strong></p><p>其实主要是用<code>data</code>和<code>global</code>两个关键词 <code>SB</code>寄存器是全局静态基指针,用于声明函数,全局变量中</p><ul><li><p>Data 指定对应内存的值</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code>DATA symbol<span class="token operator">+</span><span class="token function">offset</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token operator">/</span>width<span class="token punctuation">,</span> value <span class="token comment">// symbol+offset 偏移量，width 宽度, value 初始值</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div></li><li><p>Global 声明一个变量对应的符号,变量对应内存大小</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code>GLOBL <span class="token function">symbol</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span> flag<span class="token punctuation">,</span> width  <span class="token comment">// 名为 symbol, 内存宽度为 width, flag可省略        </span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div></li></ul><p><strong>函数声明</strong></p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code>TEXT pkgname·<span class="token function">funcname</span><span class="token punctuation">(</span>SB<span class="token punctuation">)</span><span class="token punctuation">,</span>flag<span class="token punctuation">,</span>$<span class="token number">16</span><span class="token operator">-</span><span class="token number">24</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><ul><li>TEXT 代表函数的标识,告诉汇编器可以将数据放在TEXT区</li><li>Pkgname 也就是包名</li><li>Funcname 函数名字</li><li>flag代表有特殊功能</li><li>16代表函数栈帧大小,24表示入参和返回大小</li></ul><h2 id="c" tabindex="-1"><a class="header-anchor" href="#c" aria-hidden="true">#</a> C</h2><blockquote><p>go里面调用c函数,并不是直接调用的,而是通过生成go函数来间接调用c函数</p></blockquote><ul><li>首先是将c语言函数转化为**_Cfunc_xxxx**的go函数</li><li>然后**_Cfunc_xxxx<strong>会调用</strong>_cgo_runtime_cgocall**</li><li>然后**_cgo_runtime_cgocall<strong>再调用</strong>runtime.cgocall**</li><li><strong>runtime.cgocall</strong>会调用<strong>entersyscall</strong>函数</li><li>最后调用<strong>runtime.asmcgocall</strong></li></ul><p>也就是调用链:</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code>_Cfunc_xxx<span class="token operator">-&gt;</span>_cgo_runtime_cgocall<span class="token operator">-&gt;</span>runtime<span class="token punctuation">.</span>cgocallruntime<span class="token punctuation">.</span>entersyscall <span class="token operator">-&gt;</span> runtime<span class="token punctuation">.</span>asmcgocall 
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>在调用c函数的时候会创建一个 <strong>M</strong> 来运行 <strong>goroutine</strong> 并且标记<strong>M</strong>的<code>incgo</code>属性为true代表正在执行cgo</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>mp := getg().m
mp.ncgocall++
mp.ncgo++
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>然后调用<strong>asmcgocall</strong>就是核心了</p><h3 id="go的栈切换" tabindex="-1"><a class="header-anchor" href="#go的栈切换" aria-hidden="true">#</a> go的栈切换</h3><blockquote><p>参考文章:https://www.cnblogs.com/luozhiyun/p/14619585.html</p><p>https://segmentfault.com/a/1190000045073620</p><p>https://zhuanlan.zhihu.com/p/213745994</p><p>在分析asmcgocall之前,我们需要了解一下go语言是如何进行栈切换的,既然提到了栈就绕不开GMP模型.</p></blockquote><p><strong>M</strong>:线程 <strong>G</strong>:协程(goroutine) <strong>P</strong>:处理器</p><ul><li><p>G一般是由M进行调度的,所以正常情况一个M+G构成的消息队列就可以实现调度.</p></li><li><p>计算机一般是多核cpu,所以有多个M,<strong>想想多个线程M从全局可运行协程队列获取协程的时候，是不是需要加锁呢？而加锁意味着低效。<strong>从而引入了</strong>P</strong>(一般与cpu的数目一致)来管理一个协程队列</p></li><li><p><strong>P</strong>只能被一个M绑定,所以M通过P进行获取协程队列</p></li></ul><p>每个M都有一个调度协程<strong>g0</strong> ,<strong>g0</strong>不仅负责调度也负责创建,栈增长,垃圾收集,defer函数分配等工作,由于负责繁杂的工作,<strong>g0</strong>通常有着<strong>固定更大</strong>的栈,当然在这里我们更在意他的分配</p><ul><li>g0会获取一个可以运行的协程G <ul><li>优先从全局可运行协程队列中获取协程</li><li>每个<strong>P</strong>都有一个可运行的协程队列,直接从<strong>P</strong>获取可用协程</li><li>当<strong>P</strong>和全局都没有协程的时候,忙碌的<strong>g0</strong>师傅就会选择去<strong>偷</strong>了,此时<strong>g0</strong>会去其他的<strong>P</strong>那里偷协程</li></ul></li><li>然后切换到G的上下文上</li></ul><h3 id="asmcgocall" tabindex="-1"><a class="header-anchor" href="#asmcgocall" aria-hidden="true">#</a> asmcgocall</h3><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>// func asmcgocall(fn, arg unsafe.Pointer) int32
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
	CALL	gosave&lt;&gt;(SB)
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
	// 使用这段代码来为所有 &quot;已经在系统栈&quot; 的调用进行服务，从而保持正确性。
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
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,32),t=[l];function d(c,r){return s(),i("div",null,t)}const v=n(a,[["render",d],["__file","go_ass.html.vue"]]);export{v as default};
