const t=JSON.parse('{"key":"v-325457f2","path":"/posts/pwn/linux/linux_kernel2.html","title":"不好看的linux内核学习(2) dirty pipe/cow学习","lang":"en-US","frontmatter":{"tag":["pwn","kernel"],"description":"不好看的linux内核学习(2) dirty pipe/cow学习 参考文章:https://blog.csdn.net/jasonliuvip/article/details/22600569 https://zhuanlan.zhihu.com/p/25918300 https://blog.csdn.net/hbhgyu/article/details/106245182 mmap函数:https://blog.csdn.net/qq_41687938/article/details/119901916 脏页面:https://blog.csdn.net/shift_wwx/article/details/122497891 匿名页:https://blog.csdn.net/jasonchen_gbd/article/details/79462014 linux下的特殊文件:https://blog.csdn.net/pi9nc/article/details/18257593 反向映射机制:https://zhuanlan.zhihu.com/p/363319174 madvise函数:https://blog.csdn.net/sz66cm/article/details/139334306 dirty cow详解:https://xuanxuanblingbling.github.io/ctf/pwn/2019/11/18/race/ (巨推荐) get_user_pages:https://zhuanlan.zhihu.com/p/579444153 缺页异常：https://www.anquanke.com/post/id/290851 pde和pte:https://blog.csdn.net/q1007729991/article/details/52723478 管道:https://zhuanlan.zhihu.com/p/470183989 Dirty pipe :https://blog.csdn.net/void_zk/article/details/125884637 Pipe_write源码分析:https://xz.aliyun.com/t/11016?time__1311=Cq0x2QD%3DqDT4l2zYGQqpxQq0I1tqWumD linux寻址机制:https://www.cnblogs.com/binlovetech/p/17571929.html","head":[["meta",{"property":"og:url","content":"https://mister-hope.github.io/posts/pwn/linux/linux_kernel2.html"}],["meta",{"property":"og:site_name","content":"Blog"}],["meta",{"property":"og:title","content":"不好看的linux内核学习(2) dirty pipe/cow学习"}],["meta",{"property":"og:description","content":"不好看的linux内核学习(2) dirty pipe/cow学习 参考文章:https://blog.csdn.net/jasonliuvip/article/details/22600569 https://zhuanlan.zhihu.com/p/25918300 https://blog.csdn.net/hbhgyu/article/details/106245182 mmap函数:https://blog.csdn.net/qq_41687938/article/details/119901916 脏页面:https://blog.csdn.net/shift_wwx/article/details/122497891 匿名页:https://blog.csdn.net/jasonchen_gbd/article/details/79462014 linux下的特殊文件:https://blog.csdn.net/pi9nc/article/details/18257593 反向映射机制:https://zhuanlan.zhihu.com/p/363319174 madvise函数:https://blog.csdn.net/sz66cm/article/details/139334306 dirty cow详解:https://xuanxuanblingbling.github.io/ctf/pwn/2019/11/18/race/ (巨推荐) get_user_pages:https://zhuanlan.zhihu.com/p/579444153 缺页异常：https://www.anquanke.com/post/id/290851 pde和pte:https://blog.csdn.net/q1007729991/article/details/52723478 管道:https://zhuanlan.zhihu.com/p/470183989 Dirty pipe :https://blog.csdn.net/void_zk/article/details/125884637 Pipe_write源码分析:https://xz.aliyun.com/t/11016?time__1311=Cq0x2QD%3DqDT4l2zYGQqpxQq0I1tqWumD linux寻址机制:https://www.cnblogs.com/binlovetech/p/17571929.html"}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"en-US"}],["meta",{"property":"og:updated_time","content":"2024-10-18T01:32:42.000Z"}],["meta",{"property":"article:author","content":"Elegy"}],["meta",{"property":"article:tag","content":"pwn"}],["meta",{"property":"article:tag","content":"kernel"}],["meta",{"property":"article:modified_time","content":"2024-10-18T01:32:42.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"不好看的linux内核学习(2) dirty pipe/cow学习\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2024-10-18T01:32:42.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Elegy\\"}]}"]]},"headers":[{"level":2,"title":"前置知识","slug":"前置知识","link":"#前置知识","children":[{"level":3,"title":"管道","slug":"管道","link":"#管道","children":[]},{"level":3,"title":"PDE 和 PTE","slug":"pde-和-pte","link":"#pde-和-pte","children":[]},{"level":3,"title":"脏页面","slug":"脏页面","link":"#脏页面","children":[]},{"level":3,"title":"splice函数","slug":"splice函数","link":"#splice函数","children":[]},{"level":3,"title":"/proc/self/mem","slug":"proc-self-mem","link":"#proc-self-mem","children":[]},{"level":3,"title":"COW","slug":"cow","link":"#cow","children":[]},{"level":3,"title":"mmap","slug":"mmap","link":"#mmap","children":[]},{"level":3,"title":"madvise函数","slug":"madvise函数","link":"#madvise函数","children":[]},{"level":3,"title":"PTE内核如何通过pte管理内存的映射关系","slug":"pte内核如何通过pte管理内存的映射关系","link":"#pte内核如何通过pte管理内存的映射关系","children":[]}]},{"level":2,"title":"DirtyCOW漏洞成因","slug":"dirtycow漏洞成因","link":"#dirtycow漏洞成因","children":[{"level":3,"title":"mmap cow","slug":"mmap-cow","link":"#mmap-cow","children":[]},{"level":3,"title":"madvise","slug":"madvise","link":"#madvise","children":[]},{"level":3,"title":"结合","slug":"结合","link":"#结合","children":[]}]},{"level":2,"title":"DirtyCow源码分析","slug":"dirtycow源码分析","link":"#dirtycow源码分析","children":[{"level":3,"title":"POC","slug":"poc","link":"#poc","children":[]},{"level":3,"title":"mmap私有映射文件","slug":"mmap私有映射文件","link":"#mmap私有映射文件","children":[]}]},{"level":2,"title":"DirtyPipe漏洞成因","slug":"dirtypipe漏洞成因","link":"#dirtypipe漏洞成因","children":[]}],"git":{"createdTime":1727546937000,"updatedTime":1729215162000,"contributors":[{"name":"Elegy","email":"88972629+awaqwqa@users.noreply.github.com","commits":4}]},"readingTime":{"minutes":16.97,"words":5091},"filePathRelative":"posts/pwn/linux/linux_kernel2.md","localizedDate":"September 28, 2024","excerpt":"<h1> 不好看的linux内核学习(2) dirty pipe/cow学习</h1>\\n<blockquote>\\n<p>参考文章:https://blog.csdn.net/jasonliuvip/article/details/22600569</p>\\n<p>https://zhuanlan.zhihu.com/p/25918300</p>\\n<p>https://blog.csdn.net/hbhgyu/article/details/106245182</p>\\n<p>mmap函数:https://blog.csdn.net/qq_41687938/article/details/119901916</p>\\n<p>脏页面:https://blog.csdn.net/shift_wwx/article/details/122497891</p>\\n<p>匿名页:https://blog.csdn.net/jasonchen_gbd/article/details/79462014</p>\\n<p>linux下的特殊文件:https://blog.csdn.net/pi9nc/article/details/18257593</p>\\n<p>反向映射机制:https://zhuanlan.zhihu.com/p/363319174</p>\\n<p>madvise函数:https://blog.csdn.net/sz66cm/article/details/139334306</p>\\n<p>dirty cow详解:https://xuanxuanblingbling.github.io/ctf/pwn/2019/11/18/race/ (巨推荐)</p>\\n<p>get_user_pages:https://zhuanlan.zhihu.com/p/579444153</p>\\n<p>缺页异常：https://www.anquanke.com/post/id/290851</p>\\n<p>pde和pte:https://blog.csdn.net/q1007729991/article/details/52723478</p>\\n<p>管道:https://zhuanlan.zhihu.com/p/470183989</p>\\n<p>Dirty pipe :https://blog.csdn.net/void_zk/article/details/125884637</p>\\n<p>Pipe_write源码分析:https://xz.aliyun.com/t/11016?time__1311=Cq0x2QD%3DqDT4l2zYGQqpxQq0I1tqWumD</p>\\n<p>linux寻址机制:https://www.cnblogs.com/binlovetech/p/17571929.html</p>\\n</blockquote>","autoDesc":true}');export{t as data};