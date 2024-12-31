import{_ as e}from"./plugin-vue_export-helper-x3n3nnut.js";import{r as t,o,c as i,a as n,b as s,d as p,e as c}from"./app-mtXdL8hD.js";const l={},u=n("h1",{id:"go的websocket",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#go的websocket","aria-hidden":"true"},"#"),s(" Go的websocket")],-1),r={href:"https://learnku.com/articles/41957",target:"_blank",rel:"noopener noreferrer"},d=n("p",null,"websocket协议实现相对简单,使用的http协议进行初始握手,然后就建立链接.本质websocket还是用的TCP进行读取与写入",-1),k=c(`<h2 id="go中建立websocket" tabindex="-1"><a class="header-anchor" href="#go中建立websocket" aria-hidden="true">#</a> go中建立websocket</h2><blockquote><p>在go中建立websocket链接本质是对普通链接的升级。</p></blockquote><div class="language-go line-numbers-mode" data-ext="go"><pre class="language-go"><code><span class="token comment">// handler/ws/echo.go</span>
<span class="token keyword">package</span> ws

<span class="token keyword">import</span> <span class="token punctuation">(</span>
    <span class="token string">&quot;fmt&quot;</span>
    <span class="token string">&quot;github.com/gorilla/websocket&quot;</span>
    <span class="token string">&quot;net/http&quot;</span>
<span class="token punctuation">)</span>

<span class="token keyword">var</span> upgrader <span class="token operator">=</span> websocket<span class="token punctuation">.</span>Upgrader<span class="token punctuation">{</span>
    ReadBufferSize<span class="token punctuation">:</span>  <span class="token number">1024</span><span class="token punctuation">,</span>
    WriteBufferSize<span class="token punctuation">:</span> <span class="token number">1024</span><span class="token punctuation">,</span>
<span class="token punctuation">}</span>

<span class="token keyword">func</span> <span class="token function">EchoMessage</span><span class="token punctuation">(</span>w http<span class="token punctuation">.</span>ResponseWriter<span class="token punctuation">,</span> r <span class="token operator">*</span>http<span class="token punctuation">.</span>Request<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    conn<span class="token punctuation">,</span> <span class="token boolean">_</span> <span class="token operator">:=</span> upgrader<span class="token punctuation">.</span><span class="token function">Upgrade</span><span class="token punctuation">(</span>w<span class="token punctuation">,</span> r<span class="token punctuation">,</span> <span class="token boolean">nil</span><span class="token punctuation">)</span> 

    <span class="token keyword">for</span> <span class="token punctuation">{</span>
        <span class="token comment">// 读取客户端的消息</span>
        msgType<span class="token punctuation">,</span> msg<span class="token punctuation">,</span> err <span class="token operator">:=</span> conn<span class="token punctuation">.</span><span class="token function">ReadMessage</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
        <span class="token keyword">if</span> err <span class="token operator">!=</span> <span class="token boolean">nil</span> <span class="token punctuation">{</span>
            <span class="token keyword">return</span>
        <span class="token punctuation">}</span>

        <span class="token comment">// 把消息打印到标准输出</span>
        fmt<span class="token punctuation">.</span><span class="token function">Printf</span><span class="token punctuation">(</span><span class="token string">&quot;%s sent: %s\\n&quot;</span><span class="token punctuation">,</span> conn<span class="token punctuation">.</span><span class="token function">RemoteAddr</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token function">string</span><span class="token punctuation">(</span>msg<span class="token punctuation">)</span><span class="token punctuation">)</span>

        <span class="token comment">// 把消息写回客户端，完成回音</span>
        <span class="token keyword">if</span> err <span class="token operator">=</span> conn<span class="token punctuation">.</span><span class="token function">WriteMessage</span><span class="token punctuation">(</span>msgType<span class="token punctuation">,</span> msg<span class="token punctuation">)</span><span class="token punctuation">;</span> err <span class="token operator">!=</span> <span class="token boolean">nil</span> <span class="token punctuation">{</span>
            <span class="token keyword">return</span>
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><p>这里的EchoMessage就是Handler 实现了Handler接口(也就是参数为:http.ResponesWriter接口和Request指针)</p><ul><li>http.ResponesWriter主要负责响应的header和响应数据返回给客户端 一共有三个方法 <ul><li>Header返回Header对象</li><li>Write()向网络链接中写响应数据</li><li>WriteHeader()方法将给定的响应状态码和响应Header一起发送出去。</li></ul></li></ul></li><li><p>这里upgarder是用于升级http为websocket链接的</p><div class="language-go line-numbers-mode" data-ext="go"><pre class="language-go"><code><span class="token keyword">type</span> Upgrader <span class="token keyword">struct</span> <span class="token punctuation">{</span>
    <span class="token comment">// 升级 websocket 握手完成的超时时间</span>
    HandshakeTimeout time<span class="token punctuation">.</span>Duration

    <span class="token comment">// io 操作的缓存大小，如果不指定就会自动分配。</span>
    ReadBufferSize<span class="token punctuation">,</span> WriteBufferSize <span class="token builtin">int</span>

    <span class="token comment">// 写数据操作的缓存池，如果没有设置值，write buffers 将会分配到链接生命周期里。</span>
    WriteBufferPool BufferPool

    <span class="token comment">//按顺序指定服务支持的协议，如值存在，则服务会从第一个开始匹配客户端的协议。</span>
    Subprotocols <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token builtin">string</span>

    <span class="token comment">// http 的错误响应函数，如果没有设置 Error 则，会生成 http.Error 的错误响应。</span>
    Error <span class="token keyword">func</span><span class="token punctuation">(</span>w http<span class="token punctuation">.</span>ResponseWriter<span class="token punctuation">,</span> r <span class="token operator">*</span>http<span class="token punctuation">.</span>Request<span class="token punctuation">,</span> status <span class="token builtin">int</span><span class="token punctuation">,</span> reason <span class="token builtin">error</span><span class="token punctuation">)</span>

    <span class="token comment">// 如果请求Origin标头可以接受，CheckOrigin将返回true。 如果CheckOrigin为nil，则使用安全默认值：如果Origin请求头存在且原始主机不等于请求主机头，则返回false。</span>
    <span class="token comment">// 请求检查函数，用于统一的链接检查，以防止跨站点请求伪造。如果不检查，就设置一个返回值为true的函数</span>
    CheckOrigin <span class="token keyword">func</span><span class="token punctuation">(</span>r <span class="token operator">*</span>http<span class="token punctuation">.</span>Request<span class="token punctuation">)</span> <span class="token builtin">bool</span>

    <span class="token comment">// EnableCompression 指定服务器是否应尝试协商每个邮件压缩（RFC 7692）。 将此值设置为true并不能保证将支持压缩。 目前仅支持“无上下文接管”模式</span>
    EnableCompression <span class="token builtin">bool</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li>checkOrigin可以实现拦截请求 返回true则为放行 false则为不放行</li></ul></li></ul><h2 id="go检测websocket链接是否存在" tabindex="-1"><a class="header-anchor" href="#go检测websocket链接是否存在" aria-hidden="true">#</a> go检测websocket链接是否存在</h2><blockquote><p>[go检测websocket连接是否存在。 - CSDN文库](https://wenku.csdn.net/answer/72997379cf7b47e3ba92e51a413d2529#:~:text=go检测websocket连接是否存在。 时间%3A 2023-07-30 15%3A09%3A42 浏览%3A 112,可以通过检查 websocket.CloseError 来确定连接是否存在。 如果为 nil ，则连接仍然存在。)</p></blockquote><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>if err:= conn.WriteMessage(websocket.PingMessage,[]byte{});err != nil {
	if websocket.IsCloseError(err,websocket.CloseGoingAway,websocket.CloseAbnormalClosure){
		// 链接已经关闭
    }else{
		// 发生了其他错误
	}
}
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,7);function v(b,m){const a=t("ExternalLinkIcon");return o(),i("div",null,[u,n("blockquote",null,[n("p",null,[s("参考文章:"),n("a",r,[s("使用 Go 语言创建 WebSocket 服务 | Go 技术论坛 (learnku.com)"),p(a)])]),d]),k])}const f=e(l,[["render",v],["__file","websocket.html.vue"]]);export{f as default};
