---
date:2024-3-20
tag:
  - android

---

# Android xml文件分析

> 主要是说明一些逆向的时候我们需要看的信息 方便我们去分析源码

## 学习文章

- apk文件大致结构:(https://www.52pojie.cn/thread-1781093-1-1.html)](https://zhuanlan.zhihu.com/p/66800574)
- application标签大致说明:[android中application标签说明_android application标签引用class内容-CSDN博客](https://blog.csdn.net/small_love/article/details/6534956)
- 改默认启动activity:[在Android Studio中改变默认的启动Activity_android studio在mainactivity之前运行-CSDN博客](https://blog.csdn.net/my_ideal_life/article/details/97619983?app_version=6.2.9&code=app_1562916241&csdn_share_tail={"type"%3A"blog"%2C"rType"%3A"article"%2C"rId"%3A"97619983"%2C"source"%3A"awaqwqa"}&uLinkId=usr1mkqgl919blen&utm_source=app)
- 详细说明intent-filter :[Android中Intent-filter的四个属性Action，Category，Extras，Data - 天涯海角路 - 博客园 (cnblogs.com)](https://www.cnblogs.com/aademeng/articles/11023803.html)
- 说明intent-filter的action带来的变化:[Intent的各种Action - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/579244790)

## 主标签

- `manifest`标签

  - 包含 基本信息 包名、版本号、SDK版本、应用程序的名称和图标

  ![mainifest](https://awaqwqa.github.io/img/xml文件格式分析/mainifest.png)

- `application` 标签

  - 包含全局属性 :主题 权限等等
    - 列举几个逆向中常用的属性
    - `android:allowClearUserData` :是否给用户删除数据的权限
    - `android:debuggable` :是否可以使用debug调试 -->一般我们要改成`true`

  - 包含四大组件的标签 尤其是`activity`我们一般都是从activity分析起走

  ![application](https://awaqwqa.github.io/img/xml文件格式分析/application.png)

## 默认activity

> 往往一些实际项目中我们xml文件中有多个`activity`标签

![more_activity](https://awaqwqa.github.io/img/xml文件格式分析/more_activity.png)

- 那么问题来了我们的首先启动的activity究竟是什么？
  - 根据文章[在Android Studio中改变默认的启动Activity_android studio在mainactivity之前运行-CSDN博客](https://blog.csdn.net/my_ideal_life/article/details/97619983?app_version=6.2.9&code=app_1562916241&csdn_share_tail={"type"%3A"blog"%2C"rType"%3A"article"%2C"rId"%3A"97619983"%2C"source"%3A"awaqwqa"}&uLinkId=usr1mkqgl919blen&utm_source=app)可以知道可以通过添加`<intent-filter>`标签来实现设置

### intent-filter标签

> 参考文章:[Android中Intent-filter的四个属性Action，Category，Extras，Data - 天涯海角路 - 博客园 (cnblogs.com)](https://www.cnblogs.com/aademeng/articles/11023803.html)
>
> 主要是包含了一些属性 我们就列举一些目前逆向过程中遇见的

- `action` 属性定义了我们的一些系统行为

  - ` ACTION_MAIN`

    > 定义了Android Application的入口 并且这个属性只能在android应用中有一个

    ![action_main](https://awaqwqa.github.io/img/xml文件格式分析/action_main.png)

  - `ACTION_VIEW`

    > 会根据不同的参数来打开不同的界面 详细看[Intent的各种Action - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/579244790)

    ![intent_filter_view](https://awaqwqa.github.io/img/xml文件格式分析/intent_filter_view.png)

- `Category`属性 定义了一些activity的执行方式

  - `CATEGORY_LAUNCHER`主要和`action`中的`android.intent.action.MAIN`搭配 来确定默认首先进入的`activity`

### 默认activity标志

- 通过上面信息 我们可以知道 我们有两个特征值
  - intent-filter中action
  - intent-filter中category

![main_activity_filter](https://awaqwqa.github.io/img/xml文件格式分析/main_activity_filter.png)

- 我们成功筛选出我们的主activity 然后分析即可