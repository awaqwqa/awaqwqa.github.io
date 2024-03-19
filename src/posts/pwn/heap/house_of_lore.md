---
date: 2024-3-19
tag:
  - pwn
  - heap
  - house
---

# House of lore学习

> 主要是看着wiki 理解理解 然后自己看的glibc2.27的源码 抛开tcache部分

## 源码

> 这里是去除了不重要的`tcache bin`判断部分

```c
if (in_smallbin_range (nb)){
      idx = smallbin_index (nb);
      bin = bin_at (av, idx);

      if ((victim = last (bin)) != bin)
      {
          bck = victim->bk;
          if (__glibc_unlikely (bck->fd != victim))
            malloc_printerr ("malloc(): smallbin double linked list corrupted");
          set_inuse_bit_at_offset (victim, nb);
          bin->bk = bck;
          bck->fd = bin;

          if (av != &main_arena)
	           set_non_main_arena (victim);
          check_malloced_chunk (av, victim, nb);
          void *p = chunk2mem (victim);
          alloc_perturb (p, bytes);
          return p;
      }
}
```

## 漏洞利用图

![image-20240319205119155](C:\Users\NewOm\AppData\Roaming\Typora\typora-user-images\image-20240319205119155.png)

- 这里我们可以直观看见bck victim bin的相对位置 这里我简化了部分链 

  - 由于定位bck是通过victim来确定的

    ```c
    bck = victim->bk;
    ```

  - 所以一但我们劫持了victim的bk后 指向我们我们stack里面的空间 或者任何一个我们我们想控制的空间

    > 这样修改victim 中bk值 然后构造目标地址+0x18位置的地址为victim的地址 即可完成劫持 我们就可以malloc一个

    ![img](https://awaqwqa.github.io/img/house_of_lore/img.png)