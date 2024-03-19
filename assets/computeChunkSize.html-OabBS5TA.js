const e=JSON.parse('{"key":"v-43bd25bc","path":"/posts/pwn/heap/computeChunkSize.html","title":"写一个计算chunk大小的程序","lang":"en-US","frontmatter":{"tag":["pwn","heap"],"description":"写一个计算chunk大小的程序 由于做题的时候老是脑子不够用 无法根据malloc(num)中的num获取chunk的size 所以我就决定自己写一个程序来完成这个工作并且好好理解一下怎么计算的 原理 最小chunk为0x20 chunk一定是size_sz *2 的倍数(内存对齐) chunk可以占用下一个chunk的prev_size来存东西 所以我们就是看是否malloc的大小 +size所占字节数 然后是否内存对齐 如果没有则加到对齐 然后 判断最后的size是否小于0x20 如果小于则直接等于0x20 所以直接使用公式:(num + 8 +0xf)&amp;~0xf; 其中num就是我们malloc传的参数","head":[["meta",{"property":"og:url","content":"https://mister-hope.github.io/posts/pwn/heap/computeChunkSize.html"}],["meta",{"property":"og:site_name","content":"Blog"}],["meta",{"property":"og:title","content":"写一个计算chunk大小的程序"}],["meta",{"property":"og:description","content":"写一个计算chunk大小的程序 由于做题的时候老是脑子不够用 无法根据malloc(num)中的num获取chunk的size 所以我就决定自己写一个程序来完成这个工作并且好好理解一下怎么计算的 原理 最小chunk为0x20 chunk一定是size_sz *2 的倍数(内存对齐) chunk可以占用下一个chunk的prev_size来存东西 所以我们就是看是否malloc的大小 +size所占字节数 然后是否内存对齐 如果没有则加到对齐 然后 判断最后的size是否小于0x20 如果小于则直接等于0x20 所以直接使用公式:(num + 8 +0xf)&amp;~0xf; 其中num就是我们malloc传的参数"}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"en-US"}],["meta",{"property":"og:updated_time","content":"2024-03-03T05:34:14.000Z"}],["meta",{"property":"article:author","content":"Elegy"}],["meta",{"property":"article:tag","content":"pwn"}],["meta",{"property":"article:tag","content":"heap"}],["meta",{"property":"article:modified_time","content":"2024-03-03T05:34:14.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"写一个计算chunk大小的程序\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2024-03-03T05:34:14.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Elegy\\"}]}"]]},"headers":[{"level":2,"title":"原理","slug":"原理","link":"#原理","children":[]},{"level":2,"title":"脚本","slug":"脚本","link":"#脚本","children":[]}],"git":{"createdTime":1709444054000,"updatedTime":1709444054000,"contributors":[{"name":"awaqwqa","email":"88972629+awaqwqa@users.noreply.github.com","commits":1}]},"readingTime":{"minutes":0.86,"words":259},"filePathRelative":"posts/pwn/heap/computeChunkSize.md","localizedDate":"March 3, 2024","excerpt":"<h1> 写一个计算chunk大小的程序</h1>\\n<blockquote>\\n<p>由于做题的时候老是脑子不够用 无法根据malloc(num)中的num获取chunk的size 所以我就决定自己写一个程序来完成这个工作并且好好理解一下怎么计算的</p>\\n</blockquote>\\n<h2> 原理</h2>\\n<ul>\\n<li>\\n<p>最小<code>chunk</code>为0x20</p>\\n</li>\\n<li>\\n<p><code>chunk</code>一定是<code>size_sz *2 </code>的倍数(内存对齐)</p>\\n</li>\\n<li>\\n<p><code>chunk</code>可以占用下一个<code>chunk</code>的<code>prev_size</code>来存东西</p>\\n</li>\\n<li>\\n<p>所以我们就是看是否malloc的大小 +<code>size</code>所占字节数 然后是否内存对齐 如果没有则加到对齐 然后 判断最后的size是否小于0x20 如果小于则直接等于0x20</p>\\n<blockquote>\\n<p>所以直接使用公式:(num + 8 +0xf)&amp;~0xf; 其中num就是我们malloc传的参数</p>\\n</blockquote>\\n</li>\\n</ul>","autoDesc":true}');export{e as data};