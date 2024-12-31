import{_ as t}from"./plugin-vue_export-helper-x3n3nnut.js";import{r as p,o as i,c as o,a as n,b as s,d as e,e as c}from"./app-XSbhAI8_.js";const l={},u=n("h1",{id:"多线程pwn-ptmalloc",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#多线程pwn-ptmalloc","aria-hidden":"true"},"#"),s(" 多线程pwn(ptmalloc)")],-1),r={href:"https://blog.csdn.net/luozhaotian/article/details/80267185",target:"_blank",rel:"noopener noreferrer"},d={href:"https://blog.csdn.net/initphp/article/details/127750294",target:"_blank",rel:"noopener noreferrer"},k={href:"https://initphp.blog.csdn.net/article/details/109489720",target:"_blank",rel:"noopener noreferrer"},m={href:"https://initphp.blog.csdn.net/article/details/132564546?spm=1001.2014.3001.5502",target:"_blank",rel:"noopener noreferrer"},v=c(`<h2 id="主分配区-和-非主分配区" tabindex="-1"><a class="header-anchor" href="#主分配区-和-非主分配区" aria-hidden="true">#</a> 主分配区 和 非主分配区</h2><blockquote><p>ptmalloc通过<strong>malloc_state</strong>结构体来管理内存的分配等一系列操作 我们可以看见我们相对熟悉的<code>fastbinsY</code>和<code>bins</code>也就是我们接触最多的fastbin,unsortedbin,smallbin,largebin等 这里我们主要观察<code>next</code>,<code>next_free</code></p></blockquote><ul><li><p>ptmalloc中用主分配区和非主分配区用来解决线程争夺问题</p></li><li><p>非主分配区用mmap来映射获取内存</p></li><li><p>主分配区和非主分配区用<code>next</code>形成一个<code>环形链表</code>进行管理 <code>next</code>链接的是非主分配区</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token comment">/* 分配区全局链表：分配区链表，主分配区放头部，新加入的分配区放main_arean.next 位置 Linked list */</span>
  <span class="token keyword">struct</span> <span class="token class-name">malloc_state</span> <span class="token operator">*</span>next<span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div></div></div></li></ul><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token comment">/**
 * 全局malloc状态管理
 */</span>
<span class="token keyword">struct</span> <span class="token class-name">malloc_state</span>
<span class="token punctuation">{</span>
  <span class="token comment">/* Serialize access. 同步访问互斥锁 */</span>
  <span class="token function">__libc_lock_define</span> <span class="token punctuation">(</span><span class="token punctuation">,</span> mutex<span class="token punctuation">)</span><span class="token punctuation">;</span>
 
  <span class="token comment">/* Flags (formerly in max_fast).
   * 用于标记当前主分配区的状态
   *  */</span>
  <span class="token keyword">int</span> flags<span class="token punctuation">;</span>
 
  <span class="token comment">/* Set if the fastbin chunks contain recently inserted free blocks.  */</span>
  <span class="token comment">/* Note this is a bool but not all targets support atomics on booleans.  */</span>
  <span class="token comment">/* 用于标记是否有fastchunk */</span>
  <span class="token keyword">int</span> have_fastchunks<span class="token punctuation">;</span>
 
  <span class="token comment">/* Fastbins fast bins。
   * fast bins是bins的高速缓冲区，大约有10个定长队列。
   * 当用户释放一块不大于max_fast（默认值64）的chunk（一般小内存）的时候，会默认会被放到fast bins上。
   * */</span>
  mfastbinptr fastbinsY<span class="token punctuation">[</span>NFASTBINS<span class="token punctuation">]</span><span class="token punctuation">;</span>
 
  <span class="token comment">/* Base of the topmost chunk -- not otherwise kept in a bin */</span>
  <span class="token comment">/* Top chunk ：并不是所有的chunk都会被放到bins上。
   * top chunk相当于分配区的顶部空闲内存，当bins上都不能满足内存分配要求的时候，就会来top chunk上分配。 */</span>
  mchunkptr top<span class="token punctuation">;</span>
 
  <span class="token comment">/* The remainder from the most recent split of a small request */</span>
  mchunkptr last_remainder<span class="token punctuation">;</span>
 
  <span class="token comment">/* Normal bins packed as described above
   * 常规 bins chunk的链表数组
   * 1. unsorted bin：是bins的一个缓冲区。当用户释放的内存大于max_fast或者fast bins合并后的chunk都会进入unsorted bin上
   * 2. small bins和large bins。small bins和large bins是真正用来放置chunk双向链表的。每个bin之间相差8个字节，并且通过上面的这个列表，
   * 可以快速定位到合适大小的空闲chunk。
   * 3. 下标1是unsorted bin，2到63是small bin，64到126是large bin，共126个bin
   * */</span>
  mchunkptr bins<span class="token punctuation">[</span>NBINS <span class="token operator">*</span> <span class="token number">2</span> <span class="token operator">-</span> <span class="token number">2</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
 
  <span class="token comment">/* Bitmap of bins
   * 表示bin数组当中某一个下标的bin是否为空，用来在分配的时候加速
   * */</span>
  <span class="token keyword">unsigned</span> <span class="token keyword">int</span> binmap<span class="token punctuation">[</span>BINMAPSIZE<span class="token punctuation">]</span><span class="token punctuation">;</span>
 
  <span class="token comment">/* 分配区全局链表：分配区链表，主分配区放头部，新加入的分配区放main_arean.next 位置 Linked list */</span>
  <span class="token keyword">struct</span> <span class="token class-name">malloc_state</span> <span class="token operator">*</span>next<span class="token punctuation">;</span>
 
  <span class="token comment">/* 分配区空闲链表 Linked list for free arenas.  Access to this field is serialized
     by free_list_lock in arena.c.  */</span>
  <span class="token keyword">struct</span> <span class="token class-name">malloc_state</span> <span class="token operator">*</span>next_free<span class="token punctuation">;</span>
 
  <span class="token comment">/* Number of threads attached to this arena.  0 if the arena is on
     the free list.  Access to this field is serialized by
     free_list_lock in arena.c.  */</span>
    <span class="token comment">// 空闲链表的状态记录，0-空闲，n-正在使用中，关联的线程个数（一个分配区可以给多个线程使用）</span>
  INTERNAL_SIZE_T attached_threads<span class="token punctuation">;</span>
 
  <span class="token comment">/* Memory allocated from the system in this arena.  */</span>
  INTERNAL_SIZE_T system_mem<span class="token punctuation">;</span>
  INTERNAL_SIZE_T max_system_mem<span class="token punctuation">;</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="多线程分配" tabindex="-1"><a class="header-anchor" href="#多线程分配" aria-hidden="true">#</a> 多线程分配</h2><blockquote><p>malloc/arena.c/_int_new_arena函数中</p></blockquote><h3 id="流程" tabindex="-1"><a class="header-anchor" href="#流程" aria-hidden="true">#</a> 流程</h3><ul><li><p>线程中malloc 会检查线程中是否存在<code>分配区</code>，如果存在直接加锁，并且进行内存分配</p></li><li><p>否则通过<code>next</code>遍历链表查看有未加锁<code>分配区</code> 然后加锁分配</p></li><li><p>如果无的话 会<code>ptamlloc</code>一个新的分配区 加入<code>malloc_state-&gt;next</code> 然后加锁进行分配</p><blockquote><p>下方是malloc一个新的分区的情况</p></blockquote><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token function">__libc_lock_init</span> <span class="token punctuation">(</span>a<span class="token operator">-&gt;</span>mutex<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">__libc_lock_lock</span> <span class="token punctuation">(</span>list_lock<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">/* Add the new arena to the global list.  */</span>
a<span class="token operator">-&gt;</span>next <span class="token operator">=</span> main_arena<span class="token punctuation">.</span>next<span class="token punctuation">;</span>
<span class="token comment">/* FIXME: The barrier is an attempt to synchronize with read access
     in reused_arena, which does not acquire list_lock while
     traversing the list.  */</span>
<span class="token function">atomic_write_barrier</span> <span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
main_arena<span class="token punctuation">.</span>next <span class="token operator">=</span> a<span class="token punctuation">;</span>
<span class="token function">__libc_lock_unlock</span> <span class="token punctuation">(</span>list_lock<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">__libc_lock_lock</span> <span class="token punctuation">(</span>free_list_lock<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">detach_arena</span> <span class="token punctuation">(</span>replaced_arena<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">__libc_lock_unlock</span> <span class="token punctuation">(</span>free_list_lock<span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div></li></ul><h3 id="调用链" tabindex="-1"><a class="header-anchor" href="#调用链" aria-hidden="true">#</a> 调用链:</h3><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code>__libc_malloc<span class="token operator">-&gt;</span>
    	arena_get
    	arena_get2<span class="token operator">-&gt;</span>
    		_int_new_arena
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li>先调用arena_get失败则调用arena_get2然后arena_get2中如果分配没有满则调用_int_new_arena满了调用<strong>reused_arena</strong></li></ul><h3 id="arena-get" tabindex="-1"><a class="header-anchor" href="#arena-get" aria-hidden="true">#</a> arena_get</h3><blockquote><p>调用主要是__libc_malloc函数中</p></blockquote><ul><li><p>从<code>thread_arena</code>中获取分配区 如果成功则加锁 没有成功则通过<code>arena_get2</code>进行分配区的申请与初始化</p><blockquote><p>每个线程都会设置这么一个变量<code>thread_arena</code> 该变量保存对应的分配区。如果是主线程，则thread_arena设置成main_arena。</p><p><code>main_arena</code>是在ptamlloc_init的时候初始化的 主线程对应主分配区</p></blockquote><div class="language-C line-numbers-mode" data-ext="C"><pre class="language-C"><code>#define arena_get(ptr, size) do { \\
      ptr = thread_arena;						      \\
      arena_lock (ptr, size);						      \\
  } while (0)
static mstate
arena_get_retry (mstate ar_ptr, size_t bytes)
{
  LIBC_PROBE (memory_arena_retry, 2, bytes, ar_ptr);
  if (ar_ptr != &amp;main_arena)
    {
      __libc_lock_unlock (ar_ptr-&gt;mutex);
      ar_ptr = &amp;main_arena;
      __libc_lock_lock (ar_ptr-&gt;mutex);
    }
  else
    {
      __libc_lock_unlock (ar_ptr-&gt;mutex);
      ar_ptr = arena_get2 (bytes, ar_ptr);
    }

  return ar_ptr;
}
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><figure><img src="https://awaqwqa.github.io/img/thread_pwn/image-20240506184605509.png" alt="image-20240506184605509" tabindex="0" loading="lazy"><figcaption>image-20240506184605509</figcaption></figure></li></ul><h3 id="arena-get2" tabindex="-1"><a class="header-anchor" href="#arena-get2" aria-hidden="true">#</a> <strong>arena_get2</strong></h3><blockquote><p>这里出现的<code>arena</code>数量的上限 64位数量是<code>8*cores+1</code> 32位是<code>2*cores+1</code></p></blockquote><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code>
<span class="token keyword">static</span> mstate
<span class="token function">arena_get2</span> <span class="token punctuation">(</span><span class="token class-name">size_t</span> size<span class="token punctuation">,</span> mstate avoid_arena<span class="token punctuation">)</span>
<span class="token punctuation">{</span>
  mstate a<span class="token punctuation">;</span>

  <span class="token keyword">static</span> <span class="token class-name">size_t</span> narenas_limit<span class="token punctuation">;</span>
    <span class="token comment">// 从空闲链表中获取一个分配区，如果空闲链表中有该分配区，则直接使用，返回结果</span>
  a <span class="token operator">=</span> <span class="token function">get_free_list</span> <span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// 获取失败的情况</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>a <span class="token operator">==</span> <span class="token constant">NULL</span><span class="token punctuation">)</span>
    <span class="token punctuation">{</span>
      <span class="token comment">/* Nothing immediately available, so generate a new arena.  */</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>narenas_limit <span class="token operator">==</span> <span class="token number">0</span><span class="token punctuation">)</span>
        <span class="token punctuation">{</span>
          <span class="token keyword">if</span> <span class="token punctuation">(</span>mp_<span class="token punctuation">.</span>arena_max <span class="token operator">!=</span> <span class="token number">0</span><span class="token punctuation">)</span>
            narenas_limit <span class="token operator">=</span> mp_<span class="token punctuation">.</span>arena_max<span class="token punctuation">;</span>
          <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>narenas <span class="token operator">&gt;</span> mp_<span class="token punctuation">.</span>arena_test<span class="token punctuation">)</span>
            <span class="token punctuation">{</span>
              <span class="token keyword">int</span> n <span class="token operator">=</span> <span class="token function">__get_nprocs_sched</span> <span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

              <span class="token keyword">if</span> <span class="token punctuation">(</span>n <span class="token operator">&gt;=</span> <span class="token number">1</span><span class="token punctuation">)</span>
                narenas_limit <span class="token operator">=</span> <span class="token function">NARENAS_FROM_NCORES</span> <span class="token punctuation">(</span>n<span class="token punctuation">)</span><span class="token punctuation">;</span>
              <span class="token keyword">else</span>
                <span class="token comment">/* We have no information about the system.  Assume two
                   cores.  */</span>
                narenas_limit <span class="token operator">=</span> <span class="token function">NARENAS_FROM_NCORES</span> <span class="token punctuation">(</span><span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            <span class="token punctuation">}</span>
        <span class="token punctuation">}</span>
    repeat<span class="token operator">:</span><span class="token punctuation">;</span>
      <span class="token class-name">size_t</span> n <span class="token operator">=</span> narenas<span class="token punctuation">;</span>
      <span class="token comment">/* NB: the following depends on the fact that (size_t)0 - 1 is a
         very large number and that the underflow is OK.  If arena_max
         is set the value of arena_test is irrelevant.  If arena_test
         is set but narenas is not yet larger or equal to arena_test
         narenas_limit is 0.  There is no possibility for narenas to
         be too big for the test to always fail since there is not
         enough address space to create that many arenas.  */</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token function">__glibc_unlikely</span> <span class="token punctuation">(</span>n <span class="token operator">&lt;=</span> narenas_limit <span class="token operator">-</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
        <span class="token punctuation">{</span>
          <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token function">catomic_compare_and_exchange_bool_acq</span> <span class="token punctuation">(</span><span class="token operator">&amp;</span>narenas<span class="token punctuation">,</span> n <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">,</span> n<span class="token punctuation">)</span><span class="token punctuation">)</span>
            <span class="token keyword">goto</span> repeat<span class="token punctuation">;</span>
          a <span class="token operator">=</span> <span class="token function">_int_new_arena</span> <span class="token punctuation">(</span>size<span class="token punctuation">)</span><span class="token punctuation">;</span>
	  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token function">__glibc_unlikely</span> <span class="token punctuation">(</span>a <span class="token operator">==</span> <span class="token constant">NULL</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
            <span class="token function">catomic_decrement</span> <span class="token punctuation">(</span><span class="token operator">&amp;</span>narenas<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">}</span>
      <span class="token keyword">else</span>
          <span class="token comment">// 如果</span>
        a <span class="token operator">=</span> <span class="token function">reused_arena</span> <span class="token punctuation">(</span>avoid_arena<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
  <span class="token keyword">return</span> a<span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="int-new-arena-new-arena" tabindex="-1"><a class="header-anchor" href="#int-new-arena-new-arena" aria-hidden="true">#</a> <strong>_int_new_arena</strong>(new arena)</h3><blockquote><p>创建一个非主分配区</p></blockquote><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token comment">/**
 * 初始化一个新的分配区arena
 * 该函数主要创建：非主分配区
 * 主分配区在ptmalloc_init中初始化，并且设置了全局变量main_arena的值
 */</span>
<span class="token keyword">static</span> mstate <span class="token function">_int_new_arena</span><span class="token punctuation">(</span><span class="token class-name">size_t</span> size<span class="token punctuation">)</span> <span class="token punctuation">{</span>
	mstate a<span class="token punctuation">;</span>
	heap_info <span class="token operator">*</span>h<span class="token punctuation">;</span>
	<span class="token keyword">char</span> <span class="token operator">*</span>ptr<span class="token punctuation">;</span>
	<span class="token keyword">unsigned</span> <span class="token keyword">long</span> misalign<span class="token punctuation">;</span>
 
	<span class="token comment">/* 分配一个heap_info，用于记录堆的信息，非主分配区一般都是通过MMAP向系统申请内存；非主分配区申请后，是不能被销毁的 */</span>
	<span class="token comment">// new_heap是仅仅在非主分配区使用的</span>
    h <span class="token operator">=</span> <span class="token function">new_heap</span><span class="token punctuation">(</span>size <span class="token operator">+</span> <span class="token punctuation">(</span><span class="token keyword">sizeof</span><span class="token punctuation">(</span><span class="token operator">*</span>h<span class="token punctuation">)</span> <span class="token operator">+</span> <span class="token keyword">sizeof</span><span class="token punctuation">(</span><span class="token operator">*</span>a<span class="token punctuation">)</span> <span class="token operator">+</span> MALLOC_ALIGNMENT<span class="token punctuation">)</span><span class="token punctuation">,</span>
			mp_<span class="token punctuation">.</span>top_pad<span class="token punctuation">)</span><span class="token punctuation">;</span>å
	<span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>h<span class="token punctuation">)</span> <span class="token punctuation">{</span>
		<span class="token comment">/* Maybe size is too large to fit in a single heap.  So, just try
		 to create a minimally-sized arena and let _int_malloc() attempt
		 to deal with the large request via mmap_chunk().  */</span>
		h <span class="token operator">=</span> <span class="token function">new_heap</span><span class="token punctuation">(</span><span class="token keyword">sizeof</span><span class="token punctuation">(</span><span class="token operator">*</span>h<span class="token punctuation">)</span> <span class="token operator">+</span> <span class="token keyword">sizeof</span><span class="token punctuation">(</span><span class="token operator">*</span>a<span class="token punctuation">)</span> <span class="token operator">+</span> MALLOC_ALIGNMENT<span class="token punctuation">,</span> mp_<span class="token punctuation">.</span>top_pad<span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>h<span class="token punctuation">)</span>
			<span class="token keyword">return</span> <span class="token number">0</span><span class="token punctuation">;</span>
	<span class="token punctuation">}</span>
	a <span class="token operator">=</span> h<span class="token operator">-&gt;</span>ar_ptr <span class="token operator">=</span> <span class="token punctuation">(</span>mstate<span class="token punctuation">)</span><span class="token punctuation">(</span>h <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">//heap_info-&gt;ar_ptr的值设置成mstate的分配区状态机的数据结构</span>
 
	<span class="token function">malloc_init_state</span><span class="token punctuation">(</span>a<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">//初始化mstate</span>
	a<span class="token operator">-&gt;</span>attached_threads <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span> <span class="token comment">//设置进程关联个数</span>
	<span class="token comment">/*a-&gt;next = NULL;*/</span>
	a<span class="token operator">-&gt;</span>system_mem <span class="token operator">=</span> a<span class="token operator">-&gt;</span>max_system_mem <span class="token operator">=</span> h<span class="token operator">-&gt;</span>size<span class="token punctuation">;</span>
 
	<span class="token comment">/* Set up the top chunk, with proper alignment. */</span>
	ptr <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token keyword">char</span> <span class="token operator">*</span><span class="token punctuation">)</span> <span class="token punctuation">(</span>a <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
	misalign <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token keyword">unsigned</span> <span class="token keyword">long</span><span class="token punctuation">)</span> <span class="token function">chunk2mem</span><span class="token punctuation">(</span>ptr<span class="token punctuation">)</span> <span class="token operator">&amp;</span> MALLOC_ALIGN_MASK<span class="token punctuation">;</span>
	<span class="token keyword">if</span> <span class="token punctuation">(</span>misalign <span class="token operator">&gt;</span> <span class="token number">0</span><span class="token punctuation">)</span>
		ptr <span class="token operator">+=</span> MALLOC_ALIGNMENT <span class="token operator">-</span> misalign<span class="token punctuation">;</span>
	<span class="token function">top</span> <span class="token punctuation">(</span>a<span class="token punctuation">)</span> <span class="token operator">=</span> <span class="token punctuation">(</span>mchunkptr<span class="token punctuation">)</span> ptr<span class="token punctuation">;</span>
	<span class="token function">set_head</span><span class="token punctuation">(</span><span class="token function">top</span><span class="token punctuation">(</span>a<span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token keyword">char</span> <span class="token operator">*</span><span class="token punctuation">)</span> h <span class="token operator">+</span> h<span class="token operator">-&gt;</span>size<span class="token punctuation">)</span> <span class="token operator">-</span> ptr<span class="token punctuation">)</span> <span class="token operator">|</span> PREV_INUSE<span class="token punctuation">)</span><span class="token punctuation">;</span>
 
	<span class="token function">LIBC_PROBE</span><span class="token punctuation">(</span>memory_arena_new<span class="token punctuation">,</span> <span class="token number">2</span><span class="token punctuation">,</span> a<span class="token punctuation">,</span> size<span class="token punctuation">)</span><span class="token punctuation">;</span>
	mstate replaced_arena <span class="token operator">=</span> thread_arena<span class="token punctuation">;</span>
	thread_arena <span class="token operator">=</span> a<span class="token punctuation">;</span> <span class="token comment">//将当前线程设置mstate</span>
	<span class="token function">__libc_lock_init</span><span class="token punctuation">(</span>a<span class="token operator">-&gt;</span>mutex<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">//初始化分配区锁</span>
 
	<span class="token function">__libc_lock_lock</span><span class="token punctuation">(</span>list_lock<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">//加上分配区锁</span>
 
	<span class="token comment">/* 将新的分配区加入到全局链表上，新申请的分配区都会放入主分配区的下一个位置*/</span>
	<span class="token comment">/* Add the new arena to the global list.  */</span>
	a<span class="token operator">-&gt;</span>next <span class="token operator">=</span> main_arena<span class="token punctuation">.</span>next<span class="token punctuation">;</span>
	<span class="token comment">/* FIXME: The barrier is an attempt to synchronize with read access
	 in reused_arena, which does not acquire list_lock while
	 traversing the list.  */</span>
	<span class="token function">atomic_write_barrier</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
	main_arena<span class="token punctuation">.</span>next <span class="token operator">=</span> a<span class="token punctuation">;</span>
	<span class="token function">__libc_lock_unlock</span><span class="token punctuation">(</span>list_lock<span class="token punctuation">)</span><span class="token punctuation">;</span>
 
	<span class="token comment">/* 调整attached_threads状态*/</span>
	<span class="token function">__libc_lock_lock</span><span class="token punctuation">(</span>free_list_lock<span class="token punctuation">)</span><span class="token punctuation">;</span>
	<span class="token function">detach_arena</span><span class="token punctuation">(</span>replaced_arena<span class="token punctuation">)</span><span class="token punctuation">;</span>
	<span class="token function">__libc_lock_unlock</span><span class="token punctuation">(</span>free_list_lock<span class="token punctuation">)</span><span class="token punctuation">;</span>
 
 
	 __malloc_fork_lock_parent<span class="token punctuation">.</span>  <span class="token operator">*</span><span class="token operator">/</span>
 
	<span class="token function">__libc_lock_lock</span><span class="token punctuation">(</span>a<span class="token operator">-&gt;</span>mutex<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">//解除分配区锁</span>
 
	<span class="token keyword">return</span> a<span class="token punctuation">;</span>
<span class="token punctuation">}</span>
 
<span class="token comment">/* Remove the arena from the free list (if it is present).
 free_list_lock must have been acquired by the caller.
 移动链表地址，移除free_list上的分配区结构*/</span>
<span class="token keyword">static</span> <span class="token keyword">void</span> <span class="token function">remove_from_free_list</span><span class="token punctuation">(</span>mstate arena<span class="token punctuation">)</span> <span class="token punctuation">{</span>
	mstate <span class="token operator">*</span>previous <span class="token operator">=</span> <span class="token operator">&amp;</span>free_list<span class="token punctuation">;</span>
	<span class="token keyword">for</span> <span class="token punctuation">(</span>mstate p <span class="token operator">=</span> free_list<span class="token punctuation">;</span> p <span class="token operator">!=</span> <span class="token constant">NULL</span><span class="token punctuation">;</span> p <span class="token operator">=</span> p<span class="token operator">-&gt;</span>next_free<span class="token punctuation">)</span> <span class="token punctuation">{</span>
		<span class="token function">assert</span><span class="token punctuation">(</span>p<span class="token operator">-&gt;</span>attached_threads <span class="token operator">==</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token keyword">if</span> <span class="token punctuation">(</span>p <span class="token operator">==</span> arena<span class="token punctuation">)</span> <span class="token punctuation">{</span>
			<span class="token comment">/* Remove the requested arena from the list.  */</span>
			<span class="token operator">*</span>previous <span class="token operator">=</span> p<span class="token operator">-&gt;</span>next_free<span class="token punctuation">;</span>
			<span class="token keyword">break</span><span class="token punctuation">;</span>
		<span class="token punctuation">}</span> <span class="token keyword">else</span>
			previous <span class="token operator">=</span> <span class="token operator">&amp;</span>p<span class="token operator">-&gt;</span>next_free<span class="token punctuation">;</span>
	<span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="reused-arena" tabindex="-1"><a class="header-anchor" href="#reused-arena" aria-hidden="true">#</a> <strong>reused_arena</strong></h3><blockquote><p>简单来说就是遍历整个分配区表判断是否有锁 没锁就能用 这样就可以实现循环利用</p></blockquote>`,22);function b(_,h){const a=p("ExternalLinkIcon");return i(),o("div",null,[u,n("blockquote",null,[n("p",null,[s("参考文章:"),n("a",r,[s("ptmalloc堆概述-多线程支持_ptmalloc主arena存在的意义-CSDN博客"),e(a)])]),n("p",null,[s("推荐(讲得很清晰):"),n("a",d,[s("ptmalloc源码分析 - 主分配区和非主分配区Arena的实现（04）_malloc main arena-CSDN博客"),e(a)])]),n("p",null,[n("a",k,[s("ptmalloc源码分析 - 分配区状态机malloc_state（02）-CSDN博客"),e(a)])]),n("p",null,[n("a",m,[s("ptmalloc源码分析 - 分配区heap_info结构实现（05）-CSDN博客"),e(a)])])]),v])}const w=t(l,[["render",b],["__file","thread_pwn.html.vue"]]);export{w as default};
