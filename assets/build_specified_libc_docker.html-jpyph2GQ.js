import{_ as l}from"./plugin-vue_export-helper-x3n3nnut.js";import{r as t,o as c,c as o,a as n,b as e,d as a,e as i}from"./app-oN8zB6o4.js";const r={},d=n("h1",{id:"构建指定版本libc的docker",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#构建指定版本libc的docker","aria-hidden":"true"},"#"),e(" 构建指定版本libc的docker")],-1),p=n("br",null,null,-1),u={href:"https://blog.csdn.net/weixin_44344462/article/details/88525655",target:"_blank",rel:"noopener noreferrer"},b=n("br",null,null,-1),m={href:"https://bbs.kanxue.com/thread-280028.htm",target:"_blank",rel:"noopener noreferrer"},h=n("br",null,null,-1),k={href:"https://blog.csdn.net/anqixiang/article/details/106545603",target:"_blank",rel:"noopener noreferrer"},v=n("h2",{id:"版本对应",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#版本对应","aria-hidden":"true"},"#"),e(" 版本对应")],-1),g=n("p",null,"Ubuntu20.04：libc-2.31 Ubuntu18.04：linc-2.27 Ubuntu16.04：libc-2.23 Ubuntu14.04：libc-2.19docke",-1),_=n("h2",{id:"操作指令",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#操作指令","aria-hidden":"true"},"#"),e(" 操作指令")],-1),f=n("blockquote",null,[n("p",null,[e("这里只是浅浅展示一下基础会用到的指令 然后将遇到的报错展示出来 以及对应的解决方法 "),n("br")])],-1),x=i(`<p>install cmd:</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code><span class="token function">docker</span> pull ubuntu:xx.xx
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div>`,2),q=i(`<p>然后因为我下载了<code>docker destop</code>导致报错:</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code>error during connect: this error may indicate that the <span class="token function">docker</span> daemon is not running: Get <span class="token string">&quot;http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.24/images/json&quot;</span><span class="token builtin class-name">:</span> <span class="token function">open</span> //./pipe/docker_engine: The system cannot <span class="token function">find</span> the <span class="token function">file</span> specified.
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div>`,2),w={href:"https://blog.csdn.net/tangcv/article/details/112238084",target:"_blank",rel:"noopener noreferrer"},E=i(`<li><p>结果没办法解决 继续报错:</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code>switching to windows engine: request failed and retry attempts exhausted: Post <span class="token string">&quot;http://ipc/engine/switch&quot;</span><span class="token builtin class-name">:</span> <span class="token function">open</span> <span class="token punctuation">\\</span><span class="token punctuation">\\</span>.<span class="token punctuation">\\</span>pipe<span class="token punctuation">\\</span>dockerBackendApiServer: The system cannot <span class="token function">find</span> the <span class="token function">file</span> specified.
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div></li><li><p>然后开启destop后 自动就好了 怪</p></li>`,2),I=i(`<li><p>查看镜像</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code><span class="token function">docker</span> images
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><ul><li><p>结果:</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code>REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
ubuntu       <span class="token number">22.04</span>     3db8720ecbf5   <span class="token number">2</span> weeks ago    <span class="token number">77</span>.9MB
ubuntu       <span class="token number">18.04</span>     f9a80a55f492   <span class="token number">9</span> months ago   <span class="token number">63</span>.2MB
ubuntu       <span class="token number">16.04</span>     b6f507652425   <span class="token number">2</span> years ago    135MB
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div></li></ul></li><li><p>运行images</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code><span class="token function">docker</span> run <span class="token parameter variable">-d</span> <span class="token parameter variable">-p</span> 宿主机端口:容器端口 <span class="token parameter variable">--name</span> 容器名称 镜像的标识:镜像名称<span class="token punctuation">[</span>:tag<span class="token punctuation">]</span>
// 我们使用 可以直接进入docker内部
<span class="token function">docker</span> run <span class="token parameter variable">-id</span> <span class="token parameter variable">--name</span><span class="token operator">=</span><span class="token string">&quot;pwn&quot;</span> b6f507652425 /bin/sh
// <span class="token parameter variable">-i</span> 即使未链接stdin<span class="token punctuation">(</span>标准输入<span class="token punctuation">)</span>也保持打开状态 并且分配一个交互终端
// <span class="token parameter variable">-t</span> 容器启动后直接进入命令行
// <span class="token parameter variable">-d</span> 后台运行
// 所以我在这里选择的是 <span class="token parameter variable">-id</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div></li><li><p>查看正在执行的容器</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code><span class="token function">docker</span> <span class="token function">ps</span> <span class="token parameter variable">-a</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><ul><li><p>结果</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code>CONTAINER ID   IMAGE          COMMAND       CREATED         STATUS                     PORTS     NAMES
af2e5d02e3e8   b6f507652425   <span class="token string">&quot;/bin/bash&quot;</span>   <span class="token number">3</span> seconds ago   Exited <span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span> <span class="token number">3</span> seconds ago             pwn_docker
6711535f8c6a   3db8720ecbf5   <span class="token string">&quot;/bin/bash&quot;</span>   <span class="token number">4</span> minutes ago   Exited <span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span> <span class="token number">4</span> minutes ago             confident_pike
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div></li></ul></li><li><p>进入docker</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code><span class="token function">docker</span> <span class="token builtin class-name">exec</span> <span class="token parameter variable">-it</span> container_id /bin/sh 
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div></li><li><p>向docker内部传文件</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code><span class="token function">docker</span> <span class="token function">cp</span> 本地地址 container_id:docker内路径
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><ul><li><p>也可以docker 内部传给本地</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code><span class="token function">docker</span> <span class="token function">cp</span> container_di:docker内路径 本地地址
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div></li></ul></li>`,5),y=i(`<h2 id="主力pwn环境" tabindex="-1"><a class="header-anchor" href="#主力pwn环境" aria-hidden="true">#</a> 主力pwn环境</h2><blockquote><p>由于我的vmware中ubuntu再次崩溃了 然后忘记存快照了 所以转使用docker</p></blockquote><ul><li><p>文章中推荐的主力pwn环境是:</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code>skysider/pwndocker
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div></li></ul><h3 id="pull-image" tabindex="-1"><a class="header-anchor" href="#pull-image" aria-hidden="true">#</a> pull image</h3><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code><span class="token function">docker</span> pull skysider/pwndocker
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><h3 id="error" tabindex="-1"><a class="header-anchor" href="#error" aria-hidden="true">#</a> error</h3><blockquote><p>进入后使用apt发生报错</p></blockquote><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code>Err:1 http://mirrors.aliyun.com/ubuntu bionic InRelease
  <span class="token number">400</span>  Bad Request <span class="token punctuation">[</span>IP: <span class="token number">120.226</span>.194.113 <span class="token number">80</span><span class="token punctuation">]</span>
Err:2 http://mirrors.aliyun.com/ubuntu bionic-security InRelease
  <span class="token number">400</span>  Bad Request <span class="token punctuation">[</span>IP: <span class="token number">120.226</span>.194.113 <span class="token number">80</span><span class="token punctuation">]</span>
Err:3 http://mirrors.aliyun.com/ubuntu bionic-updates InRelease
  <span class="token number">400</span>  Bad Request <span class="token punctuation">[</span>IP: <span class="token number">120.226</span>.194.113 <span class="token number">80</span><span class="token punctuation">]</span>
Err:4 http://mirrors.aliyun.com/ubuntu bionic-proposed InRelease
  <span class="token number">400</span>  Bad Request <span class="token punctuation">[</span>IP: <span class="token number">120.226</span>.194.113 <span class="token number">80</span><span class="token punctuation">]</span>
Err:5 http://mirrors.aliyun.com/ubuntu bionic-backports InRelease
  <span class="token number">400</span>  Bad Request <span class="token punctuation">[</span>IP: <span class="token number">120.226</span>.194.113 <span class="token number">80</span><span class="token punctuation">]</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,8),R=n("p",null,"我以为是docker无法链接外部网络的问题 但是ping baidu.com又是可以的 找了很多文章都没有解决 结果加速器一关久解决好了",-1),N={href:"https://blog.csdn.net/flr_0831/article/details/135708335",target:"_blank",rel:"noopener noreferrer"},S=i(`<div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code>--- baidu.com <span class="token function">ping</span> statistics ---
<span class="token number">15</span> packets transmitted, <span class="token number">14</span> received, <span class="token number">6.66667</span>% packet loss, <span class="token function">time</span> 17696ms
rtt min/avg/max/mdev <span class="token operator">=</span> <span class="token number">37.782</span>/38.619/41.413/0.892 ms
root@936a687b2420:/ctf<span class="token comment"># ping http://222.187.238.94:9527/</span>
ping: http://222.187.238.94:9527/: Name or <span class="token function">service</span> not known
root@936a687b2420:/ctf<span class="token comment"># ping 222.187.238.94:9527</span>
ping: <span class="token number">222.187</span>.238.94:9527: Name or <span class="token function">service</span> not known
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,1),B=n("h2",{id:"各版本的轻量级pwn环境",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#各版本的轻量级pwn环境","aria-hidden":"true"},"#"),e(" 各版本的轻量级pwn环境")],-1),C={href:"https://hub.docker.com/r/roderickchan/debug_pwn_env/tags",target:"_blank",rel:"noopener noreferrer"},D=n("br",null,null,-1),T=n("li",null,[n("p",null,"然后就是我没找到ubuntu16.04版本的也就是libc版本为2.23的 因为这个版本之下没有tcache作为一些原理 所以我选择自己拿ubuntu16.04进行搭建轻量级环境")],-1),A=n("p",null,"下载python",-1),P={href:"https://blog.csdn.net/qq_35743870/article/details/125903040",target:"_blank",rel:"noopener noreferrer"},M={href:"https://blog.csdn.net/yongbaoii/article/details/113750991",target:"_blank",rel:"noopener noreferrer"};function U(G,O){const s=t("ExternalLinkIcon");return c(),o("div",null,[d,n("blockquote",null,[n("p",null,[e("因为在阅读文章的时候 复现它的操作发现它的libc版本太低了 导致我们的复现失败 所以这里学习docker构造指定版本的libc环境"),p,e("参考文章:"),n("a",u,[e("Docker配置任意版本编译环境（GCC升级、降级、指定版本）_如何降低docker里面的gcc版本-CSDN博客"),a(s)]),b,n("a",m,[e("使用docker调试和部署pwn题-Pwn-看雪-安全社区|安全招聘|kanxue.com"),a(s)]),h,n("a",k,[e("docker run 命令详解（新手入门必备）-CSDN博客"),a(s)])])]),v,g,_,f,n("ul",null,[n("li",null,[x,n("ul",null,[n("li",null,[q,n("ul",null,[n("li",null,[n("p",null,[e("找到解决文章:"),n("a",w,[e("docker 桌面版报错error during connect: This error may indicate that the docker daemon is not running.:-CSDN博客"),a(s)])])]),E])])])]),I]),y,n("ul",null,[n("li",null,[R,n("blockquote",null,[n("p",null,[e("大概是docker代理的问题 hhh后面找到个类似的解决的文章:"),n("a",N,[e("Windows docker镜像 apt update时提示400 Bad Request_docker 400 bad request-CSDN博客"),a(s)])])]),S])]),B,n("blockquote",null,[n("p",null,[e("有大佬已经写好了:"),n("a",C,[e("roderickchan/debug_pwn_env Tags | Docker Hub"),a(s)]),D,e("我们只需要根据ubuntu的版本 找到我们需要的libc版本进行下载即可")])]),n("ul",null,[T,n("li",null,[A,n("blockquote",null,[n("p",null,[e("直接apt install 是3.5版本 连pip都下载不起 所以参考文章:"),n("a",P,[e("Ubuntu16.04安装Python3.8，3.7，3.9(含卸载方法，支持多版本共存)-CSDN博客"),a(s)])])])]),n("li",null,[n("p",null,[e("然后根据"),n("a",M,[e("docker从0搭建ubuntu16.04pwn环境_pwn docker ubuntu16-CSDN博客"),a(s)]),e("进行搭建pwn环境即可")])])])])}const L=l(r,[["render",U],["__file","build_specified_libc_docker.html.vue"]]);export{L as default};
