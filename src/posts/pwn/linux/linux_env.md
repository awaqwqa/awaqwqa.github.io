---
date: 2024-10-2
Tag:
  - pwn
  - kernel
  - env
---

# linux kernel pwn环境搭建(Mac)

> 主要是写一个自动化的脚本可以编译linux内核，然后制作根文件系,最后qemu启动

## 小知识点

### useradd指令

> 参考文章:https://www.runoob.com/linux/linux-comm-useradd.html

```shell
useradd [-mMnr][-c <备注>][-d <登入目录>][-e <有效期限>][-f <缓冲天数>][-g <群组>][-G <群组>][-s <shell>][-u <uid>][用户帐号]
```

- -c <备注> 　加上备注文字。备注文字会保存在passwd的备注栏位中。
- -d <登入目录> 　指定用户登入时的起始目录。
- -D 　变更预设值．
- -e<有效期限> 　指定帐号的有效期限。
- -f<缓冲天数> 　指定在密码过期后多少天即关闭该帐号。
- -g<群组> 　指定用户所属的群组。
- -G<群组> 　指定用户所属的附加群组。
- -m 　制定用户的登入目录。
- -M 　不要自动建立用户的登入目录。
- -n 　取消建立以用户名称为名的群组．
- -r 　建立系统帐号。
- -s<shell>　 　指定用户登入后所使用的shell。
- -u<uid> 　指定用户ID。

## ubuntu

> 参考文章:https://blog.csdn.net/iriczhao/article/details/123648153#:~:text=%E5%B8%B8%E7%94%A8%E4%BA%8E%EF%BC%9A%E5%9C%A8%E6%8C%82%E8%BD%BD%E7%9C%9F,%E7%B3%BB%E7%BB%9F%E7%9A%84%E2%80%9C%E8%B7%B3%E6%9D%BF%E2%80%9D%E3%80%82
>
> https://www.cnblogs.com/tsecer/p/10485749.html
>
> 本人由于想要qemu起一个微型ubuntu的 折腾了半天,发现根本折腾不出来,于是仔细学习一下qemu如何启动的内核.(菜)

**0号进程就是以start_kernel为入口的一个任务，也就是内核本身**

**1号任务就是以init函数为入口的一个任务，这个任务对内核来说，就是一个一个一般的线程，通过kernel_thread创建一个线程，为它分配一个task_struct结构**

initrd是一个ramdisk文件，也就是它本身也是一个文件系统。一般是通过cpio + gzip生成的一个文件。但是一般里面只是包含了根文件系统大致的框架，例如proc文件夹、dev文件夹等我们常见的文件夹

Initrd是一个被压缩过的小型根目录，这个目录中包含了启动阶段中必须的驱动模块，可执行文件和启动脚本。内核在启动初始化过程中会解压缩initrd文件，然后将解压后的initrd挂载为根目录，然后执行根目录中的/linuxrc脚本（
