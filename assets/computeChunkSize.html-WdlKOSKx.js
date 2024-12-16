import{_ as n}from"./plugin-vue_export-helper-x3n3nnut.js";import{o as s,c as a,e}from"./app-4DI25i_s.js";const t={},p=e(`<h1 id="写一个计算chunk大小的程序" tabindex="-1"><a class="header-anchor" href="#写一个计算chunk大小的程序" aria-hidden="true">#</a> 写一个计算chunk大小的程序</h1><blockquote><p>由于做题的时候老是脑子不够用 无法根据malloc(num)中的num获取chunk的size 所以我就决定自己写一个程序来完成这个工作并且好好理解一下怎么计算的</p></blockquote><h2 id="原理" tabindex="-1"><a class="header-anchor" href="#原理" aria-hidden="true">#</a> 原理</h2><ul><li><p>最小<code>chunk</code>为0x20</p></li><li><p><code>chunk</code>一定是<code>size_sz *2 </code>的倍数(内存对齐)</p></li><li><p><code>chunk</code>可以占用下一个<code>chunk</code>的<code>prev_size</code>来存东西</p></li><li><p>所以我们就是看是否malloc的大小 +<code>size</code>所占字节数 然后是否内存对齐 如果没有则加到对齐 然后 判断最后的size是否小于0x20 如果小于则直接等于0x20</p><blockquote><p>所以直接使用公式:(num + 8 +0xf)&amp;~0xf; 其中num就是我们malloc传的参数</p></blockquote></li></ul><h2 id="脚本" tabindex="-1"><a class="header-anchor" href="#脚本" aria-hidden="true">#</a> 脚本</h2><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">include</span> <span class="token string">&lt;stdio.h&gt;</span></span>
<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">include</span><span class="token string">&lt;stdlib.h&gt;</span></span>
<span class="token keyword">int</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
<span class="token punctuation">{</span>
    <span class="token keyword">while</span> <span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span>
    <span class="token punctuation">{</span>
        <span class="token keyword">int</span> num <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
        <span class="token keyword">int</span> size <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
        <span class="token keyword">int</span> num2 <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
        <span class="token function">printf</span><span class="token punctuation">(</span><span class="token string">&quot;malloc:&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token function">scanf</span><span class="token punctuation">(</span><span class="token string">&quot;%x&quot;</span><span class="token punctuation">,</span><span class="token operator">&amp;</span>num<span class="token punctuation">)</span><span class="token punctuation">;</span>
        size <span class="token operator">=</span> <span class="token punctuation">(</span>num <span class="token operator">+</span> <span class="token number">8</span> <span class="token operator">+</span><span class="token number">0xf</span><span class="token punctuation">)</span><span class="token operator">&amp;</span><span class="token operator">~</span><span class="token number">0xf</span><span class="token punctuation">;</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span>size <span class="token operator">&lt;</span> <span class="token number">0x20</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
            size <span class="token operator">=</span> <span class="token number">0x20</span><span class="token punctuation">;</span>
        <span class="token punctuation">}</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span>size <span class="token operator">-</span><span class="token number">16</span> <span class="token operator">&lt;</span> num<span class="token punctuation">)</span> <span class="token punctuation">{</span>
            <span class="token function">printf</span><span class="token punctuation">(</span><span class="token string">&quot;will take up prev_size of the next chunk\\n&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">}</span>
        <span class="token function">printf</span><span class="token punctuation">(</span><span class="token string">&quot;0x%x&quot;</span><span class="token punctuation">,</span>size<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token function">fflush</span><span class="token punctuation">(</span><span class="token constant">stdin</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token function">printf</span><span class="token punctuation">(</span><span class="token string">&quot;\\n&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token comment">/* code */</span>
    <span class="token punctuation">}</span>
    <span class="token keyword">return</span> <span class="token number">0</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,6),o=[p];function c(i,l){return s(),a("div",null,o)}const k=n(t,[["render",c],["__file","computeChunkSize.html.vue"]]);export{k as default};