const e=JSON.parse('{"key":"v-750d4f64","path":"/posts/pwn/heap/xyctf_heap_pro.html","title":"xyctf ptmp的做题记录(glibc2.35下的exit函数打法)","lang":"en-US","frontmatter":{"description":"xyctf ptmp的做题记录(glibc2.35下的exit函数打法) 审题 add函数 malloc一个0x18的chunk(0x20) 属性分别对应:size isUsed buff 并且仅在创建的时候可以写入数据 并且没有检测这个index是否在使用 所以我们可以对一个index无限malloc image-20240418005442527 delete函数 直接free记录信息的chunk和我们的内容体chunk(buff) 并且没有清空 image-20240418005502800 view函数 直接write出size大小的内容 存在泄露 image-20240418005523801 atexit函数 image-20240418131700409","head":[["meta",{"property":"og:url","content":"https://mister-hope.github.io/posts/pwn/heap/xyctf_heap_pro.html"}],["meta",{"property":"og:site_name","content":"Blog"}],["meta",{"property":"og:title","content":"xyctf ptmp的做题记录(glibc2.35下的exit函数打法)"}],["meta",{"property":"og:description","content":"xyctf ptmp的做题记录(glibc2.35下的exit函数打法) 审题 add函数 malloc一个0x18的chunk(0x20) 属性分别对应:size isUsed buff 并且仅在创建的时候可以写入数据 并且没有检测这个index是否在使用 所以我们可以对一个index无限malloc image-20240418005442527 delete函数 直接free记录信息的chunk和我们的内容体chunk(buff) 并且没有清空 image-20240418005502800 view函数 直接write出size大小的内容 存在泄露 image-20240418005523801 atexit函数 image-20240418131700409"}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"en-US"}],["meta",{"property":"og:updated_time","content":"2024-05-06T02:39:03.000Z"}],["meta",{"property":"article:author","content":"Elegy"}],["meta",{"property":"article:modified_time","content":"2024-05-06T02:39:03.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"xyctf ptmp的做题记录(glibc2.35下的exit函数打法)\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2024-05-06T02:39:03.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Elegy\\"}]}"]]},"headers":[{"level":2,"title":"审题","slug":"审题","link":"#审题","children":[]},{"level":2,"title":"大致利用原理:","slug":"大致利用原理","link":"#大致利用原理","children":[]},{"level":2,"title":"泄露libc heap","slug":"泄露libc-heap","link":"#泄露libc-heap","children":[]},{"level":2,"title":"伪造fake chunk","slug":"伪造fake-chunk","link":"#伪造fake-chunk","children":[{"level":3,"title":"示意图","slug":"示意图","link":"#示意图","children":[]},{"level":3,"title":"fastbin合并机制","slug":"fastbin合并机制","link":"#fastbin合并机制","children":[]},{"level":3,"title":"构造fakecchunk","slug":"构造fakecchunk","link":"#构造fakecchunk","children":[]}]},{"level":2,"title":"泄露tls+0x30","slug":"泄露tls-0x30","link":"#泄露tls-0x30","children":[{"level":3,"title":"fd加密机制","slug":"fd加密机制","link":"#fd加密机制","children":[]}]},{"level":2,"title":"劫持exit_funcs链表","slug":"劫持exit-funcs链表","link":"#劫持exit-funcs链表","children":[]}],"git":{"createdTime":1714963143000,"updatedTime":1714963143000,"contributors":[{"name":"awaqwqa","email":"88972629+awaqwqa@users.noreply.github.com","commits":1}]},"readingTime":{"minutes":7.79,"words":2337},"filePathRelative":"posts/pwn/heap/xyctf_heap_pro.md","localizedDate":"May 6, 2024","excerpt":"<h1> xyctf ptmp的做题记录(glibc2.35下的exit函数打法)</h1>\\n<h2> 审题</h2>\\n<ul>\\n<li>\\n<p>add函数 malloc一个0x18的chunk(0x20) 属性分别对应:size isUsed buff 并且仅在创建的时候可以写入数据 并且没有检测这个index是否在使用 所以我们可以对一个index无限malloc</p>\\n<figure><img src=\\"https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418005442527.png\\" alt=\\"image-20240418005442527\\" tabindex=\\"0\\" loading=\\"lazy\\"><figcaption>image-20240418005442527</figcaption></figure>\\n</li>\\n<li>\\n<p>delete函数 直接free记录信息的chunk和我们的内容体chunk(buff) 并且没有清空</p>\\n<figure><img src=\\"https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418005502800.png\\" alt=\\"image-20240418005502800\\" tabindex=\\"0\\" loading=\\"lazy\\"><figcaption>image-20240418005502800</figcaption></figure>\\n</li>\\n<li>\\n<p>view函数 直接write出size大小的内容 存在泄露</p>\\n<figure><img src=\\"https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418005523801.png\\" alt=\\"image-20240418005523801\\" tabindex=\\"0\\" loading=\\"lazy\\"><figcaption>image-20240418005523801</figcaption></figure>\\n</li>\\n<li>\\n<p>atexit函数</p>\\n<figure><img src=\\"https://awaqwqa.github.io/img/xyctf_heap_pro/image-20240418131700409.png\\" alt=\\"image-20240418131700409\\" tabindex=\\"0\\" loading=\\"lazy\\"><figcaption>image-20240418131700409</figcaption></figure>\\n</li>\\n</ul>","autoDesc":true}');export{e as data};
