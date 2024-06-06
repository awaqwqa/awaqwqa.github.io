---
date: 2024-5-14
tag:
  - os	
  - socket
---
# Socket通讯

> 因为很久以前就知道了沙盒可以使用socket通讯进行传输程序 但是其实一直没有深度了解一下 只是大概知道有这么一个东西 现在仔细了解一下顺便把udp tcp等东西再进行了解一下
>
> 参考文章:[socket通讯原理及例程（一看就懂）-腾讯云开发者社区-腾讯云 (tencent.com)](https://cloud.tencent.com/developer/article/2105819)
>
> [(3 封私信 / 38 条消息) TCP和Udp的区别是什么？ - 知乎 (zhihu.com)](https://www.zhihu.com/question/47378601)

## TCP/IP UDP

`udp`(user data protocol 用户数据协议)属于TCP/IP协议的家族 这里放原文中的图 很方便理解

![这里写图片描述](https://ask.qcloudimg.com/http-save/yehe-8223537/017733fcf6fb5f2b509bf1081d1bbfb3.jpg)

- 然后这里涉及到了udp和tcp 这就不得不去提及一下那一张很生草但是又形象的图了

  ![img](https://picx.zhimg.com/80/v2-a02d439c75221d1a5f0b11a1f7fd3d87_1440w.webp?source=1def8aca)

  - 我们可以从图中大概知道 tcp是`面对连接`的传输层协议 传输数据之前都是必须创建链接的 tcp是一对一的两点服务 tcp是有序号的 并且在进行传输的时候比如我发送了一个数据过去 对面会返回我已经收到 所以我们可以清楚的知道哪些数据是成功收到的哪些数据是失败的 这样我们就可以针对失败的数据重发包
  - udp是不需要链接的 可以一对多 多对多
  - `tcp`的开销较大 因为首部长度在无`选项`的时候是20字节 所以还会更长 而`udp`是固定的8字节

## socket的加入

> 这里也是放原文的图  Socket是应用层与TCP/IP协议族通信的中间软件抽象层，它是一组接口 
>
> `socket`是传输层的协议

![这里写图片描述](https://ask.qcloudimg.com/http-save/yehe-8223537/928985564c57abd471012dd72fc90d81.jpg)

- socket的存在将大量的复杂网络通讯协议等隐藏了起来 我们主要是针对socket提供的接口进行一个调用

## WEBsocket

> `websocket`是通过模仿`socket`协议产生的 我们只需要关心我们监听了什么端口然后调用read函数返回了什么数据 我们如何处理数据以及怎么把数据返还回去 但是值得注意的是`websocket`是`应用层协议`而`socket`就是上文讲述的是`传输层`的协议

- `websocket`是建立在TCP协议之上的 我们需要进行TCP的三次握手 但是到了真正传输的时候是不需要HTTP传输的

- `WebSocket` 是类似 Socket 的 TCP 长连接的通讯模式