import{_ as i}from"./plugin-vue_export-helper-x3n3nnut.js";import{r as d,o as r,c,a as e,b as n,d as a,e as s}from"./app-EAYxMfgl.js";const o={},t=s('<h1 id="ret2dl" tabindex="-1"><a class="header-anchor" href="#ret2dl" aria-hidden="true">#</a> ret2dl</h1><h2 id="部分前置知识讲解" tabindex="-1"><a class="header-anchor" href="#部分前置知识讲解" aria-hidden="true">#</a> 部分前置知识讲解</h2><h3 id="got表和plt表详细解说" tabindex="-1"><a class="header-anchor" href="#got表和plt表详细解说" aria-hidden="true">#</a> got表和plt表详细解说</h3>',3),u={href:"https://zhuanlan.zhihu.com/p/134105591",target:"_blank",rel:"noopener noreferrer"},p=e("br",null,null,-1),v=s(`<ul><li><p>运行PLT[1]</p><blockquote><p>由于我是是第一次的调用 所以GOT[3]的内容为:<code>PLT[1]</code>中<code>push reloc_arg;</code>指令的地址 也就是会执行<code>push reloc_arg </code>和<code>jmp plt[0]</code>自动跳转PLT[0]去完成绑定 并且 将reloc_arg参数作为参数<br>这里PLT[N]与GOT[2+N]一 一对应</p></blockquote><div class="language-assembly line-numbers-mode" data-ext="assembly"><pre class="language-assembly"><code>jmp [GOT[3]]; 
push reloc_arg;
jmp PLT[0];
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div></li><li><p>运行PLT[0]</p><blockquote><p>这里相当于<code>_dl_runtime_resolve(link_map,reloc_arg)</code></p></blockquote><div class="language-assembly line-numbers-mode" data-ext="assembly"><pre class="language-assembly"><code>push [GOT[1]]; // 1存的就是link_map 
jmp [GOT[2]]; // 2存的是_dl_runtime_resolve函数  

</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div></li><li><p>_dl_runtime_resolve函数</p><blockquote><p>这里写了一个大概的源码 方便我们了解 大概就是调用<code>_dl_fixup</code>然后这个函数将真实的地址返回给rax寄存器 最后我们jmp过去 实现函数调用</p></blockquote><div class="language-assembly line-numbers-mode" data-ext="assembly"><pre class="language-assembly"><code># _dl_runtime_resolve 示例 - x86_64 汇编
#
# 注意：这是一个简化的示例，用于说明目的。
# 实际实现会根据系统的动态链接器的具体需求和优化而有所不同。

.global _dl_runtime_resolve
.type _dl_runtime_resolve, @function

_dl_runtime_resolve:
    # 保存寄存器，因为这些寄存器会在 _dl_fixup 中被使用
    pushq %rax    # 保存原始的返回地址
    pushq %rcx    # 保存第一个参数
    pushq %rdx    # 保存第二个参数

    # 传递 _dl_runtime_resolve 的参数给 _dl_fixup
    # 第一个参数（通常是符号索引）在 %rdi 中
    # 第二个参数（返回地址）现在在栈顶
    movq (%rsp), %rsi  # 将返回地址移动到 %rsi

    # 调用 _dl_fixup 来解析符号地址
    # _dl_fixup(符号索引, 返回地址)
    call _dl_fixup

    # _dl_fixup 返回解析后的函数地址在 %rax 中

    # 恢复寄存器
    popq %rdx     # 恢复第二个参数
    popq %rcx     # 恢复第一个参数
    popq %rax     # 恢复原始的返回地址

    # 使用解析后的地址跳转执行目标函数
    # 这里我们假设解析后的地址已经由 _dl_fixup 放入 %rax 中
    jmp *%rax

# _dl_fixup 函数的伪声明，需要实际实现
.type _dl_fixup, @function
_dl_fixup:
    # 实际的 _dl_fixup 实现会在这里
    ret
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div></li></ul><h3 id="dl-runtime-resolve部分详细解说" tabindex="-1"><a class="header-anchor" href="#dl-runtime-resolve部分详细解说" aria-hidden="true">#</a> _dl_runtime_resolve部分详细解说</h3>`,2),m={href:"https://www.cnblogs.com/unr4v31/p/15168342.html",target:"_blank",rel:"noopener noreferrer"},_=s(`<div class="language-assembly line-numbers-mode" data-ext="assembly"><pre class="language-assembly"><code>_dl_runtime_resolve(link_map_obj, reloc_index)
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><h4 id="reloc-index" tabindex="-1"><a class="header-anchor" href="#reloc-index" aria-hidden="true">#</a> reloc_index</h4><blockquote><p>省略点将 我们可以通过reloc_index知道我们要绑定函数的名字 其获取逻辑是:<br></p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code>elf_rel <span class="token operator">=</span> rel_plt<span class="token punctuation">[</span>reloc_index<span class="token punctuation">]</span><span class="token punctuation">;</span>
r_info <span class="token operator">=</span> elf_rel<span class="token punctuation">.</span>r_info<span class="token punctuation">;</span>
elf_sym <span class="token operator">=</span> <span class="token operator">*</span><span class="token punctuation">(</span>r_info<span class="token punctuation">)</span><span class="token punctuation">;</span>
st_name <span class="token operator">=</span> elf<span class="token punctuation">.</span>sym<span class="token punctuation">.</span>st_name<span class="token punctuation">;</span>
<span class="token comment">// 这里的function_name就是我们需要的函数名了</span>
function_name <span class="token operator">=</span> dynstr<span class="token punctuation">[</span>st_name<span class="token punctuation">]</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div></blockquote><ul><li>这个参数 可以粗俗得当作一个属于.rel.plt这个数组的下标 就像是: <code>.rel.plt[reloc_index]</code></li></ul><div class="language-go line-numbers-mode" data-ext="go"><pre class="language-go"><code><span class="token keyword">type</span> ELF_Rel <span class="token keyword">struct</span> <span class="token punctuation">{</span>
    r_offset <span class="token builtin">int64</span>
    r_info 	<span class="token builtin">int</span>
<span class="token punctuation">}</span>
rel<span class="token punctuation">.</span>plt <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token punctuation">]</span>Elf_Rel<span class="token punctuation">{</span><span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><p><code>r_offset</code>: 存储 我们需要修改的plt条目的位置 相当于是告诉我们<code>PLT[N]</code>中的这个N 但是其实这里r_offset是一个绝对地址 相当于:<code>&amp;PLT[N]</code></p></li><li><p><code>r_info</code>高位3字节 用来表示 <code>.dynsym</code>这个数组的下标 也就是<code>.dynsym[r_info]</code></p></li><li><p>然后<code>.dynsym[r_info].st_name</code>获取我们需要的函数名字在.dynstr数组中的下标 然后我们就可以通过.dynstr[st_name]来获取名字了</p></li><li><p>所以总结一下:</p><ul><li><code>.dynstr</code>存函数名字</li><li><code>.dynsym</code>存函数名字在<code>.dynstr</code>中的位置</li><li><code>.rel_plt</code>存我们需要<code>.dynsym</code>中哪个结构体 方便我们取出名字</li></ul></li></ul>`,6);function b(h,k){const l=d("ExternalLinkIcon");return r(),c("div",null,[t,e("blockquote",null,[e("p",null,[n("这里我们不对plt和got表内详细内容进行介绍了 需要了解的参考这个文章:"),e("a",u,[n("深入窥探动态链接 - 知乎 (zhihu.com)"),a(l)]),p,n("我们主要探讨在第一次数据绑定的时候 我们程序究竟是怎么运行的 我们假设我们的函数在plt[1]的地方")])]),v,e("blockquote",null,[e("p",null,[n("参考文章:"),e("a",m,[n("深入理解-dl_runtime_resolve - unr4v31 - 博客园 (cnblogs.com)"),a(l)])])]),_])}const g=i(o,[["render",b],["__file","ret2dl.html.vue"]]);export{g as default};
