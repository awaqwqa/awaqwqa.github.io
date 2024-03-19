const n=JSON.parse('{"key":"v-6ff5a7c0","path":"/posts/pwn/heap/house_of_lore.html","title":"House of lore学习","lang":"en-US","frontmatter":{"tag":["pwn","heap","house"],"description":"House of lore学习 主要是看着wiki 理解理解 然后自己看的glibc2.27的源码 抛开tcache部分 源码 这里是去除了不重要的tcache bin判断部分 if (in_smallbin_range (nb)){ idx = smallbin_index (nb); bin = bin_at (av, idx); if ((victim = last (bin)) != bin) { bck = victim-&gt;bk; if (__glibc_unlikely (bck-&gt;fd != victim)) malloc_printerr (\\"malloc(): smallbin double linked list corrupted\\"); set_inuse_bit_at_offset (victim, nb); bin-&gt;bk = bck; bck-&gt;fd = bin; if (av != &amp;main_arena) \\t set_non_main_arena (victim); check_malloced_chunk (av, victim, nb); void *p = chunk2mem (victim); alloc_perturb (p, bytes); return p; } }","head":[["meta",{"property":"og:url","content":"https://mister-hope.github.io/posts/pwn/heap/house_of_lore.html"}],["meta",{"property":"og:site_name","content":"Blog"}],["meta",{"property":"og:title","content":"House of lore学习"}],["meta",{"property":"og:description","content":"House of lore学习 主要是看着wiki 理解理解 然后自己看的glibc2.27的源码 抛开tcache部分 源码 这里是去除了不重要的tcache bin判断部分 if (in_smallbin_range (nb)){ idx = smallbin_index (nb); bin = bin_at (av, idx); if ((victim = last (bin)) != bin) { bck = victim-&gt;bk; if (__glibc_unlikely (bck-&gt;fd != victim)) malloc_printerr (\\"malloc(): smallbin double linked list corrupted\\"); set_inuse_bit_at_offset (victim, nb); bin-&gt;bk = bck; bck-&gt;fd = bin; if (av != &amp;main_arena) \\t set_non_main_arena (victim); check_malloced_chunk (av, victim, nb); void *p = chunk2mem (victim); alloc_perturb (p, bytes); return p; } }"}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"en-US"}],["meta",{"property":"og:updated_time","content":"2024-03-19T14:59:19.000Z"}],["meta",{"property":"article:author","content":"Elegy"}],["meta",{"property":"article:tag","content":"pwn"}],["meta",{"property":"article:tag","content":"heap"}],["meta",{"property":"article:tag","content":"house"}],["meta",{"property":"article:modified_time","content":"2024-03-19T14:59:19.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"House of lore学习\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2024-03-19T14:59:19.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Elegy\\"}]}"]]},"headers":[{"level":2,"title":"源码","slug":"源码","link":"#源码","children":[]},{"level":2,"title":"漏洞利用图","slug":"漏洞利用图","link":"#漏洞利用图","children":[]}],"git":{"createdTime":1710858079000,"updatedTime":1710860359000,"contributors":[{"name":"awaqwqa","email":"88972629+awaqwqa@users.noreply.github.com","commits":2}]},"readingTime":{"minutes":0.84,"words":253},"filePathRelative":"posts/pwn/heap/house_of_lore.md","localizedDate":"March 19, 2024","excerpt":"<h1> House of lore学习</h1>\\n<blockquote>\\n<p>主要是看着wiki 理解理解 然后自己看的glibc2.27的源码 抛开tcache部分</p>\\n</blockquote>\\n<h2> 源码</h2>\\n<blockquote>\\n<p>这里是去除了不重要的<code>tcache bin</code>判断部分</p>\\n</blockquote>\\n<div class=\\"language-c line-numbers-mode\\" data-ext=\\"c\\"><pre class=\\"language-c\\"><code><span class=\\"token keyword\\">if</span> <span class=\\"token punctuation\\">(</span><span class=\\"token function\\">in_smallbin_range</span> <span class=\\"token punctuation\\">(</span>nb<span class=\\"token punctuation\\">)</span><span class=\\"token punctuation\\">)</span><span class=\\"token punctuation\\">{</span>\\n      idx <span class=\\"token operator\\">=</span> <span class=\\"token function\\">smallbin_index</span> <span class=\\"token punctuation\\">(</span>nb<span class=\\"token punctuation\\">)</span><span class=\\"token punctuation\\">;</span>\\n      bin <span class=\\"token operator\\">=</span> <span class=\\"token function\\">bin_at</span> <span class=\\"token punctuation\\">(</span>av<span class=\\"token punctuation\\">,</span> idx<span class=\\"token punctuation\\">)</span><span class=\\"token punctuation\\">;</span>\\n\\n      <span class=\\"token keyword\\">if</span> <span class=\\"token punctuation\\">(</span><span class=\\"token punctuation\\">(</span>victim <span class=\\"token operator\\">=</span> <span class=\\"token function\\">last</span> <span class=\\"token punctuation\\">(</span>bin<span class=\\"token punctuation\\">)</span><span class=\\"token punctuation\\">)</span> <span class=\\"token operator\\">!=</span> bin<span class=\\"token punctuation\\">)</span>\\n      <span class=\\"token punctuation\\">{</span>\\n          bck <span class=\\"token operator\\">=</span> victim<span class=\\"token operator\\">-&gt;</span>bk<span class=\\"token punctuation\\">;</span>\\n          <span class=\\"token keyword\\">if</span> <span class=\\"token punctuation\\">(</span><span class=\\"token function\\">__glibc_unlikely</span> <span class=\\"token punctuation\\">(</span>bck<span class=\\"token operator\\">-&gt;</span>fd <span class=\\"token operator\\">!=</span> victim<span class=\\"token punctuation\\">)</span><span class=\\"token punctuation\\">)</span>\\n            <span class=\\"token function\\">malloc_printerr</span> <span class=\\"token punctuation\\">(</span><span class=\\"token string\\">\\"malloc(): smallbin double linked list corrupted\\"</span><span class=\\"token punctuation\\">)</span><span class=\\"token punctuation\\">;</span>\\n          <span class=\\"token function\\">set_inuse_bit_at_offset</span> <span class=\\"token punctuation\\">(</span>victim<span class=\\"token punctuation\\">,</span> nb<span class=\\"token punctuation\\">)</span><span class=\\"token punctuation\\">;</span>\\n          bin<span class=\\"token operator\\">-&gt;</span>bk <span class=\\"token operator\\">=</span> bck<span class=\\"token punctuation\\">;</span>\\n          bck<span class=\\"token operator\\">-&gt;</span>fd <span class=\\"token operator\\">=</span> bin<span class=\\"token punctuation\\">;</span>\\n\\n          <span class=\\"token keyword\\">if</span> <span class=\\"token punctuation\\">(</span>av <span class=\\"token operator\\">!=</span> <span class=\\"token operator\\">&amp;</span>main_arena<span class=\\"token punctuation\\">)</span>\\n\\t           <span class=\\"token function\\">set_non_main_arena</span> <span class=\\"token punctuation\\">(</span>victim<span class=\\"token punctuation\\">)</span><span class=\\"token punctuation\\">;</span>\\n          <span class=\\"token function\\">check_malloced_chunk</span> <span class=\\"token punctuation\\">(</span>av<span class=\\"token punctuation\\">,</span> victim<span class=\\"token punctuation\\">,</span> nb<span class=\\"token punctuation\\">)</span><span class=\\"token punctuation\\">;</span>\\n          <span class=\\"token keyword\\">void</span> <span class=\\"token operator\\">*</span>p <span class=\\"token operator\\">=</span> <span class=\\"token function\\">chunk2mem</span> <span class=\\"token punctuation\\">(</span>victim<span class=\\"token punctuation\\">)</span><span class=\\"token punctuation\\">;</span>\\n          <span class=\\"token function\\">alloc_perturb</span> <span class=\\"token punctuation\\">(</span>p<span class=\\"token punctuation\\">,</span> bytes<span class=\\"token punctuation\\">)</span><span class=\\"token punctuation\\">;</span>\\n          <span class=\\"token keyword\\">return</span> p<span class=\\"token punctuation\\">;</span>\\n      <span class=\\"token punctuation\\">}</span>\\n<span class=\\"token punctuation\\">}</span>\\n</code></pre><div class=\\"line-numbers\\" aria-hidden=\\"true\\"><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div><div class=\\"line-number\\"></div></div></div>","autoDesc":true}');export{n as data};