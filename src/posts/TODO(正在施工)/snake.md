# 2024四川省信息安全省赛snake复现

## 复习

由于这题是利用的构造一个fakechunk 来进行free所以我们需要好好搞清楚一下glibc2.39版本下free的检测差不多有哪些(这里针对大chunk)

### free

- 首先会检查size是否正常
  - 是否对齐
  - 是否大于最小值
- 利用check_inuse_chunk查看这个chunk是否是double free
- 获取物理意义上下一个chunk
- chunk不能是topchunk
- 下一个chunk的p位必须为1

- 检查下一个chunk的size是否正常
- 要是当前chunk的prev_inuse位为0则执行合并机制

- **当下一个chunk不是头chunk 则获取下下个chunk 当nextinuse位为0的话就触发unlink**
