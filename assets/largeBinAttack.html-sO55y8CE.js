const t=JSON.parse('{"key":"v-64cbeebf","path":"/posts/pwn/heap/largeBinAttack.html","title":"large Bin Attack学习（_int_malloc源码细读 ）","lang":"en-US","frontmatter":{"tag":["pwn","heap"],"description":"large Bin Attack学习（_int_malloc源码细读 ） 参考文章:wiki:Large Bin Attack - CTF Wiki (ctf-wiki.org)源码级调试glibc:源码级调试glibc_glibc cannot be compiled without optimization-CSDN博客源码分析:glibc 2.31 malloc与free 源码分析（持续更新） - PwnKi - 博客园 (cnblogs.com)+glibc malloc源码分析 - PwnKi - 博客园 (cnblogs.com)详细拆分了_int_malloc的流程 并且按照功能分了标题 想要了解对应部分就直接点击标题跳转即可第一次阅读glibc的源码然后进行分析 有错误的地方请大佬指正","head":[["meta",{"property":"og:url","content":"https://mister-hope.github.io/posts/pwn/heap/largeBinAttack.html"}],["meta",{"property":"og:site_name","content":"Blog"}],["meta",{"property":"og:title","content":"large Bin Attack学习（_int_malloc源码细读 ）"}],["meta",{"property":"og:description","content":"large Bin Attack学习（_int_malloc源码细读 ） 参考文章:wiki:Large Bin Attack - CTF Wiki (ctf-wiki.org)源码级调试glibc:源码级调试glibc_glibc cannot be compiled without optimization-CSDN博客源码分析:glibc 2.31 malloc与free 源码分析（持续更新） - PwnKi - 博客园 (cnblogs.com)+glibc malloc源码分析 - PwnKi - 博客园 (cnblogs.com)详细拆分了_int_malloc的流程 并且按照功能分了标题 想要了解对应部分就直接点击标题跳转即可第一次阅读glibc的源码然后进行分析 有错误的地方请大佬指正"}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"en-US"}],["meta",{"property":"og:updated_time","content":"2024-03-09T07:47:03.000Z"}],["meta",{"property":"article:author","content":"Elegy"}],["meta",{"property":"article:tag","content":"pwn"}],["meta",{"property":"article:tag","content":"heap"}],["meta",{"property":"article:modified_time","content":"2024-03-09T07:47:03.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"large Bin Attack学习（_int_malloc源码细读 ）\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2024-03-09T07:47:03.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Elegy\\"}]}"]]},"headers":[{"level":2,"title":"源码分析(largebin malloc)","slug":"源码分析-largebin-malloc","link":"#源码分析-largebin-malloc","children":[{"level":3,"title":"Unsortedbin的合并/入链/分配操作","slug":"unsortedbin的合并-入链-分配操作","link":"#unsortedbin的合并-入链-分配操作","children":[]}]},{"level":2,"title":"漏洞利用","slug":"漏洞利用","link":"#漏洞利用","children":[]}],"git":{"createdTime":1709888180000,"updatedTime":1709970423000,"contributors":[{"name":"awaqwqa","email":"88972629+awaqwqa@users.noreply.github.com","commits":2}]},"readingTime":{"minutes":10.2,"words":3060},"filePathRelative":"posts/pwn/heap/largeBinAttack.md","localizedDate":"March 8, 2024","excerpt":"<h1> large Bin Attack学习（_int_malloc源码细读 ）</h1>\\n<blockquote>\\n<p>参考文章:<br>wiki:<a href=\\"https://ctf-wiki.org/pwn/linux/user-mode/heap/ptmalloc2/large-bin-attack/\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">Large Bin Attack - CTF Wiki (ctf-wiki.org)</a><br>源码级调试glibc:<a href=\\"https://blog.csdn.net/astrotycoon/article/details/52662685\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">源码级调试glibc_glibc cannot be compiled without optimization-CSDN博客</a><br>源码分析:<a href=\\"https://www.cnblogs.com/luoleqi/p/15520621.html\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">glibc 2.31 malloc与free 源码分析（持续更新） - PwnKi - 博客园 (cnblogs.com)</a>+<a href=\\"https://www.cnblogs.com/luoleqi/p/12731875.html#_int_malloc\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">glibc malloc源码分析 - PwnKi - 博客园 (cnblogs.com)</a><br>详细拆分了_int_malloc的流程 并且按照功能分了标题 想要了解对应部分就直接点击标题跳转即可<br>第一次阅读glibc的源码然后进行分析 有错误的地方请大佬指正</p>\\n</blockquote>","autoDesc":true}');export{t as data};
