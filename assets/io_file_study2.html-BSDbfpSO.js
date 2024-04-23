const l=JSON.parse('{"key":"v-6d1ad62f","path":"/posts/pwn/io_file/io_file_study2.html","title":"FSOP细读","lang":"en-US","frontmatter":{"tag":["pwn","io_file"],"description":"FSOP细读 io_file中经典利用 核心L_IO_flush_all_lockp函数的利用 利用条件 知道libc基地址 _IO_list_all 是作为全局变量储存在 libc.so 中的 _IO_flush_all_lockp(libc 2.23) 三种情况下会被自动触发: 当 libc 执行 abort 流程时 当执行 exit 函数时 当执行流从 main 函数返回时","head":[["meta",{"property":"og:url","content":"https://mister-hope.github.io/posts/pwn/io_file/io_file_study2.html"}],["meta",{"property":"og:site_name","content":"Blog"}],["meta",{"property":"og:title","content":"FSOP细读"}],["meta",{"property":"og:description","content":"FSOP细读 io_file中经典利用 核心L_IO_flush_all_lockp函数的利用 利用条件 知道libc基地址 _IO_list_all 是作为全局变量储存在 libc.so 中的 _IO_flush_all_lockp(libc 2.23) 三种情况下会被自动触发: 当 libc 执行 abort 流程时 当执行 exit 函数时 当执行流从 main 函数返回时"}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"en-US"}],["meta",{"property":"og:updated_time","content":"2024-04-21T08:55:18.000Z"}],["meta",{"property":"article:author","content":"Elegy"}],["meta",{"property":"article:tag","content":"pwn"}],["meta",{"property":"article:tag","content":"io_file"}],["meta",{"property":"article:modified_time","content":"2024-04-21T08:55:18.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"FSOP细读\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2024-04-21T08:55:18.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Elegy\\"}]}"]]},"headers":[{"level":2,"title":"利用条件","slug":"利用条件","link":"#利用条件","children":[]},{"level":2,"title":"_IO_flush_all_lockp(libc 2.23)","slug":"io-flush-all-lockp-libc-2-23","link":"#io-flush-all-lockp-libc-2-23","children":[{"level":3,"title":"获取fp","slug":"获取fp","link":"#获取fp","children":[]},{"level":3,"title":"所有的文件流","slug":"所有的文件流","link":"#所有的文件流","children":[]}]},{"level":2,"title":"libc2.24 防御机制","slug":"libc2-24-防御机制","link":"#libc2-24-防御机制","children":[{"level":3,"title":"IO_validate_vtable","slug":"io-validate-vtable","link":"#io-validate-vtable","children":[]}]},{"level":2,"title":"libc2.24 IO_file利用","slug":"libc2-24-io-file利用","link":"#libc2-24-io-file利用","children":[{"level":3,"title":"小知识点","slug":"小知识点","link":"#小知识点","children":[]},{"level":3,"title":"对_IO_buf_base进行劫持","slug":"对-io-buf-base进行劫持","link":"#对-io-buf-base进行劫持","children":[]}]}],"git":{"createdTime":1713688764000,"updatedTime":1713689718000,"contributors":[{"name":"awaqwqa","email":"88972629+awaqwqa@users.noreply.github.com","commits":2}]},"readingTime":{"minutes":2.09,"words":627},"filePathRelative":"posts/pwn/io_file/io_file_study2.md","localizedDate":"April 21, 2024","excerpt":"<h1> FSOP细读</h1>\\n<blockquote>\\n<p>io_file中经典利用 核心L_IO_flush_all_lockp函数的利用</p>\\n</blockquote>\\n<h2> 利用条件</h2>\\n<ul>\\n<li>\\n<p>知道libc基地址</p>\\n<blockquote>\\n<p>_IO_list_all 是作为全局变量储存在 libc.so 中的</p>\\n</blockquote>\\n</li>\\n</ul>\\n<h2> _IO_flush_all_lockp(libc 2.23)</h2>\\n<blockquote>\\n<p>三种情况下会被自动触发:</p>\\n<ol>\\n<li>\\n<p>当 libc 执行 abort 流程时</p>\\n</li>\\n<li>\\n<p>当执行 exit 函数时</p>\\n</li>\\n<li>\\n<p>当执行流从 main 函数返回时</p>\\n</li>\\n</ol>\\n</blockquote>","autoDesc":true}');export{l as data};