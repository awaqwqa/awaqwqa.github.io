import{_ as e}from"./plugin-vue_export-helper-x3n3nnut.js";import{o as i,c as d,e as l}from"./app-yGaGogkD.js";const s={},a=l(`<h1 id="linux源码阅读-1" tabindex="-1"><a class="header-anchor" href="#linux源码阅读-1" aria-hidden="true">#</a> linux源码阅读(1)</h1><blockquote><p>阅读 《linux源码趣读》读书笔记 仅仅作为个人回顾使用</p></blockquote><h2 id="最开始的两行代码" tabindex="-1"><a class="header-anchor" href="#最开始的两行代码" aria-hidden="true">#</a> 最开始的两行代码</h2><ul><li><p>cpu开机后初始化指向BIOS</p></li><li><p>BIOS将硬盘启动区中<code>512B</code>内容写入内存0x7c00位置</p></li><li><p>并跳转到0x7c00位置</p></li><li><p>然后执行代码</p><div class="language-assembly line-numbers-mode" data-ext="assembly"><pre class="language-assembly"><code>mov ax,0x07c0;
mov ds,ax
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div></div></div></li></ul><h3 id="解释" tabindex="-1"><a class="header-anchor" href="#解释" aria-hidden="true">#</a> 解释</h3><ul><li><p>cpu中<code>pc寄存器</code>初始值为<code>0xFFFF0</code>然后刚好指向<code>ROM(BIOS)</code></p><figure><img src="https://awaqwqa.github.io/img/linux/内存.png" alt="rom" tabindex="0" loading="lazy"><figcaption>rom</figcaption></figure></li><li><p>这里ds也就是段基地址寄存器</p><ul><li>所以<code>mov ax,[0x0001];</code>也就相当于<code>mov ax,[ds:0x0001];</code></li></ul></li></ul><h2 id="_0x7c00到0x90000" tabindex="-1"><a class="header-anchor" href="#_0x7c00到0x90000" aria-hidden="true">#</a> 0x7c00到0x90000</h2><div class="language-assembly line-numbers-mode" data-ext="assembly"><pre class="language-assembly"><code>mov ax,0x07c0
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
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><p>在<code>rep movw</code>这个操作之前就是完成</p><div class="language-assembly line-numbers-mode" data-ext="assembly"><pre class="language-assembly"><code>ds:0x07c0
es:0x9000
cs:256
si:0
di:0
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div></li><li><p>然后<code>rep movw</code>这个操作就是重复执行movw</p><ul><li><code>movw</code>就是将<code>ds:si</code>复制到<code>es:di</code>位置去 所以就是0x7c00移动到0x90000位置去</li><li>每次移动两字节(w)</li><li>移动cs寄存器存的数据下:256下</li><li>所以就是将0x7c00往后512b的内容移动到0x90000去</li></ul></li><li><p><code>jmpi</code>后就是跳转到<code>go+0x90000</code>(这里是0x90000而不是0x9000)</p><ul><li>x86为了让自己在16位这个实模式(Real Mode)下能访问到20位的地址线 所以段基址要先左移4位</li></ul><blockquote><p>因为x86下的cpu寄存器就是16位 但是我们访问的内存高达20位所以我们采用ds寄存器+便宜的位置完成剩下4位的补充 所以我们需要ds的值左移4位<br>当今的64位操作系统是没有这个东西的 因为我们用的是<code>平坦模式(Flat Model)</code></p></blockquote></li></ul>`,9),n=[a];function c(o,r){return i(),d("div",null,n)}const m=e(s,[["render",c],["__file","linux_source_code.html.vue"]]);export{m as default};
