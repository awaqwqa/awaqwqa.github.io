---
date: 2024-7-5
tag:
  - rsa
---

# RSA算法

## 背景:

 RSA公钥加密算法是1977年由罗纳德·李维斯特（Ron Rivest）、阿迪·萨莫尔（Adi Shamir）和伦纳德·阿德曼（Leonard Adleman）一起提出的。1987年首次公布，当时他们三人都在麻省理工学院工作。RSA就是他们三人姓氏开头字母拼在一起组成的。
     RSA是目前最有影响力的公钥加密算法，它能够抵抗到目前为止已知的绝大多数密码攻击，已被ISO推荐为公钥数据加密标准。
今天只有短的RSA钥匙才可能被强力方式解破。到2008年为止，世界上还没有任何可靠的攻击RSA算法的方式。只要其钥匙的长度足够长，用RSA加密的信息实际上是不能被解破的。但在分布式计算和量子计算机理论日趋成熟的今天，RSA加密安全性受到了挑战。
RSA算法基于一个十分简单的数论事实：**将两个大质数相乘十分容易，但是想要对其乘积进行因式分解却极其困难，因此可以将乘积公开作为加密密钥。**
RSA算法是现今使用最广泛的公钥密码算法，也是号称地球上最安全的加密算法。在了解RSA算法之前，先熟悉下几个术语
根据密钥的使用方法，可以将密码分为对称密码和公钥密码
🍬对称密码：加密和解密使用同一种密钥的方式
🍬公钥密码：加密和解密使用不同的密码的方式，因此公钥密码通常也称为非对称密码。

## 了解知识点

费马小定理

