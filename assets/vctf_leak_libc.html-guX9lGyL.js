const e=JSON.parse('{"key":"v-495e7439","path":"/posts/pwn/heap/vctf_leak_libc.html","title":"vctf apples leak libc操作复现","lang":"en-US","frontmatter":{"tag":["pwn","heap"],"description":"vctf apples leak libc操作复现 题目中存在off_by_one libc版本2.34以上我们没办法使用常规的overlapping 泄露libc地址 所以我们要精心构造一个chunk head来绕过新版本的检查机制 实现leak libc的操作 文章中我们先将原理 在最后会将Arahat0师傅的脚本给出来() 安全检查机制 2.34下的合并检查机制 检查size是否对得上 image-20240325110240440 unlink检查 image-20240325110339049","head":[["meta",{"property":"og:url","content":"https://mister-hope.github.io/posts/pwn/heap/vctf_leak_libc.html"}],["meta",{"property":"og:site_name","content":"Blog"}],["meta",{"property":"og:title","content":"vctf apples leak libc操作复现"}],["meta",{"property":"og:description","content":"vctf apples leak libc操作复现 题目中存在off_by_one libc版本2.34以上我们没办法使用常规的overlapping 泄露libc地址 所以我们要精心构造一个chunk head来绕过新版本的检查机制 实现leak libc的操作 文章中我们先将原理 在最后会将Arahat0师傅的脚本给出来() 安全检查机制 2.34下的合并检查机制 检查size是否对得上 image-20240325110240440 unlink检查 image-20240325110339049"}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"en-US"}],["meta",{"property":"og:updated_time","content":"2024-03-25T07:08:01.000Z"}],["meta",{"property":"article:author","content":"Elegy"}],["meta",{"property":"article:tag","content":"pwn"}],["meta",{"property":"article:tag","content":"heap"}],["meta",{"property":"article:modified_time","content":"2024-03-25T07:08:01.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"vctf apples leak libc操作复现\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2024-03-25T07:08:01.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Elegy\\"}]}"]]},"headers":[{"level":2,"title":"安全检查机制","slug":"安全检查机制","link":"#安全检查机制","children":[]},{"level":2,"title":"利用原理","slug":"利用原理","link":"#利用原理","children":[]},{"level":2,"title":"利用","slug":"利用","link":"#利用","children":[{"level":3,"title":"构造chunk header","slug":"构造chunk-header","link":"#构造chunk-header","children":[]},{"level":3,"title":"构造FD->bk","slug":"构造fd-bk","link":"#构造fd-bk","children":[]},{"level":3,"title":"构造BK->fd","slug":"构造bk-fd","link":"#构造bk-fd","children":[]},{"level":3,"title":"构造合并chunk","slug":"构造合并chunk","link":"#构造合并chunk","children":[]}]},{"level":2,"title":"脚本","slug":"脚本","link":"#脚本","children":[]}],"git":{"createdTime":1711350481000,"updatedTime":1711350481000,"contributors":[{"name":"awaqwqa","email":"88972629+awaqwqa@users.noreply.github.com","commits":1}]},"readingTime":{"minutes":5.47,"words":1640},"filePathRelative":"posts/pwn/heap/vctf_leak_libc.md","localizedDate":"March 25, 2024","excerpt":"<h1> vctf apples leak libc操作复现</h1>\\n<blockquote>\\n<p>题目中存在off_by_one libc版本2.34以上我们没办法使用常规的overlapping 泄露libc地址</p>\\n<p>所以我们要精心构造一个chunk head来绕过新版本的检查机制 实现leak libc的操作</p>\\n<p>文章中我们先将原理 在最后会将Arahat0师傅的脚本给出来()</p>\\n</blockquote>\\n<h2> 安全检查机制</h2>\\n<ul>\\n<li>\\n<p>2.34下的合并检查机制</p>\\n<ul>\\n<li>检查size是否对得上</li>\\n</ul>\\n<figure><img src=\\"https://awaqwqa.github.io/img/vctf_leak_libc/image-20240325110240440.png\\" alt=\\"image-20240325110240440\\" tabindex=\\"0\\" loading=\\"lazy\\"><figcaption>image-20240325110240440</figcaption></figure>\\n<ul>\\n<li>\\n<p>unlink检查</p>\\n<figure><img src=\\"https://awaqwqa.github.io/img/vctf_leak_libc/image-20240325110339049.png\\" alt=\\"image-20240325110339049\\" tabindex=\\"0\\" loading=\\"lazy\\"><figcaption>image-20240325110339049</figcaption></figure>\\n</li>\\n</ul>\\n</li>\\n</ul>","autoDesc":true}');export{e as data};
