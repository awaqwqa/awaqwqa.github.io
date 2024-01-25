---
date: 2024-01-25
tag:
  - frida
  - 实战
  - objection
---

# objection 初次体验

## 连接

- 第一次我使用的教程上面说的:`objection -g <应用标识符> explore`但是报错:

  ```shell
  Unable to connect to the frida server: need Gadget to attach on jailed Android; its default location is:.....
  ```

- 我猜测大概是因为我们frida修改了端口号 所以我们尝试`objection -g com.netease.x19 explore -P 11451`

