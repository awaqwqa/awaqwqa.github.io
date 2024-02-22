---
date:2024-2-22
tag:
  - pwn
  - heap
---

# 写一个计算chunk大小的程序

> 由于做题的时候老是脑子不够用 无法根据malloc(num)中的num获取chunk的size 所以我就决定自己写一个程序来完成这个工作并且好好理解一下怎么计算的

## 原理

- 最小`chunk`为0x20
- `chunk`一定是`size_sz *2 `的倍数(内存对齐)
- `chunk`可以占用下一个`chunk`的`prev_size`来存东西

- 所以我们就是看是否malloc的大小 +`size`所占字节数 然后是否内存对齐 如果没有则加到对齐 然后 判断最后的size是否小于0x20 如果小于则直接等于0x20

  > 所以直接使用公式:(num + 8 +0xf)&~0xf; 其中num就是我们malloc传的参数

## 脚本

```c
#include <stdio.h>
#include<stdlib.h>
int main()
{
    while (1)
    {
        int num = 0;
        int size = 0;
        int num2 = 0;
        printf("malloc:");
        scanf("%x",&num);
        size = (num + 8 +0xf)&~0xf;
        if (size < 0x20) {
            size = 0x20;
        }
        if (size -16 < num) {
            printf("will take up prev_size of the next chunk\n");
        }
        printf("0x%x",size);
        fflush(stdin);
        printf("\n");
        /* code */
    }
    return 0;
}
```

