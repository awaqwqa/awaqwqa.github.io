---
date: 2024-2-29
tag:
  - re
---
# findme(HgameWeek3Re)

> 主要是复现wp的操作

- export data操作
  - shift+E

## 提取buff

> buff的头部为<br>
>
> ```assembly
> .data:0000000140004040                               ; char Buffer[2]
> .data:0000000140004040 4D 00                         Buffer db 'M',0                         ; DATA XREF: main+28↑o
> .data:0000000140004042 00 00                         align 4
> .data:0000000140004044 5A 00                         aZ db 'Z',0
> .data:0000000140004046 00 00                         align 8
> .data:0000000140004048 90                            db  90h

- 看起来很像是exe文件header的e_magic标志`MZ` 所以应该是buffer里面藏了exe文件 然后根据wp提示我们进行`export data`

- 我们先算一下总的字节大小 然后修改buffer的类型 改为char Buffer[39071] 
  - 我发现直接`y`修改为char Buffer[39071]用处不大 无法export data完整导出来 所以我们`Editor->array`将数据修改为数组类型

- 然后用ida打开buff我们发现无法反汇编 并且观察数据样式

  ```c
  'M',0,0,0,'Z'
  ```

  - 充分理由怀疑是四个数据 3个零 然后一个有效数据(其实是看了wp 然后知道了 这个规律)