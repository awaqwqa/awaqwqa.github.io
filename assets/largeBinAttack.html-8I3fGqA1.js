const e=JSON.parse('{"key":"v-64cbeebf","path":"/posts/pwn/heap/largeBinAttack.html","title":"large Bin Attack学习（_int_malloc源码细读 ）","lang":"en-US","frontmatter":{"tag":["pwn","heap"],"description":"large Bin Attack学习（_int_malloc源码细读 ） 参考文章:wiki:Large Bin Attack - CTF Wiki (ctf-wiki.org)源码级调试glibc:源码级调试glibc_glibc cannot be compiled without optimization-CSDN博客源码分析:glibc 2.31 malloc与free 源码分析（持续更新） - PwnKi - 博客园 (cnblogs.com)+glibc malloc源码分析 - PwnKi - 博客园 (cnblogs.com)详细拆分了_int_malloc的流程 并且按照功能分了标题 想要了解对应部分就直接点击标题跳转即可第一次阅读glibc的源码然后进行分析 有错误的地方请大佬指正","head":[["meta",{"property":"og:url","content":"https://mister-hope.github.io/posts/pwn/heap/largeBinAttack.html"}],["meta",{"property":"og:site_name","content":"Blog"}],["meta",{"property":"og:title","content":"large Bin Attack学习（_int_malloc源码细读 ）"}],["meta",{"property":"og:description","content":"large Bin Attack学习（_int_malloc源码细读 ） 参考文章:wiki:Large Bin Attack - CTF Wiki (ctf-wiki.org)源码级调试glibc:源码级调试glibc_glibc cannot be compiled without optimization-CSDN博客源码分析:glibc 2.31 malloc与free 源码分析（持续更新） - PwnKi - 博客园 (cnblogs.com)+glibc malloc源码分析 - PwnKi - 博客园 (cnblogs.com)详细拆分了_int_malloc的流程 并且按照功能分了标题 想要了解对应部分就直接点击标题跳转即可第一次阅读glibc的源码然后进行分析 有错误的地方请大佬指正"}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"en-US"}],["meta",{"property":"og:updated_time","content":"2024-03-10T17:43:45.000Z"}],["meta",{"property":"article:author","content":"Elegy"}],["meta",{"property":"article:tag","content":"pwn"}],["meta",{"property":"article:tag","content":"heap"}],["meta",{"property":"article:modified_time","content":"2024-03-10T17:43:45.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"large Bin Attack学习（_int_malloc源码细读 ）\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2024-03-10T17:43:45.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Elegy\\"}]}"]]},"headers":[{"level":2,"title":"源码分析(largebin malloc)","slug":"源码分析-largebin-malloc","link":"#源码分析-largebin-malloc","children":[{"level":3,"title":"Unsortedbin的合并/入链/分配操作","slug":"unsortedbin的合并-入链-分配操作","link":"#unsortedbin的合并-入链-分配操作","children":[]},{"level":3,"title":"遍历的开始（梦的开始）","slug":"遍历的开始-梦的开始","link":"#遍历的开始-梦的开始","children":[]},{"level":3,"title":"调试","slug":"调试","link":"#调试","children":[]},{"level":3,"title":"安全检查机制","slug":"安全检查机制","link":"#安全检查机制","children":[]},{"level":3,"title":"直接返回smallbin_chunk情况","slug":"直接返回smallbin-chunk情况","link":"#直接返回smallbin-chunk情况","children":[]},{"level":3,"title":"从unsortedbin中移除","slug":"从unsortedbin中移除","link":"#从unsortedbin中移除","children":[]},{"level":3,"title":"大小刚好相等情况","slug":"大小刚好相等情况","link":"#大小刚好相等情况","children":[]},{"level":3,"title":"归类入链操作","slug":"归类入链操作","link":"#归类入链操作","children":[]},{"level":3,"title":"small 和 large最终入bin操作","slug":"small-和-large最终入bin操作","link":"#small-和-large最终入bin操作","children":[]},{"level":3,"title":"smallbin的fwd bck赋值","slug":"smallbin的fwd-bck赋值","link":"#smallbin的fwd-bck赋值","children":[]},{"level":3,"title":"largebin 入bin链和chunk size链","slug":"largebin-入bin链和chunk-size链","link":"#largebin-入bin链和chunk-size链","children":[]},{"level":3,"title":"从largebin中获取chunk","slug":"从largebin中获取chunk","link":"#从largebin中获取chunk","children":[]},{"level":3,"title":"chunk脱链 remainder chunk入链","slug":"chunk脱链-remainder-chunk入链","link":"#chunk脱链-remainder-chunk入链","children":[]},{"level":3,"title":"返回被切割后的chunk","slug":"返回被切割后的chunk","link":"#返回被切割后的chunk","children":[]},{"level":3,"title":"从topchunk中获取chunk","slug":"从topchunk中获取chunk","link":"#从topchunk中获取chunk","children":[]},{"level":3,"title":"_int_free_源码","slug":"int-free-源码","link":"#int-free-源码","children":[]}]},{"level":2,"title":"漏洞利用","slug":"漏洞利用","link":"#漏洞利用","children":[]}],"git":{"createdTime":1709888180000,"updatedTime":1710092625000,"contributors":[{"name":"awaqwqa","email":"88972629+awaqwqa@users.noreply.github.com","commits":4}]},"readingTime":{"minutes":15.23,"words":4568},"filePathRelative":"posts/pwn/heap/largeBinAttack.md","localizedDate":"March 8, 2024","excerpt":"<h1> large Bin Attack学习（_int_malloc源码细读 ）</h1>\\n<blockquote>\\n<p>参考文章:<br>wiki:<a href=\\"https://ctf-wiki.org/pwn/linux/user-mode/heap/ptmalloc2/large-bin-attack/\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">Large Bin Attack - CTF Wiki (ctf-wiki.org)</a><br>源码级调试glibc:<a href=\\"https://blog.csdn.net/astrotycoon/article/details/52662685\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">源码级调试glibc_glibc cannot be compiled without optimization-CSDN博客</a><br>源码分析:<a href=\\"https://www.cnblogs.com/luoleqi/p/15520621.html\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">glibc 2.31 malloc与free 源码分析（持续更新） - PwnKi - 博客园 (cnblogs.com)</a>+<a href=\\"https://www.cnblogs.com/luoleqi/p/12731875.html#_int_malloc\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">glibc malloc源码分析 - PwnKi - 博客园 (cnblogs.com)</a><br>详细拆分了_int_malloc的流程 并且按照功能分了标题 想要了解对应部分就直接点击标题跳转即可<br>第一次阅读glibc的源码然后进行分析 有错误的地方请大佬指正</p>\\n</blockquote>","autoDesc":true}');export{e as data};