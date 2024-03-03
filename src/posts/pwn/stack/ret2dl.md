---
date:  2024-1-25
tag:
  - pwn
---

# ret2dl

## 部分前置知识讲解

### got表和plt表详细解说

> 这里我们不对plt和got表内详细内容进行介绍了 需要了解的参考这个文章:[深入窥探动态链接 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/134105591)<br>我们主要探讨在第一次数据绑定的时候 我们程序究竟是怎么运行的 我们假设我们的函数在plt[1]的地方

- 运行PLT[1]

  > 由于我是是第一次的调用 所以GOT[3]的内容为:`PLT[1]`中`push reloc_arg;`指令的地址 也就是会执行`push reloc_arg `和`jmp plt[0]`自动跳转PLT[0]去完成绑定 并且 将reloc_arg参数作为参数<br>这里PLT[N]与GOT[2+N]一 一对应

  ```assembly
  jmp [GOT[3]]; 
  push reloc_arg;
  jmp PLT[0];
  ```

- 运行PLT[0]

  > 这里相当于`_dl_runtime_resolve(link_map,reloc_arg)`

  ```assembly
  push [GOT[1]]; // 1存的就是link_map 
  jmp [GOT[2]]; // 2存的是_dl_runtime_resolve函数  
  
  ```

- _dl_runtime_resolve函数

  > 这里写了一个大概的源码 方便我们了解 大概就是调用`_dl_fixup`然后这个函数将真实的地址返回给rax寄存器 最后我们jmp过去 实现函数调用

  ```assembly
  # _dl_runtime_resolve 示例 - x86_64 汇编
  #
  # 注意：这是一个简化的示例，用于说明目的。
  # 实际实现会根据系统的动态链接器的具体需求和优化而有所不同。
  
  .global _dl_runtime_resolve
  .type _dl_runtime_resolve, @function
  
  _dl_runtime_resolve:
      # 保存寄存器，因为这些寄存器会在 _dl_fixup 中被使用
      pushq %rax    # 保存原始的返回地址
      pushq %rcx    # 保存第一个参数
      pushq %rdx    # 保存第二个参数
  
      # 传递 _dl_runtime_resolve 的参数给 _dl_fixup
      # 第一个参数（通常是符号索引）在 %rdi 中
      # 第二个参数（返回地址）现在在栈顶
      movq (%rsp), %rsi  # 将返回地址移动到 %rsi
  
      # 调用 _dl_fixup 来解析符号地址
      # _dl_fixup(符号索引, 返回地址)
      call _dl_fixup
  
      # _dl_fixup 返回解析后的函数地址在 %rax 中
  
      # 恢复寄存器
      popq %rdx     # 恢复第二个参数
      popq %rcx     # 恢复第一个参数
      popq %rax     # 恢复原始的返回地址
  
      # 使用解析后的地址跳转执行目标函数
      # 这里我们假设解析后的地址已经由 _dl_fixup 放入 %rax 中
      jmp *%rax
  
  # _dl_fixup 函数的伪声明，需要实际实现
  .type _dl_fixup, @function
  _dl_fixup:
      # 实际的 _dl_fixup 实现会在这里
      ret
  ```

  

### _dl_runtime_resolve部分详细解说

> 参考文章:[深入理解-dl_runtime_resolve - unr4v31 - 博客园 (cnblogs.com)](https://www.cnblogs.com/unr4v31/p/15168342.html)

```assembly
_dl_runtime_resolve(link_map_obj, reloc_index)
```

#### reloc_index

> 省略点将 我们可以通过reloc_index知道我们要绑定函数的名字 其获取逻辑是:<br>
>
> ```c
> elf_rel = rel_plt[reloc_index];
> r_info = elf_rel.r_info;
> elf_sym = *(r_info);
> st_name = elf.sym.st_name;
> // 这里的function_name就是我们需要的函数名了
> function_name = dynstr[st_name];
> ```

-  这个参数 可以粗俗得当作一个属于.rel.plt这个数组的下标 就像是: `.rel.plt[reloc_index]`

  ```go
  type ELF_Rel struct {
      r_offset int64
      r_info 	int
  }
  rel.plt = []Elf_Rel{}
  ```

  - `r_offset`: 存储 我们需要修改的plt条目的位置 相当于是告诉我们`PLT[N]`中的这个N 但是其实这里r_offset是一个绝对地址 相当于:`&PLT[N]`
  - `r_info`高位3字节 用来表示 `.dynsym`这个数组的下标 也就是`.dynsym[r_info]`

  - 然后`.dynsym[r_info].st_name`获取我们需要的函数名字在.dynstr数组中的下标 然后我们就可以通过.dynstr[st_name]来获取名字了

- 所以总结一下:
  - `.dynstr`存函数名字
  - `.dynsym`存函数名字在`.dynstr`中的位置
  - `.rel_plt`存我们需要`.dynsym`中哪个结构体 方便我们取出名字
