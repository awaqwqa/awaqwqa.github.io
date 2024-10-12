# Mac m1/m2 配置pwn

> 因为pwn的环境主要是x86_64环境下的,所以我们需要配置一个x86_64的环境. 但是如果我们在mac下直接使用docker 创建一个x86_64的环境，虽然正常运行是可以的但是没办法运行ptrace,

## 遇到的问题

> 文章:[Mac M1 Ptrace - warning: ptrace: Function not implemented · Issue #5191 · docker/for-mac (github.com)](https://github.com/docker/for-mac/issues/5191)
>
> [docker - warning: ptrace: Function not implemented During startup program exited with code 127 - Stack Overflow](https://stackoverflow.com/questions/68435791/warning-ptrace-function-not-implemented-during-startup-program-exited-with-cod)

![QQ_1725082488169](/Users/elegy/Library/Containers/com.tencent.qq/Data/tmp/QQ_1725082488169.png)

- 因为docker在启动其他架构的容器的时候本质其实是调用的qemu 然后这个内核qemu是没有去实现ptrace的 这就导致了我们在容器内部是无法正常使用`gdb`或者`seccomp`这类工具的.

  ![QQ_1725082655492](/Users/elegy/Library/Containers/com.tencent.qq/Data/tmp/QQ_1725082655492.png)

## 解决方案

> 要么通过gdb-server的方式进行调试,本地起一个gdb 然后通过gdb-server进行连接 当然这种方案还是没办法使用seccomp-tools
>
> 然后我自己折腾了一段时间后发现了可以`UTM`或者直接用`qemu` 然后用自己找的一个内核进行运行,就可以使用ptrace了 正常使用gdb

- 由于UTM实在是用不太来,然后自定义有点麻烦,我最终选择了自己用qemu进行运行,为了方便在qemu和本机之间传输文件和编辑代码,用vscode进行ssh链接

### 下载qemu

```shell
brew install qemu
```

### ubuntu下载

> 因为以前docker一直用的ubuntu所以这里也选择ubuntu22

官网下载:[Ubuntu 22.04.4 LTS (Jammy Jellyfish)](https://www.releases.ubuntu.com/jammy/)

- 然后选择:

![QQ_1725083190829](/Users/elegy/Library/Containers/com.tencent.qq/Data/tmp/QQ_1725083190829.png)

下载完毕后存在文件夹里面

### 创建虚拟磁盘镜像

使用指令 

```shell
qemu-img create -f qcow2 ubuntu22.qcow2 30G
```

- 然后两个放在一个目录下

  ![QQ_1725083423924](/Users/elegy/Library/Containers/com.tencent.qq/Data/tmp/QQ_1725083423924.png)

### 创建容器

```shell
qemu-system-x86_64 \
  -m 4G \
  -vga virtio \
  -display default,show-cursor=on \
  -usb \
  -device usb-tablet \
  -machine type=q35 \
  -smp 4 \
  -drive file=ubuntu22.qcow2,if=virtio \
  -cpu Nehalem-v1 \
  -net user,hostfwd=tcp::2222-:22 \
  -net nic \
  -cdrom ubuntu-22.04.4-live-server-amd64.iso
```

- 主要是注意-drive file=面试虚拟磁盘镜像
- -cdrom后面是我们的内核iso镜像
- -m是分配的内存 

然后会弹出来一个窗口一路done就行了,最后让你重启的时候你一直向上翻到help 直接选择进入shell 由于这里我已经安装完毕了,就不截屏了.
