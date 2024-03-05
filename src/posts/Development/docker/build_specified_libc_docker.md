---

date: 2024-3-3
tag:
  - docker
  - pwn
  - development
---

# 构建指定版本libc的docker

> 因为在阅读文章的时候 复现它的操作发现它的libc版本太低了 导致我们的复现失败 所以这里学习docker构造指定版本的libc环境<br>参考文章:[Docker配置任意版本编译环境（GCC升级、降级、指定版本）_如何降低docker里面的gcc版本-CSDN博客](https://blog.csdn.net/weixin_44344462/article/details/88525655)<br>[使用docker调试和部署pwn题-Pwn-看雪-安全社区|安全招聘|kanxue.com](https://bbs.kanxue.com/thread-280028.htm)<br>[docker run 命令详解（新手入门必备）-CSDN博客](https://blog.csdn.net/anqixiang/article/details/106545603)

## 版本对应

Ubuntu20.04：libc-2.31
Ubuntu18.04：linc-2.27
Ubuntu16.04：libc-2.23
Ubuntu14.04：libc-2.19docke

## 操作指令

> 这里只是浅浅展示一下基础会用到的指令 然后将遇到的报错展示出来 以及对应的解决方法 <br>

- install cmd:

  ```shell
  docker pull ubuntu:xx.xx
  ```

  - 然后因为我下载了`docker destop`导致报错:

    ```shell
    error during connect: this error may indicate that the docker daemon is not running: Get "http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.24/images/json": open //./pipe/docker_engine: The system cannot find the file specified.
    ```

    - 找到解决文章:[docker 桌面版报错error during connect: This error may indicate that the docker daemon is not running.:-CSDN博客](https://blog.csdn.net/tangcv/article/details/112238084)

    - 结果没办法解决 继续报错:

      ```shell
      switching to windows engine: request failed and retry attempts exhausted: Post "http://ipc/engine/switch": open \\.\pipe\dockerBackendApiServer: The system cannot find the file specified.
      ```

    - 然后开启destop后 自动就好了 怪 

- 查看镜像

  ```shell
  docker images
  ```

  - 结果:

    ```shell
    REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
    ubuntu       22.04     3db8720ecbf5   2 weeks ago    77.9MB
    ubuntu       18.04     f9a80a55f492   9 months ago   63.2MB
    ubuntu       16.04     b6f507652425   2 years ago    135MB
    ```

- 运行images

  ```shell
  docker run -d -p 宿主机端口:容器端口 --name 容器名称 镜像的标识:镜像名称[:tag]
  // 我们使用 可以直接进入docker内部
  docker run -id --name="pwn" b6f507652425 /bin/sh
  // -i 即使未链接stdin(标准输入)也保持打开状态 并且分配一个交互终端
  // -t 容器启动后直接进入命令行
  // -d 后台运行
  // 所以我在这里选择的是 -id
  ```

- 查看正在执行的容器

  ```shell
  docker ps -a
  ```

  - 结果

    ```shell
    CONTAINER ID   IMAGE          COMMAND       CREATED         STATUS                     PORTS     NAMES
    af2e5d02e3e8   b6f507652425   "/bin/bash"   3 seconds ago   Exited (0) 3 seconds ago             pwn_docker
    6711535f8c6a   3db8720ecbf5   "/bin/bash"   4 minutes ago   Exited (0) 4 minutes ago             confident_pike
    ```

- 进入docker

  ```shell
  docker exec -it container_id /bin/sh 
  ```

- 向docker内部传文件

  ```shell
  docker cp 本地地址 container_id:docker内路径
  ```

  - 也可以docker 内部传给本地

    ```shell
    docker cp container_di:docker内路径 本地地址
    ```

## 主力pwn环境

> 由于我的vmware中ubuntu再次崩溃了 然后忘记存快照了 所以转使用docker

- 文章中推荐的主力pwn环境是:

  ```shell
  skysider/pwndocker
  ```

### pull image

```shell
docker pull skysider/pwndocker
```

### error

> 进入后使用apt发生报错

```shell
Err:1 http://mirrors.aliyun.com/ubuntu bionic InRelease
  400  Bad Request [IP: 120.226.194.113 80]
Err:2 http://mirrors.aliyun.com/ubuntu bionic-security InRelease
  400  Bad Request [IP: 120.226.194.113 80]
Err:3 http://mirrors.aliyun.com/ubuntu bionic-updates InRelease
  400  Bad Request [IP: 120.226.194.113 80]
Err:4 http://mirrors.aliyun.com/ubuntu bionic-proposed InRelease
  400  Bad Request [IP: 120.226.194.113 80]
Err:5 http://mirrors.aliyun.com/ubuntu bionic-backports InRelease
  400  Bad Request [IP: 120.226.194.113 80]
```

- 我以为是docker无法链接外部网络的问题 但是ping baidu.com又是可以的 找了很多文章都没有解决 结果加速器一关久解决好了

  > 大概是docker代理的问题 hhh后面找到个类似的解决的文章:[Windows docker镜像 apt update时提示400 Bad Request_docker 400 bad request-CSDN博客](https://blog.csdn.net/flr_0831/article/details/135708335)

  ```shell
  --- baidu.com ping statistics ---
  15 packets transmitted, 14 received, 6.66667% packet loss, time 17696ms
  rtt min/avg/max/mdev = 37.782/38.619/41.413/0.892 ms
  root@936a687b2420:/ctf# ping http://222.187.238.94:9527/
  ping: http://222.187.238.94:9527/: Name or service not known
  root@936a687b2420:/ctf# ping 222.187.238.94:9527
  ping: 222.187.238.94:9527: Name or service not known
  ```

## 各版本的轻量级pwn环境

> 有大佬已经写好了:[roderickchan/debug_pwn_env Tags | Docker Hub](https://hub.docker.com/r/roderickchan/debug_pwn_env/tags)<br>我们只需要根据ubuntu的版本 找到我们需要的libc版本进行下载即可

- 然后就是我没找到ubuntu16.04版本的也就是libc版本为2.23的 因为这个版本之下没有tcache作为一些原理 所以我选择自己拿ubuntu16.04进行搭建轻量级环境


- 下载python 

  > 直接apt install 是3.5版本 连pip都下载不起 所以参考文章:[Ubuntu16.04安装Python3.8，3.7，3.9(含卸载方法，支持多版本共存)-CSDN博客](https://blog.csdn.net/qq_35743870/article/details/125903040)

- 然后根据[docker从0搭建ubuntu16.04pwn环境_pwn docker ubuntu16-CSDN博客](https://blog.csdn.net/yongbaoii/article/details/113750991)进行搭建pwn环境即可





