---
date: 2024-4-6
tag:
  - python
---

# python asyncio学习

> 文章:[技术揭秘 | 理解 asyncio 来构建高性能 Python 网络程序 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/168275509)
>
> [python中的asyncio使用详解_python asyncio-CSDN博客](https://blog.csdn.net/bluehawksky/article/details/106283636)

## 基础对象

- Eventloop
- Future
- Promise
-  Generator

### eventloop

> 注册事件 并对每个事件添加callback回调函数 会去循环以及准备好的堵塞事件 触发其回调函数

```python
class EventLoop:
    def __init__(self):
        self.events_to_listen = []
        self.callbacks = {}
    def register(self,event,callback):
        self.events_to_listen.append(event)
        self.callbacks[event] = callback
    def unregister(self,event):
        self.events_to_listen.remove(event)
        del self.callbacks[event]
    def _process_events(self,events):
        for event in events:
            self.callbacks[events](event)
    def start_loop(self):
        while True:
            events_happend = poll_events(self.events_to_listen,timeout)
            self._process_events(events_happend)
```

- 就相当于我们向里面注册会堵塞的事件 然后当这个事件完成的时候再自动触发其回调函数 这样就不会堵塞了

### Future

> 和名字表达的意思一样 也就是当一个函数是异步状态的时候 返回值通常不会马上获取到 为了代码的可读性以及逻辑的连贯性 我们选择返回一个future对象
>
> 相当于为未来可能的值占位的作用 经历了`promise`过程后future将会塞入返回值 下面是其接口 简单来说就是设置删除检查三步走

- future值相关

  - result()获取future的值
  - set_result()设置future的值
  - cancel()取消一个future
  - cancancel()查看future是否已经被取消了
  - add_done_callback(callback,*,context=None)设置一个future完成时候要触发的回调函数
  - done()查看future是否有值

- 异常相关

  - exception()获取一个异常
  - set_exception()设置异常

  

### Generator生成器

> 这种就类似于lua中的协程了 主要通过yield关键字来实现切换控制权

- 当我们在函数使用了yield关键字后 函数调用的时候就变成了生成器 会返回一个生成器对象 此时函数并未真正在执行

  ```python
  num = 0
  def gen():
      global num
      print("函数执行")
      for i in range(3):
          num+= yield i
  g = gen()
  print(g)
  ```

  ![image-20240406165914445](C:\Users\NewOm\AppData\Roaming\Typora\typora-user-images\image-20240406165914445.png)

- 生成器对象.send(arg)后args会变成yield的返回值 出现在函数内部 并且当我调用send的时候 函数才会真正执行 send的返回值是yield右侧的值

  ```python
  num = 0
  def gen():
      global num
      print("函数被调用")
      for i in range(3):
          num+= yield i
          print("num的值为:",num)
  g = gen()
  print(g.send(None))
  print(g.send(3))
  ```

  ![image-20240406170144040](C:\Users\NewOm\AppData\Roaming\Typora\typora-user-images\image-20240406170144040.png)

## 基本使用

- asyncio.gather() 并发 启动

  ```python
  await asyncio.gather(testa(1),testb(2))
  ```

  - 这里testa和testb就同步运行了 只需要把函数调用(async声明的)作为参数传入asyncio.gather中即可

- task启动