- a为整数 p 为质数 那么就满足

  ![image-20240704014527546](https://awaqwqa.github.io/img/RSA/image-20240704014527546.png)

  - 当a是p的倍数 所以a的p次方也是p的倍数 所以a就等于0 ----？

  - 如果a不是p的质数的话 则

    ![image-20240704014620377](https://awaqwqa.github.io/img/RSA/image-20240704014620377.png)

，欧拉函数，欧拉定理

## 计算方式

> 参考文章:[素数（质数）判断的五种方法_判断质数-CSDN博客](https://blog.csdn.net/qq_43695957/article/details/116062333)
>
> 质数(prime number)又称素数，有无限个。一个大于1的自然数，除了1和它本身外，不能被其他自然数整除，换句话说就是该数除了1和它本身以外不再有其他的因数;否则称为合数。
>
> 欧拉函数：在[数论](https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/%E6%95%B8%E8%AB%96)中，对正[整数](https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/%E6%95%B4%E6%95%B8)*n*，**欧拉函数φ(n)**是小于或等于*n*的正整数中与*n*[互质](https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/%E4%BA%92%E8%B3%AA)的数的数目,此[函数](https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/%E5%87%BD%E6%95%B0_(%E6%95%B0%E5%AD%A6))以其首名研究者[欧拉](https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/%E6%AD%90%E6%8B%89)命名，它又称为**φ函数**（由[高斯](https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/%E5%8D%A1%E7%88%BE%C2%B7%E5%BC%97%E9%87%8C%E5%BE%B7%E9%87%8C%E5%B8%8C%C2%B7%E9%AB%98%E6%96%AF)所命名）
>
> 互质:又称**互素**在[数论](https://zh.wikipedia.org/wiki/數論)中，如果两个或两个以上的[整数](https://zh.wikipedia.org/wiki/整數)的[最大公约数](https://zh.wikipedia.org/wiki/最大公因數)是1，则称它们为**互质**。
>
> `扩展欧几里得`

- 选择两个大素数p和q典型值为1024位

  - 判断素数

    ![image-20240704014311077](https://awaqwqa.github.io/img/RSA/image-20240704014311077.png)

- 计算`n=p*q`和`z=(p-1)*(q-1)` 

  ![img](https://img2020.cnblogs.com/blog/1959611/202005/1959611-20200521153315122-2088406130.png)

  - 这里的n就代表欧拉函数 也就是phi(n)

- 找到一个e 也就是**1< e < φ(n)，且e与φ(n) 互质。** 实际运用中常常选择常常选择 **65537**

- **计算e对于φ(n)的模反元素d(逆元)。**

  - 所谓["模反元素"](http://zh.wikipedia.org/wiki/模反元素)就是指有一个整数d，可以使得ed被φ(n)除的余数为1。 ed%φ(n) == 1 也就是:`ed ≡ 1 (mod φ(n))`
  - 同时也等价为:`　ed - 1 = kφ(n)` 所以找到d本质上是对ex+yφ(n)=1求解(x替换d,y替换k) 这里求解就用["扩展欧几里得算法"](http://zh.wikipedia.org/wiki/扩展欧几里得算法) 就可以求解到x与y

- 然后公开密钥为:(e,n),私有密钥为(d,n)



实际应用:

![image-20240704024340068](https://awaqwqa.github.io/img/RSA/image-20240704024340068.png)

- 比如加密:ｍe ≡ c (mod n) 公钥: (e n)
  - 所以c = me - kn 
- 然后解密:cd = m (mod n) 私钥:(d,n)
  - 所以c=me-kn带入得到 (me-kn)d = m(mod n) 所以等价为:med = m (mod n)
  - 因为ed = 1(mod phi n)

## 安全性

有办法通过公钥 也就是n e推到出d吗  因为私钥就是(d,n)知道了私钥就有办法通过密文解密出原文 上述一共提及了几个字母:`p`,`q`,`n`,`phi n`,`e`,`d`

1. 比如我们推算d的公式:ed=1mod(phi n ) 所以也就是如果知道了e和phi n就可以算出d
2. phi n = (p-1)(q-1) 所以知道了p和q就知道了phi n
3. n=pq 也就是能够将n因式分解就可以算出p和q 

那么首先就可以很容易想到通过逆推3->2->1 所以我们可以将n因式分解就可以得到pq然后得到phin 我们本来就拥有e所以就可以算出d 但是还记得我们最开始说的吗 rsa的难点就在于大数的因式分解 所以一般不会这样简单

- 所以我们一般通过额外的一些信息来进行安全攻击

## 代码实现

- **扩展欧几里得算法**

  因为ed = 1(mod phi n) 所以ed - kphi n = 1 已经知道e和phi 丢入则得到d和k 

  ```python
  def ext_gcd(a, b):
      if b == 0:
          return 1, 0, a
      else:
          x, y, gcd = ext_gcd(b, a % b)
          x, y = y, (x - (a // b) * y)
          return x, y, gcd
  
  ```

- 

## CTF中常见题型

- rsa中通常还有个**签名消息**也就是校验码,确定密文是否被修改过 

1. 已经知道p,q,e求d

   ed=1(mod phi n)所以利用**扩展欧几里得算法** 函数:gmpy2.invert 按照e phi_n顺序丢入

   ```python
   import gmpy2
   
   
   def ext_gcd(a, b):
       if b == 0:
           return 1, 0, a
       else:
           x, y, gcd = ext_gcd(b, a % b)
           x, y = y, (x - (a // b) * y)
           return x, y, gcd
   
   p = 38456719616722997
   q = 44106885765559411
   e = 65537
   
   phi_n = (p - 1) * (q - 1)
   print(ext_gcd(phi_n,e))
   d = gmpy2.invert(e,phi_n)
   print(d)
   
   ```

- 已经知道n比较小,e求d?

  也就是通过n的分解（[因式分解工具 (numberempire.com)](https://zh.numberempire.com/factoringcalculator.php)）

  通过分解n得到p,q然后根据e 得到d

- **已知密文文件 flag.enc / cipher.bin /flag.b64和 公钥文件 pubkey.pem /key.pem /key.pub求解明文 m？**

  使用RsaCtfTool

- 已知 c ,e,n非常大 和dp dq求解m

  领航杯2019的一道题
