---
date: 2024-2-26
tag: 
  - re
---
# hgameWeek2Arithmetic（2024）

- 一打开很少的函数+反汇编后爆出红色 应该是加壳

- 使用Exeinfo Pe查看加壳方式

  -  ```shell
     [Tampared file ] x64 UPX v3.9 - 4.0 - [ 3.96 ] - exe signature - 2013-2023 - http://upx.github.io
     ```

- upx加壳 就用upx进行解

  - ```shell
    upx -d filename
    ```

- 报错

  ```shell
  upx: arithmetic.exe: CantUnpackException: file is possibly modified/hacked/protected; take care!
  ```

- 网上查了一下 大概就是 upx的防脱 

  > 防脱文章:[UPX防脱壳机脱壳、去除特征码、添加花指令小探 - 『脱壳破解区』 - 吾爱破解 - LCG - LSG |安卓破解|病毒分析|www.52pojie.cn](https://www.52pojie.cn/thread-326995-1-1.html)<br>[手动去upx特征_upx -d-CSDN博客](https://blog.csdn.net/whatday/article/details/99709317)这个是解决方案

  - 将几个特征值修改为upx即可



## 阅读逻辑

```c
 for ( file = fopen("out", "rb"); (unsigned int)new_scanf(file, "%d") != -1; num = v9 )
  {
    v8 = 1;
    if ( num != num2 )
      v8 = num2 + 1;
    v9 = num + 1;
    if ( num != num2 )
      v9 = num;
    num2 = v8;
  }
```

- 我们很明显发现这里的逻辑肯定是ida识别错误导致的 所以我们看汇编代码

  > - RDI：第一个整数参数
  > - RSI：第二个整数参数
  > - RDX：第三个整数参数
  > - RCX：第四个整数参数
  > - R8：第五个整数参数
  > - R9：第六个整数参数
  >
  > 下面代码是sub_7FF7BD191080出现的两段代码 并且为了方便理解 我们查看out里面有666986个字节

  ```assembly
  mov     edi, edx  ;v6
  movsxd  rsi, eax
  movsxd  rax, edx
  lea     rdx, aD                         ; "%d"
  imul    rcx, rsi, 1F4h
  add     rcx, rax
  lea     r8, [r8+rcx*4]
  mov     rcx, rbp                        ; Stream
  call    sub_7FF7BD191080
  
  mov     rcx, rax                       
  lea     r8, dword_7FF7BD195084
  lea     rdx, aD                         
  mov     rbp, rax
  call    sub_7FF7BD191080
  ```

  - 也就是sub_7FF7BD191080()

  - 为了查看在调用call的时候1-6的寄存器值 我们使用idapython脚本

    ```python
    import idc
    print("rdi:",idc.get_reg_value("rdi"),"rsi:",idc.get_reg_value("rsi"),"rdx:",idc.get_reg_value("rdx"),"rcx:",idc.get_reg_value("rcx"),"r8:",idc.get_reg_value("r8"),"r9:",idc.get_reg_value("r9"))
    ```

    - ```shell
      rdi: 1 rsi: 2 rdx: 140702006190712 rcx: 1370015100192 r8: 140702006204500 r9: 140702006202500
      ```

  - 处理一下数据

    ```c
    rdi:1
    rsi:2
    rdx:0x7ff7bd192278; // %d
    rcx:0x13efb436d20
    r8:	0x7ff7bd195854
    r9: 0x7ff7bd195084
    ```

- 其实这里我还是没看出来怎么实现

