---
date: 2024-7-22
tag:	
  - go
  - 开发
---

# Go的websocket

> 参考文章:[使用 Go 语言创建 WebSocket 服务 | Go 技术论坛 (learnku.com)](https://learnku.com/articles/41957)
>
> websocket协议实现相对简单,使用的http协议进行初始握手,然后就建立链接.本质websocket还是用的TCP进行读取与写入

## go中建立websocket

> 在go中建立websocket链接本质是对普通链接的升级。

```go
// handler/ws/echo.go
package ws

import (
    "fmt"
    "github.com/gorilla/websocket"
    "net/http"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
}

func EchoMessage(w http.ResponseWriter, r *http.Request) {
    conn, _ := upgrader.Upgrade(w, r, nil) 

    for {
        // 读取客户端的消息
        msgType, msg, err := conn.ReadMessage()
        if err != nil {
            return
        }

        // 把消息打印到标准输出
        fmt.Printf("%s sent: %s\n", conn.RemoteAddr(), string(msg))

        // 把消息写回客户端，完成回音
        if err = conn.WriteMessage(msgType, msg); err != nil {
            return
        }
    }
}
```

- 这里的EchoMessage就是Handler 实现了Handler接口(也就是参数为:http.ResponesWriter接口和Request指针)
  - http.ResponesWriter主要负责响应的header和响应数据返回给客户端 一共有三个方法
    - Header返回Header对象
    - Write()向网络链接中写响应数据
    - WriteHeader()方法将给定的响应状态码和响应Header一起发送出去。

- 这里upgarder是用于升级http为websocket链接的 

  ```go
  type Upgrader struct {
      // 升级 websocket 握手完成的超时时间
      HandshakeTimeout time.Duration
  
      // io 操作的缓存大小，如果不指定就会自动分配。
      ReadBufferSize, WriteBufferSize int
  
      // 写数据操作的缓存池，如果没有设置值，write buffers 将会分配到链接生命周期里。
      WriteBufferPool BufferPool
  
      //按顺序指定服务支持的协议，如值存在，则服务会从第一个开始匹配客户端的协议。
      Subprotocols []string
  
      // http 的错误响应函数，如果没有设置 Error 则，会生成 http.Error 的错误响应。
      Error func(w http.ResponseWriter, r *http.Request, status int, reason error)
  
      // 如果请求Origin标头可以接受，CheckOrigin将返回true。 如果CheckOrigin为nil，则使用安全默认值：如果Origin请求头存在且原始主机不等于请求主机头，则返回false。
      // 请求检查函数，用于统一的链接检查，以防止跨站点请求伪造。如果不检查，就设置一个返回值为true的函数
      CheckOrigin func(r *http.Request) bool
  
      // EnableCompression 指定服务器是否应尝试协商每个邮件压缩（RFC 7692）。 将此值设置为true并不能保证将支持压缩。 目前仅支持“无上下文接管”模式
      EnableCompression bool
  }
  ```

  - checkOrigin可以实现拦截请求 返回true则为放行 false则为不放行

## go检测websocket链接是否存在

> [go检测websocket连接是否存在。 - CSDN文库](https://wenku.csdn.net/answer/72997379cf7b47e3ba92e51a413d2529#:~:text=go检测websocket连接是否存在。 时间%3A 2023-07-30 15%3A09%3A42 浏览%3A 112,可以通过检查 websocket.CloseError 来确定连接是否存在。 如果为 nil ，则连接仍然存在。)

```
if err:= conn.WriteMessage(websocket.PingMessage,[]byte{});err != nil {
	if websocket.IsCloseError(err,websocket.CloseGoingAway,websocket.CloseAbnormalClosure){
		// 链接已经关闭
    }else{
		// 发生了其他错误
	}
}
```

