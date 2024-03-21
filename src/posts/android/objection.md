---
date: 2024-01-25
tag:
  - frida
  - 实战
  - objection
---

# objection 初次体验

> 学习文章[[分享\]objection基本操作与实战-Android安全-看雪-安全社区|安全招聘|kanxue.com](https://bbs.kanxue.com/thread-277929.htm)
>
> [objection 使用详解 - ol4three](https://www.ol4three.com/2022/03/11/Android/objection-使用详解/)

## 链接

- 我们先通过指令查到我们的包名

  ```shell
  adb shell dumpsys window | grep CurrentFocus
  ```

  > 这个指令可以查到当前的窗口的包和目前的class

  ![pack_name](https://awaqwqa.github.io/img/objection/pack_name.png)

  

- 执行指令`objection -g com.netease.x19 explore`

## 初步探索

- 使用指令

  ```shell
  android hooking list activities
  ```

  - 获取目前加载的class 列表 然后找到我们的com.mojang.minecraftpe 进行hook

- hook

  ```shell
  android hooking watch class_method com.mojang.minecraftpe.MainActivity --dump-args --dump-backtrace --dump-return
  ```

  ![image-20240320105839523](https://awaqwqa.github.io/img/objection/image-20240320105839523.png)

  - 出现了报错

  - 哈哈哈哈 我犯蠢了 应该是class 而不是class_method

    ```
    android hooking watch class com.mojang.minecraftpe.MainActivity --dump-args --dump-backtrace --dump-return
    ```

  ![img](https://awaqwqa.github.io/img/objection/img.png)

- 调用了的函数

  ```shell
  (agent) [301082] Called com.mojang.minecraftpe.MainActivity.isTextWidgetActive()
  (agent) [301082] Called com.mojang.minecraftpe.MainActivity.tick()
  (agent) [301082] Called com.mojang.minecraftpe.MainActivity.getCursorPosition()
  
  (agent) [301082] Called com.mojang.minecraftpe.MainActivity.nativeJsCall(java.lang.String, com.mojang.minecraftpe.RNCallPythonRetObj)
  (agent) [301082] Called com.mojang.minecraftpe.MainActivity.getInstance()
  (agent) [301082] Called com.mojang.minecraftpe.MainActivity.setRuntimeMsg(java.lang.String)
  (agent) [301082] Called com.mojang.minecraftpe.MainActivity.nativeSendMessageToJs(java.lang.String)
  (agent) [301082] Called com.mojang.minecraftpe.MainActivity.doesReactNativeExist()
  
  ```

- 查看目前top顶部的activity

  ```shell
  adb shell dumpsys activity top
  ```

  

## 分析

### isTextWidgetActive

```shell
 android hooking watch class_method com.mojang.minecraftpe.MainActivity.isTextWidgetActive --dump-args --dump-backtrace --dump-return
```

![image-20240320113131596](https://awaqwqa.github.io/img/objection/image-20240320113131596.png)

- 这里看名字就大概知道isTextWidgetActive是检测
- 然后这个东西被getCursorPosition调用的

## getCursorPosition

![image-20240320113426950](https://awaqwqa.github.io/img/objection/image-20240320113426950.png)

- 返回值-1

### TICK

![image-20240320114400575](https://awaqwqa.github.io/img/objection/image-20240320114400575.png)



