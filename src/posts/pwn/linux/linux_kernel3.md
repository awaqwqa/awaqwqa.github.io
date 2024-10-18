# 不好看的linux内核学习(3)userfaultfd

> 有时候我们需要条件竞争,但是成功概率感人,为了提高我们的条件竞争成功的概率,我们可以利用userfaultfd机制
>
> 参考文章:https://blog.jcix.top/2018-10-01/userfaultfd_intro/
>
> https://blog.csdn.net/seaaseesa/article/details/104650794
>
> Poll:https://blog.csdn.net/weixin_39757802/article/details/134914867

内核为了提升开发的灵活性,将一些内核处理的任务拿给了用户态来完成.其中就有匿名页的缺页处理

### 环境

> 使用userfaultfd需要内核开启**CONFIG_USERFAULTFD**选项

![image-20241014094350492](/Users/elegy/Library/Application Support/typora-user-images/image-20241014094350492.png)

## 前置知识

### POLL机制

> 在userfault的处理函数中,我们常用**poll**进行监听
>
> **poll** 是一种I/O多路复用机制，它可以同时监视多个文件描述符，当其中任意一个文件描述符就绪时，就会通知程序进行相应的读写操作。

#### 使用

我们可以通过注册pollfd结构体数组,将事件监听注册进入**poll_list**链表,来实现注册我们想要监听的事件

**poll**会去轮询整个**poll_list**获取响应事件

```c
int poll(struct pollfd *fds, nfds_t nfds, int timeout);
```

- fds是监听事件的机构体数组
- nfds是监听事件的结构体数组长度
- timeout是等待时间

重点主要是**pollfd**结构体

```c
struct pollfd {    
    int fd;     
    short events;    
    short revents;
};
```

- 然后这里的`events`

  ```shell
  #define POLLIN      0x0001 可读
  #define POLLPRI     0x0002
  #define POLLOUT     0x0004
  #define POLLERR     0x0008
  #define POLLHUP     0x0010
  #define POLLNVAL    0x0020
  #define POLLRDNORM  0x0040
  #define POLLRDBAND  0x0080
  #define POLLWRNORM  0x0100
  #define POLLWRBAND  0x0200
  #define POLLMSG     0x0400
  #define POLLREMOVE  0x1000
  #define POLLRDHUP   0x2000
  #define POLLFREE    0x4000
  #define POLL_BUSY_LOOP 0x8000
  ```



## 使用

