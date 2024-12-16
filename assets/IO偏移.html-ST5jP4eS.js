const e=JSON.parse('{"key":"v-aa9acd18","path":"/posts/pwn/tool_skill/IO%E5%81%8F%E7%A7%BB.html","title":"pwn IO相关偏移","lang":"en-US","frontmatter":{"date":"2024-10-27T00:00:00.000Z","tag":["pwn","io"],"description":"pwn IO相关偏移 主要是因为有几次比赛,题基本打到IO了但是就剩下十分钟了根本调不通IO链,为了预防这种情况再次出现这里慢慢总结一下IO相关结构体和不同的攻击方式 这里主要是快捷提供了一些结构体以及偏移方便直接查询,这里的偏移以虚表为主,虚表实现主要是辅助我们查找函数的 gdb调试技巧 查看结构体的偏移量 ptype /o struct xxxx // 可以获取结构体的偏移量 image-20241027104306803 查看变量的类型 ptype 变量 // 可以查看变量类型 image-20241027104229082","head":[["meta",{"property":"og:url","content":"https://mister-hope.github.io/posts/pwn/tool_skill/IO%E5%81%8F%E7%A7%BB.html"}],["meta",{"property":"og:site_name","content":"Blog"}],["meta",{"property":"og:title","content":"pwn IO相关偏移"}],["meta",{"property":"og:description","content":"pwn IO相关偏移 主要是因为有几次比赛,题基本打到IO了但是就剩下十分钟了根本调不通IO链,为了预防这种情况再次出现这里慢慢总结一下IO相关结构体和不同的攻击方式 这里主要是快捷提供了一些结构体以及偏移方便直接查询,这里的偏移以虚表为主,虚表实现主要是辅助我们查找函数的 gdb调试技巧 查看结构体的偏移量 ptype /o struct xxxx // 可以获取结构体的偏移量 image-20241027104306803 查看变量的类型 ptype 变量 // 可以查看变量类型 image-20241027104229082"}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"en-US"}],["meta",{"property":"og:updated_time","content":"2024-12-16T08:36:57.000Z"}],["meta",{"property":"article:author","content":"Elegy"}],["meta",{"property":"article:tag","content":"pwn"}],["meta",{"property":"article:tag","content":"io"}],["meta",{"property":"article:published_time","content":"2024-10-27T00:00:00.000Z"}],["meta",{"property":"article:modified_time","content":"2024-12-16T08:36:57.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"pwn IO相关偏移\\",\\"image\\":[\\"\\"],\\"datePublished\\":\\"2024-10-27T00:00:00.000Z\\",\\"dateModified\\":\\"2024-12-16T08:36:57.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Elegy\\"}]}"]]},"headers":[{"level":2,"title":"gdb调试技巧","slug":"gdb调试技巧","link":"#gdb调试技巧","children":[]},{"level":2,"title":"largebin attack","slug":"largebin-attack","link":"#largebin-attack","children":[]},{"level":2,"title":"magic_gadget","slug":"magic-gadget","link":"#magic-gadget","children":[{"level":3,"title":"svcudp_reply","slug":"svcudp-reply","link":"#svcudp-reply","children":[]},{"level":3,"title":"setcontext","slug":"setcontext","link":"#setcontext","children":[]},{"level":3,"title":"glibc2.27","slug":"glibc2-27","link":"#glibc2-27","children":[]}]},{"level":2,"title":"hook","slug":"hook","link":"#hook","children":[]},{"level":2,"title":"获取IO结构体偏移","slug":"获取io结构体偏移","link":"#获取io结构体偏移","children":[]},{"level":2,"title":"2.38","slug":"_2-38","link":"#_2-38","children":[{"level":3,"title":"2.38-1ubuntu4_amd64","slug":"_2-38-1ubuntu4-amd64","link":"#_2-38-1ubuntu4-amd64","children":[]}]},{"level":2,"title":"2.27","slug":"_2-27","link":"#_2-27","children":[{"level":3,"title":"_IO_FILE_plus结构体","slug":"io-file-plus结构体-1","link":"#io-file-plus结构体-1","children":[]},{"level":3,"title":"_IO_wide_data结构体","slug":"io-wide-data结构体-1","link":"#io-wide-data结构体-1","children":[]},{"level":3,"title":"虚表","slug":"虚表-1","link":"#虚表-1","children":[]},{"level":3,"title":"虚表实现","slug":"虚表实现-1","link":"#虚表实现-1","children":[]},{"level":3,"title":"劫持puts IO_2_stdout","slug":"劫持puts-io-2-stdout","link":"#劫持puts-io-2-stdout","children":[]}]},{"level":2,"title":"free_hook","slug":"free-hook","link":"#free-hook","children":[]}],"git":{"createdTime":1730325633000,"updatedTime":1734338217000,"contributors":[{"name":"awaqwqa","email":"88972629+awaqwqa@users.noreply.github.com","commits":3}]},"readingTime":{"minutes":12.02,"words":3606},"filePathRelative":"posts/pwn/tool_skill/IO偏移.md","localizedDate":"October 27, 2024","excerpt":"<h1> pwn IO相关偏移</h1>\\n<blockquote>\\n<p>主要是因为有几次比赛,题基本打到IO了但是就剩下十分钟了根本调不通IO链,为了预防这种情况再次出现这里慢慢总结一下IO相关结构体和不同的攻击方式</p>\\n<p>这里主要是快捷提供了一些结构体以及偏移方便直接查询,这里的偏移以<strong>虚表</strong>为主,<strong>虚表实现</strong>主要是辅助我们查找函数的</p>\\n</blockquote>\\n<h2> gdb调试技巧</h2>\\n<ul>\\n<li>\\n<p>查看结构体的偏移量</p>\\n<div class=\\"language-c line-numbers-mode\\" data-ext=\\"c\\"><pre class=\\"language-c\\"><code>ptype <span class=\\"token operator\\">/</span>o <span class=\\"token keyword\\">struct</span> <span class=\\"token class-name\\">xxxx</span> <span class=\\"token comment\\">// 可以获取结构体的偏移量</span>\\n</code></pre><div class=\\"line-numbers\\" aria-hidden=\\"true\\"><div class=\\"line-number\\"></div></div></div><figure><img src=\\"https://awaqwqa.github.io/img/IO偏移/image-20241027104306803.png\\" alt=\\"image-20241027104306803\\" tabindex=\\"0\\" loading=\\"lazy\\"><figcaption>image-20241027104306803</figcaption></figure>\\n</li>\\n<li>\\n<p>查看变量的类型</p>\\n<div class=\\"language-bash line-numbers-mode\\" data-ext=\\"sh\\"><pre class=\\"language-bash\\"><code> ptype 变量 // 可以查看变量类型\\n</code></pre><div class=\\"line-numbers\\" aria-hidden=\\"true\\"><div class=\\"line-number\\"></div></div></div><figure><img src=\\"https://awaqwqa.github.io/img/IO偏移/image-20241027104229082.png\\" alt=\\"image-20241027104229082\\" tabindex=\\"0\\" loading=\\"lazy\\"><figcaption>image-20241027104229082</figcaption></figure>\\n</li>\\n</ul>","autoDesc":true}');export{e as data};
