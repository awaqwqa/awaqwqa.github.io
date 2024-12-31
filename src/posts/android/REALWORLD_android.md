# Android 实战-取证(1)

## 提取data/data目录

> [adb如何获取手机data/data目录下的文件_adb 移动data文件-CSDN博客](https://blog.csdn.net/yingfengzhaozhan7/article/details/25004331)

因为正常情况下无法直接adb pull下来文件,adb正常权限是user

所以我们先进入shell界面

```shell
adb shell
```

然后su变成root用户后 cp指令将我们想要的文件copy到user可以正常访问的目录比如/data/local/tmp

```shell
su
cp -r target_path /data/local/tmp
```

然后tar打包后传出来

```shell
tar -cvf target.tar target_path
```

回到宿主机终端

```shell
adb pull target_path 
```

提取成功

![image-20241218112002935](https://awaqwqa.github.io/img/REALWORLD_android/image-20241218112002935.png)

## 分析databases

进入databases文件夹后,我们可以看见大量的db文件我们一个一个来理清楚职能

这里我们使用的工具是**DataGrip**

![image-20241218112347969](https://awaqwqa.github.io/img/REALWORLD_android/image-20241218112347969.png)

**downloader**

- 看起来是下载管理器 记录了需要哪些切片

**jiayuan_438651205.db**

- 这里很明显就是聊天消息记录了 包含了聊天用户等信息
- Message Table 中包含了聊天消息 好友记录 等内容

> 这里同时还出现了大量其他类型的文件,但是大多数还是没有什么用的比如:db-shm & db-wal下面有关于他们的解释文章
>
> [.db-shm和.db-wal文件-CSDN博客](https://blog.csdn.net/qq_35417527/article/details/113940408)
>
> [[sqlite\] db-journal文件产生原因及说明_.db-journal-CSDN博客](https://blog.csdn.net/mozart_cai/article/details/26815339)

## 获取uid

> 将shared_prefs目录拖入jadx中 搜索数据库的uid名字就可以查到有关uid的文件了

- shared_prefs/curUid.xml 可以获取当前的uid
- shared_prefs/login_info_f.xml可以获取用户名 uid 个人签名 头像等信息

![image-20241219142158333](https://awaqwqa.github.io/img/REALWORLD_android/image-20241219142158333.png)

- 然后根据uid去获取db就行了
