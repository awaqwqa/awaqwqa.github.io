import{_ as d}from"./plugin-vue_export-helper-x3n3nnut.js";import{r as i,o as l,c as n,a as e,b as c,d as a,e as t}from"./app-7uKWKdx5.js";const r={},h=e("h1",{id:"深入学习堆结构",tabindex:"-1"},[e("a",{class:"header-anchor",href:"#深入学习堆结构","aria-hidden":"true"},"#"),c(" 深入学习堆结构")],-1),u=e("br",null,null,-1),s={href:"https://blog.csdn.net/woodwhale/article/details/119832041",target:"_blank",rel:"noopener noreferrer"},p=t('<h2 id="堆管理器" tabindex="-1"><a class="header-anchor" href="#堆管理器" aria-hidden="true">#</a> 堆管理器</h2><ul><li><p>在linux中 堆管理器 由libc.so.6链接库实现</p><ul><li><code>brk</code></li><li><code>mmap</code></li></ul></li><li><p><code>brk</code>函数</p><ul><li>申请小的内存空间 从heap下方的data段 向上申请内存</li></ul></li><li><p>mmap函数</p><ul><li><p>一般申请较大的内存空间 从<code>shared libraries</code>里面开新的空间</p></li><li><p>子线程只能用mmap函数</p></li></ul></li></ul><h2 id="流程" tabindex="-1"><a class="header-anchor" href="#流程" aria-hidden="true">#</a> 流程</h2><ul><li>用户使用<code>malloc</code>函数向堆管理器申请一块内存空间</li><li>堆管理器用<code>brk</code>或者<code>mmap</code>函数去获取内存</li></ul><h2 id="chunk结构" tabindex="-1"><a class="header-anchor" href="#chunk结构" aria-hidden="true">#</a> chunk结构</h2><ul><li><p><code>完整的chunk</code> 一般是<code>prev_size</code> ,<code>size(含AMP)</code>,<code>fd</code>,<code> bk</code>,<code> fd</code>,_<code>nextsize</code>,<code>bk</code>,<code>_nextsize</code>这几个组成</p><blockquote><p>需要注意的是 prev_size有且仅当 上一个chunk处于free状态的时候来表示 上一个chunk的大小否则 就作为上一个chunk的一部分来存数据</p></blockquote><figure><img src="https://awaqwqa.github.io/img/chunk/chunk.jpg" alt="chunk_struct" tabindex="0" loading="lazy"><figcaption>chunk_struct</figcaption></figure></li><li><p><code>alloced chunk</code> 由于是使用状态所以 在使用的就只有prev_size 和size两个部分</p><figure><img src="https://awaqwqa.github.io/img/chunk/alloced_chunk.png" alt="alloced_chunk" tabindex="0" loading="lazy"><figcaption>alloced_chunk</figcaption></figure></li><li><p><code>free chunk</code>常见的就是携带fd 和bk 然后当p为0的时候 两个chunk会合并为一个较大的chunk</p></li><li><p><code>fast bin</code>的chunk</p><ul><li>保留最基本结构 最简单的结构 也就是 <code>prev_size</code>+<code>size</code>+<code>fd</code>+<code>data</code> 所以 fastbin最小结构为0x20 也就是<code>4</code>* <code>0x8</code>(64位)</li></ul></li><li><p><code>top chunk</code> 也就是一个超大的chunk 用户申请内存的时候 会先搜索<code>bins</code> 然后再搜索<code>top chunk</code>实在不够才会去调用<code>brk</code>函数申请空间 然后再从<code>top chunk</code>中申请</p></li></ul><h2 id="申请内存的过程" tabindex="-1"><a class="header-anchor" href="#申请内存的过程" aria-hidden="true">#</a> 申请内存的过程</h2><blockquote><p>这里原文章讲特别好 我直接copy了(虽然之前也是copy)</p></blockquote><ol><li><code>申请内存</code>&lt;64bytes 则从<code>tcachebin</code>(tcachebin 从glibc2.26引入),<code>fast bins</code>或者<code>smallbin</code>找</li><li><code>申请内存</code> &gt;64bytes 则从<code>unsorted bin</code>找</li><li><code>unsorted bin</code>无和是bin则遍历<code>unsorted bin</code>合并<code>free chunk</code> 然后找 如果有合适的就直接给 否则将合并后的放入对应bin</li><li>去<code>large bin</code>找</li><li>向<code>top chunk</code>中找</li><li><code>brk</code>函数申请 然后从<code>top chunk</code>中找</li><li><code>mmap</code>函数 申请 然后从<code>top chunk</code>中找</li></ol><ul><li>当我们申请<code>0xn0</code>和<code>0xn8</code>内存大小的时候 系统其实给我们的是一样的chunk大小 因为我们可以利用下一面一个chunk的<code>prev_size</code>的空间 刚好0x8的空间(64位)</li></ul>',10);function k(b,_){const o=i("ExternalLinkIcon");return l(),n("div",null,[h,e("blockquote",null,[e("p",null,[c("做hgame的时候 有点做不动heap的题 所以来学习一下基本功"),u,c("学习文章:"),e("a",s,[c("【pwn】学pwn日记（堆结构学习）（随缘更新）_pwn 堆特性-CSDN博客"),a(o)])])]),p])}const g=d(r,[["render",k],["__file","studyHeap.html.vue"]]);export{g as default};