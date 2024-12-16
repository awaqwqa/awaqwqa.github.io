import{_ as p}from"./plugin-vue_export-helper-x3n3nnut.js";import{r as t,o,c,a as n,b as s,d as e,e as l}from"./app-4DI25i_s.js";const i={},u=n("h1",{id:"php-pwn学习",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#php-pwn学习","aria-hidden":"true"},"#"),s(" php pwn学习")],-1),r={href:"https://deepunk.icu/php-pwn/",target:"_blank",rel:"noopener noreferrer"},k={href:"https://www.bookstack.cn/read/php7-internal/5-zend_alloc.md",target:"_blank",rel:"noopener noreferrer"},d=n("h2",{id:"php扩展学习",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#php扩展学习","aria-hidden":"true"},"#"),s(" php扩展学习")],-1),m=n("p",null,"参考文章:[PHP pwn环境搭建+so文件的调试 | Pwn进你的心 (ywhkkx.github.io)](https://ywhkkx.github.io/2022/07/06/PHP pwn环境搭建+so文件的调试/)",-1),_={href:"https://www.bookstack.cn/read/php7-internal/7-implement.md",target:"_blank",rel:"noopener noreferrer"},v=l(`<h2 id="heap相关学习" tabindex="-1"><a class="header-anchor" href="#heap相关学习" aria-hidden="true">#</a> heap相关学习</h2><p>zend_alloc</p><ul><li><p>分为三种大小</p><ul><li>zend_mm_alloc_small (小于3/4的2mb) <ul><li>内存中提前分配了30相同大小的内存slot 分配在不同的page上</li><li>如果大小合适会直接从这三十个slot中分配</li></ul></li><li>zend_mm_alloc_large (大于2mb小于4k)</li><li>zend_mm_alloc_huge (小于2mb) <ul><li>单链表</li><li>实际通过<code>zend_mm_chunk_alloc</code>分配</li></ul></li></ul></li><li><p>一个chunk 2mb 包含512 page</p></li><li><p>除了huge chunk chunk中第一页有这个结构体记录chunk的信息</p></li><li><p>_zend_mm_heap是内存池的一个结构 用于管理small large huge的分配</p></li></ul><blockquote><p>Zend中只有一个heap结构。</p></blockquote><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token keyword">struct</span> <span class="token class-name">_zend_mm_heap</span> <span class="token punctuation">{</span>
<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">if</span> <span class="token expression">ZEND_MM_STAT</span></span>
    <span class="token class-name">size_t</span>             size<span class="token punctuation">;</span> <span class="token comment">//当前已用内存数</span>
    <span class="token class-name">size_t</span>             peak<span class="token punctuation">;</span> <span class="token comment">//内存单次申请的峰值</span>
<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">endif</span></span>
    zend_mm_free_slot <span class="token operator">*</span>free_slot<span class="token punctuation">[</span>ZEND_MM_BINS<span class="token punctuation">]</span><span class="token punctuation">;</span> <span class="token comment">// 小内存分配的可用位置链表，ZEND_MM_BINS等于30，即此数组表示的是各种大小内存对应的链表头部</span>
    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
    zend_mm_huge_list <span class="token operator">*</span>huge_list<span class="token punctuation">;</span>               <span class="token comment">//大内存链表</span>
    zend_mm_chunk     <span class="token operator">*</span>main_chunk<span class="token punctuation">;</span>              <span class="token comment">//指向chunk链表头部</span>
    zend_mm_chunk     <span class="token operator">*</span>cached_chunks<span class="token punctuation">;</span>           <span class="token comment">//缓存的chunk链表</span>
    <span class="token keyword">int</span>                chunks_count<span class="token punctuation">;</span>            <span class="token comment">//已分配chunk数</span>
    <span class="token keyword">int</span>                peak_chunks_count<span class="token punctuation">;</span>       <span class="token comment">//当前request使用chunk峰值</span>
    <span class="token keyword">int</span>                cached_chunks_count<span class="token punctuation">;</span>     <span class="token comment">//缓存的chunk数</span>
    <span class="token keyword">double</span>             avg_chunks_count<span class="token punctuation">;</span>        <span class="token comment">//chunk使用均值，每次请求结束后会根据peak_chunks_count重新计算：(avg_chunks_count+peak_chunks_count)/2.0</span>
<span class="token punctuation">}</span>
<span class="token keyword">struct</span> <span class="token class-name">_zend_mm_chunk</span> <span class="token punctuation">{</span>
    zend_mm_heap      <span class="token operator">*</span>heap<span class="token punctuation">;</span> <span class="token comment">//指向heap</span>
    zend_mm_chunk     <span class="token operator">*</span>next<span class="token punctuation">;</span> <span class="token comment">//指向下一个chunk</span>
    zend_mm_chunk     <span class="token operator">*</span>prev<span class="token punctuation">;</span> <span class="token comment">//指向上一个chunk</span>
    <span class="token keyword">int</span>                free_pages<span class="token punctuation">;</span> <span class="token comment">//当前chunk的剩余page数</span>
    <span class="token keyword">int</span>                free_tail<span class="token punctuation">;</span>               <span class="token comment">/* number of free pages at the end of chunk */</span>
    <span class="token keyword">int</span>                num<span class="token punctuation">;</span>
    <span class="token keyword">char</span>               reserve<span class="token punctuation">[</span><span class="token number">64</span> <span class="token operator">-</span> <span class="token punctuation">(</span><span class="token keyword">sizeof</span><span class="token punctuation">(</span><span class="token keyword">void</span><span class="token operator">*</span><span class="token punctuation">)</span> <span class="token operator">*</span> <span class="token number">3</span> <span class="token operator">+</span> <span class="token keyword">sizeof</span><span class="token punctuation">(</span><span class="token keyword">int</span><span class="token punctuation">)</span> <span class="token operator">*</span> <span class="token number">3</span><span class="token punctuation">)</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
    zend_mm_heap       heap_slot<span class="token punctuation">;</span> <span class="token comment">//heap结构，只有主chunk会用到</span>
    zend_mm_page_map   free_map<span class="token punctuation">;</span> <span class="token comment">//标识各page是否已分配的bitmap数组，总大小512bit，对应page总数，每个page占一个bit位</span>
    zend_mm_page_info  map<span class="token punctuation">[</span>ZEND_MM_PAGES<span class="token punctuation">]</span><span class="token punctuation">;</span> <span class="token comment">//各page的信息：当前page使用类型(用于large分配还是small)、占用的page数等</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
<span class="token comment">//按固定大小切好的small内存槽</span>
<span class="token keyword">struct</span> <span class="token class-name">_zend_mm_free_slot</span> <span class="token punctuation">{</span>
    zend_mm_free_slot <span class="token operator">*</span>next_free_slot<span class="token punctuation">;</span><span class="token comment">//此指针只有内存未分配时用到，分配后整个结构体转为char使用</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>

</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li>直接从文中抠出来的图 特别详细和好理解</li></ul><figure><img src="https://static.sitestack.cn/projects/php7-internal/img/zend_heap.png" alt="img" tabindex="0" loading="lazy"><figcaption>img</figcaption></figure><h2 id="small-malloc-and-free" tabindex="-1"><a class="header-anchor" href="#small-malloc-and-free" aria-hidden="true">#</a> small malloc and free</h2><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token keyword">static</span> zend_always_inline <span class="token keyword">void</span> <span class="token operator">*</span><span class="token function">zend_mm_alloc_small</span><span class="token punctuation">(</span>zend_mm_heap <span class="token operator">*</span>heap<span class="token punctuation">,</span> <span class="token keyword">int</span> bin_num ZEND_FILE_LINE_DC ZEND_FILE_LINE_ORIG_DC<span class="token punctuation">)</span>
<span class="token punctuation">{</span>
<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">if</span> <span class="token expression">ZEND_MM_STAT</span></span>
	<span class="token keyword">do</span> <span class="token punctuation">{</span>
		<span class="token class-name">size_t</span> size <span class="token operator">=</span> heap<span class="token operator">-&gt;</span>size <span class="token operator">+</span> bin_data_size<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span><span class="token punctuation">;</span>
		<span class="token class-name">size_t</span> peak <span class="token operator">=</span> <span class="token function">MAX</span><span class="token punctuation">(</span>heap<span class="token operator">-&gt;</span>peak<span class="token punctuation">,</span> size<span class="token punctuation">)</span><span class="token punctuation">;</span>
		heap<span class="token operator">-&gt;</span>size <span class="token operator">=</span> size<span class="token punctuation">;</span>
		heap<span class="token operator">-&gt;</span>peak <span class="token operator">=</span> peak<span class="token punctuation">;</span>
	<span class="token punctuation">}</span> <span class="token keyword">while</span> <span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">endif</span></span>

	<span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token function">EXPECTED</span><span class="token punctuation">(</span>heap<span class="token operator">-&gt;</span>free_slot<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span> <span class="token operator">!=</span> <span class="token constant">NULL</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
		zend_mm_free_slot <span class="token operator">*</span>p <span class="token operator">=</span> heap<span class="token operator">-&gt;</span>free_slot<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span><span class="token punctuation">;</span>
		heap<span class="token operator">-&gt;</span>free_slot<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span> <span class="token operator">=</span> p<span class="token operator">-&gt;</span>next_free_slot<span class="token punctuation">;</span>
		<span class="token keyword">return</span> p<span class="token punctuation">;</span>
	<span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
		<span class="token keyword">return</span> <span class="token function">zend_mm_alloc_small_slow</span><span class="token punctuation">(</span>heap<span class="token punctuation">,</span> bin_num ZEND_FILE_LINE_RELAY_CC ZEND_FILE_LINE_ORIG_RELAY_CC<span class="token punctuation">)</span><span class="token punctuation">;</span>
	<span class="token punctuation">}</span>
<span class="token punctuation">}</span>
<span class="token keyword">static</span> zend_always_inline <span class="token keyword">void</span> <span class="token function">zend_mm_free_small</span><span class="token punctuation">(</span>zend_mm_heap <span class="token operator">*</span>heap<span class="token punctuation">,</span> <span class="token keyword">void</span> <span class="token operator">*</span>ptr<span class="token punctuation">,</span> <span class="token keyword">int</span> bin_num<span class="token punctuation">)</span>
<span class="token punctuation">{</span>
	zend_mm_free_slot <span class="token operator">*</span>p<span class="token punctuation">;</span>

<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">if</span> <span class="token expression">ZEND_MM_STAT</span></span>
	heap<span class="token operator">-&gt;</span>size <span class="token operator">-=</span> bin_data_size<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">endif</span></span>

<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">if</span> <span class="token expression">ZEND_DEBUG</span></span>
	<span class="token keyword">do</span> <span class="token punctuation">{</span>
		zend_mm_debug_info <span class="token operator">*</span>dbg <span class="token operator">=</span> <span class="token punctuation">(</span>zend_mm_debug_info<span class="token operator">*</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token keyword">char</span><span class="token operator">*</span><span class="token punctuation">)</span>ptr <span class="token operator">+</span> bin_data_size<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span> <span class="token operator">-</span> <span class="token function">ZEND_MM_ALIGNED_SIZE</span><span class="token punctuation">(</span><span class="token keyword">sizeof</span><span class="token punctuation">(</span>zend_mm_debug_info<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		dbg<span class="token operator">-&gt;</span>size <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
	<span class="token punctuation">}</span> <span class="token keyword">while</span> <span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">endif</span></span>

	p <span class="token operator">=</span> <span class="token punctuation">(</span>zend_mm_free_slot<span class="token operator">*</span><span class="token punctuation">)</span>ptr<span class="token punctuation">;</span>
	p<span class="token operator">-&gt;</span>next_free_slot <span class="token operator">=</span> heap<span class="token operator">-&gt;</span>free_slot<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span><span class="token punctuation">;</span>
	heap<span class="token operator">-&gt;</span>free_slot<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span> <span class="token operator">=</span> p<span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="调试" tabindex="-1"><a class="header-anchor" href="#调试" aria-hidden="true">#</a> 调试</h2><figure><img src="https://awaqwqa.github.io/img/php/image-20240428113615977.png" alt="image-20240428113615977" tabindex="0" loading="lazy"><figcaption>image-20240428113615977</figcaption></figure><ul><li><p>每次emalloc下来的small chunk都是fd链中一条</p><ul><li>间距0x280</li></ul><figure><img src="https://awaqwqa.github.io/img/php/image-20240428113701938.png" alt="image-20240428113701938" tabindex="0" loading="lazy"><figcaption>image-20240428113701938</figcaption></figure></li><li><p>依次向右取值</p></li></ul><h3 id="malloc" tabindex="-1"><a class="header-anchor" href="#malloc" aria-hidden="true">#</a> malloc</h3><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token keyword">static</span> zend_always_inline <span class="token keyword">void</span> <span class="token operator">*</span><span class="token function">zend_mm_alloc_small</span><span class="token punctuation">(</span>zend_mm_heap <span class="token operator">*</span>heap<span class="token punctuation">,</span> <span class="token keyword">int</span> bin_num ZEND_FILE_LINE_DC ZEND_FILE_LINE_ORIG_DC<span class="token punctuation">)</span>
<span class="token punctuation">{</span>
<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">if</span> <span class="token expression">ZEND_MM_STAT</span></span>
	<span class="token keyword">do</span> <span class="token punctuation">{</span>
		<span class="token class-name">size_t</span> size <span class="token operator">=</span> heap<span class="token operator">-&gt;</span>size <span class="token operator">+</span> bin_data_size<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span><span class="token punctuation">;</span>
		<span class="token class-name">size_t</span> peak <span class="token operator">=</span> <span class="token function">MAX</span><span class="token punctuation">(</span>heap<span class="token operator">-&gt;</span>peak<span class="token punctuation">,</span> size<span class="token punctuation">)</span><span class="token punctuation">;</span>
		heap<span class="token operator">-&gt;</span>size <span class="token operator">=</span> size<span class="token punctuation">;</span>
		heap<span class="token operator">-&gt;</span>peak <span class="token operator">=</span> peak<span class="token punctuation">;</span>
	<span class="token punctuation">}</span> <span class="token keyword">while</span> <span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">endif</span></span>

	<span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token function">EXPECTED</span><span class="token punctuation">(</span>heap<span class="token operator">-&gt;</span>free_slot<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span> <span class="token operator">!=</span> <span class="token constant">NULL</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
		zend_mm_free_slot <span class="token operator">*</span>p <span class="token operator">=</span> heap<span class="token operator">-&gt;</span>free_slot<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span><span class="token punctuation">;</span>
		heap<span class="token operator">-&gt;</span>free_slot<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span> <span class="token operator">=</span> p<span class="token operator">-&gt;</span>next_free_slot<span class="token punctuation">;</span>
		<span class="token keyword">return</span> p<span class="token punctuation">;</span>
	<span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
		<span class="token keyword">return</span> <span class="token function">zend_mm_alloc_small_slow</span><span class="token punctuation">(</span>heap<span class="token punctuation">,</span> bin_num ZEND_FILE_LINE_RELAY_CC ZEND_FILE_LINE_ORIG_RELAY_CC<span class="token punctuation">)</span><span class="token punctuation">;</span>
	<span class="token punctuation">}</span>
<span class="token punctuation">}</span>


</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li>会优先取 free_slot里面 头 <ul><li>然后将free_slot[bin_num]指向下一个free slot</li></ul></li></ul><h3 id="free" tabindex="-1"><a class="header-anchor" href="#free" aria-hidden="true">#</a> free</h3><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token keyword">static</span> zend_always_inline <span class="token keyword">void</span> <span class="token function">zend_mm_free_small</span><span class="token punctuation">(</span>zend_mm_heap <span class="token operator">*</span>heap<span class="token punctuation">,</span> <span class="token keyword">void</span> <span class="token operator">*</span>ptr<span class="token punctuation">,</span> <span class="token keyword">int</span> bin_num<span class="token punctuation">)</span>
<span class="token punctuation">{</span>
	zend_mm_free_slot <span class="token operator">*</span>p<span class="token punctuation">;</span>

<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">if</span> <span class="token expression">ZEND_MM_STAT</span></span>
	heap<span class="token operator">-&gt;</span>size <span class="token operator">-=</span> bin_data_size<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">endif</span></span>

<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">if</span> <span class="token expression">ZEND_DEBUG</span></span>
	<span class="token keyword">do</span> <span class="token punctuation">{</span>
		zend_mm_debug_info <span class="token operator">*</span>dbg <span class="token operator">=</span> <span class="token punctuation">(</span>zend_mm_debug_info<span class="token operator">*</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token keyword">char</span><span class="token operator">*</span><span class="token punctuation">)</span>ptr <span class="token operator">+</span> bin_data_size<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span> <span class="token operator">-</span> <span class="token function">ZEND_MM_ALIGNED_SIZE</span><span class="token punctuation">(</span><span class="token keyword">sizeof</span><span class="token punctuation">(</span>zend_mm_debug_info<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		dbg<span class="token operator">-&gt;</span>size <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
	<span class="token punctuation">}</span> <span class="token keyword">while</span> <span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">endif</span></span>

	p <span class="token operator">=</span> <span class="token punctuation">(</span>zend_mm_free_slot<span class="token operator">*</span><span class="token punctuation">)</span>ptr<span class="token punctuation">;</span>
	p<span class="token operator">-&gt;</span>next_free_slot <span class="token operator">=</span> heap<span class="token operator">-&gt;</span>free_slot<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span><span class="token punctuation">;</span>
	heap<span class="token operator">-&gt;</span>free_slot<span class="token punctuation">[</span>bin_num<span class="token punctuation">]</span> <span class="token operator">=</span> p<span class="token punctuation">;</span>
<span class="token punctuation">}</span>


</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li>直接就是入链头部没什么好说的（</li></ul>`,18);function h(b,f){const a=t("ExternalLinkIcon");return o(),c("div",null,[u,n("blockquote",null,[n("p",null,[s("学习文章:"),n("a",r,[s("PHP堆开发简介 (deepunk.icu)"),e(a)])]),n("p",null,[s("[第5章 内存管理 - 5.1 Zend内存池 - 《"),n("a",k,[s("试读] PHP7内核剖析》 - 书栈网 · BookStack"),e(a)])])]),d,n("blockquote",null,[m,n("p",null,[s("[第7章 扩展开发 - 7.2 扩展的实现原理 - 《"),n("a",_,[s("试读] PHP7内核剖析》 - 书栈网 · BookStack"),e(a)])])]),v])}const y=p(i,[["render",h],["__file","php.html.vue"]]);export{y as default};