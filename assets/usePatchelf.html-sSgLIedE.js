const e=JSON.parse('{"key":"v-9db4b450","path":"/posts/pwn/usePatchelf.html","title":"记一次patchelf的使用+浅理解ld和libc","lang":"en-US","frontmatter":{"tag":["pwn"],"description":"记一次patchelf的使用+浅理解ld和libc 每次去使用xclibc的时候 都不是特别好使hhh 所以就重新了解一下patchelf的使用参考文章:linux动态链接库的加载顺序_动态链接库顺序-CSDN博客和man ld.so 的翻译_ld-linux.so的man手册-CSDN博客获取程序寻找libc的顺序[转] Linux下程序的加载、运行和终止流程 - JollyWing - 博客园 (cnblogs.com)获取linux加载程序的流程","head":[["meta",{"property":"og:url","content":"https://mister-hope.github.io/posts/pwn/usePatchelf.html"}],["meta",{"property":"og:site_name","content":"Blog"}],["meta",{"property":"og:title","content":"记一次patchelf的使用+浅理解ld和libc"}],["meta",{"property":"og:description","content":"记一次patchelf的使用+浅理解ld和libc 每次去使用xclibc的时候 都不是特别好使hhh 所以就重新了解一下patchelf的使用参考文章:linux动态链接库的加载顺序_动态链接库顺序-CSDN博客和man ld.so 的翻译_ld-linux.so的man手册-CSDN博客获取程序寻找libc的顺序[转] Linux下程序的加载、运行和终止流程 - JollyWing - 博客园 (cnblogs.com)获取linux加载程序的流程"}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"en-US"}],["meta",{"property":"og:updated_time","content":"2024-02-21T16:35:58.000Z"}],["meta",{"property":"article:author","content":"Elegy"}],["meta",{"property":"article:tag","content":"pwn"}],["meta",{"property":"article:modified_time","content":"2024-02-21T16:35:58.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"记一次patchelf的使用+浅理解ld和libc\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2024-02-21T16:35:58.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Elegy\\"}]}"]]},"headers":[{"level":2,"title":"程序寻找libc的顺序","slug":"程序寻找libc的顺序","link":"#程序寻找libc的顺序","children":[]},{"level":2,"title":"linux程序加载简化流程","slug":"linux程序加载简化流程","link":"#linux程序加载简化流程","children":[]},{"level":2,"title":"查看程序当前信息","slug":"查看程序当前信息","link":"#查看程序当前信息","children":[]},{"level":2,"title":"修改程序的ld和libc地址","slug":"修改程序的ld和libc地址","link":"#修改程序的ld和libc地址","children":[]}],"git":{"createdTime":1708533358000,"updatedTime":1708533358000,"contributors":[{"name":"awaqwqa","email":"88972629+awaqwqa@users.noreply.github.com","commits":1}]},"readingTime":{"minutes":2.3,"words":689},"filePathRelative":"posts/pwn/usePatchelf.md","localizedDate":"February 21, 2024","excerpt":"<h1> 记一次patchelf的使用+浅理解ld和libc</h1>\\n<blockquote>\\n<p>每次去使用xclibc的时候 都不是特别好使hhh 所以就重新了解一下patchelf的使用<br>参考文章:<a href=\\"https://blog.csdn.net/byxdaz/article/details/89405588\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">linux动态链接库的加载顺序_动态链接库顺序-CSDN博客</a>和<a href=\\"https://blog.csdn.net/Longyu_wlz/article/details/108511931\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">man ld.so 的翻译_ld-linux.so的man手册-CSDN博客</a>获取程序寻找libc的顺序<br>[<a href=\\"https://www.cnblogs.com/jiqingwu/p/linux_binary_load_and_run.html\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">转] Linux下程序的加载、运行和终止流程 - JollyWing - 博客园 (cnblogs.com)</a>获取linux加载程序的流程</p>\\n</blockquote>","autoDesc":true}');export{e as data};
