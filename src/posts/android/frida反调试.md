---
date: 2024-01-15
tag:
  - frida
  - 实战
---

# frida的反调试

> 这里学习到的 我们调试一个程序的时候 我们首先要获取它的包名<br>提前声明这里实战 只是为了学习 学习经验()

## 实战

### 获取包名

- 这里看教程大概就是 去找到AndroidMainfest.xml文件 然后搜索`package=xxxx`这个xxxx就是包的名字
  - 这里我们拿到包名字:`com.netease.x19`

### hook 一个测试脚本

```js
function main() {
    Java.enumerateLoadedClasses({
        onMatch: function(name, handler) {
            if(name.indexOf("com.netease.x19") != -1) {
                console.log(name);
                var clz = Java.use(name);
                var methods = clz.class.getDeclaredMethods();
                for(var i = 0; i < methods.length; i++) {
                    console.log("name:", name, "methods:", methods[i]);
                }
            }
        },
        onComplete: function() {
            
        }
    });
}


setImmediate(
    function(){
        console.log("test")
        Java.perform(main);
    }
)
```

- 然后
- 我们执行指令

```shell
frida -U -f com.netease.x19 -l hook.js --no-pause
```

> 然后发生报错:<br>
>
> ```shell
> usage: frida [options] target
> frida: error: unrecognized arguments: --no-pause
> ```
>
> <br>这里搜了去 发现frida在新版本中移除了--no-pause 所以我们就不带这个了

- 执行完上面的hook指令后发现了报错

  ```js
  Failed to spawn: need Gadget to attach on jailed Android; its default location is: C:\Users\61428\AppData\Local\Microsoft\Windows\INetCache\frida\gadget-android-arm64.so
  ```

  - 然后搜索发现是我修改了默认的端口号为`11451` 所以我带上参数:`-H 127.0.0.1:11451`

  ```js
  frida -H 127.0.0.1:11451 -f com.netease.x19 -l hook.js 
  ```

- 执行成功

  ```shell
       ____
      / _  |   Frida 16.1.8 - A world-class dynamic instrumentation toolkit
     | (_| |
      > _  |   Commands:
     /_/ |_|       help      -> Displays the help system
     . . . .       object?   -> Display information about 'object'
     . . . .       exit/quit -> Exit
     . . . .
     . . . .   More info at https://frida.re/docs/home/
     . . . .
     . . . .   Connected to 127.0.0.1:11451 (id=socket@127.0.0.1:11451)
  Spawned `com.netease.x19`. Resuming main thread!
  [Remote::com.netease.x19 ]->

- 然后我们得到了一堆数据 太多了 这里放不下 接下来我们需要筛选(留着后天来写)
