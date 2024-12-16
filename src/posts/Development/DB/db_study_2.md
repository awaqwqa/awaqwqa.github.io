# 数据库八股文学习(期末备考)

> 痛恨八股文,这里主要收集解释八股文的文章

## 小知识点

- 结构化查询语言（Structured Query Language）简称SQL
- 使用Create View语句产生的虚表称 视图(View)

- 数据库提供功能

  - **数据定义（Data Definition）**：定义数据库结构，包括创建、修改和删除数据库对象，如表、视图、索引等。使用 `CREATE`、`ALTER`、`DROP` 等语句。

  - **数据查询（Data Query）**：从数据库中检索数据。主要使用 `SELECT` 语句。

  - **数据操纵（Data Manipulation）**：对数据库中的数据进行插入、更新和删除操作。使用 `INSERT`、`UPDATE`、`DELETE` 等语句。

  - **数据控制（Data Control）**：管理用户权限和数据访问控制。使用 `GRANT`、`REVOKE` 等语句。

- 一个关系模式的形式化表示一个五元组 R(U,D,DOM,F)

- 数据库的安全保护功能:

  - 安全性控制 :防止未经授权的访问，保证数据的保密性和安全性。
  - 完整性控制:确保数据的准确性和一致性。

  - 并发性控制:管理多个用户同时访问数据库时的数据一致性。
  - 故障恢复:在硬件故障、系统崩溃或人为错误后恢复数据库到一致状态

- **不合理的关系模式会存在哪些异常问题。**

  - 数据冗余
  - 插入异常
  - 删除异常
  - 更新异常

- 模型的数量 用户模式、概念模式和内模式的数量

  - 用户模式可以有多个
  - 概念模式只能有一个
  - 内模式只能有一个

## 数据库系统组成

> https://blog.csdn.net/m0_37449634/article/details/134129837

## 数据库发展的三个阶段

> https://blog.csdn.net/zcj18537150970/article/details/105323184

- 人工管理阶段
- 文件系统阶段
- 数据库系统阶段

## 数据模型的三要素

> https://blog.csdn.net/jinse_annian/article/details/106913427

- 数据结构
- 数据操作

- 数据约束

## 并发操作会带来哪些数据不一致性

> https://blog.csdn.net/weixin_39506322/article/details/101714183

- 丢失更新
- 不可重复读
- 脏读

## 候选码,主码,外码

> https://blog.csdn.net/F_Day_/article/details/107928715

## 左连接、右连接、内连接、全连接

> https://blog.csdn.net/weixin_42182599/article/details/131179083
>
> 自然链接:

- 内链接其实就是交集
- 外链接就是以其中某个表为主
  - 左链接 也就是会将左表全部信息展示出来,然后补充右表的信息,如果右表没有左表对应的信息,则显示为NULL
  - 右链接 和左链接对应

- 全链接
  - 查出左右表全部的数据,但是去除两个表重复的数据

## 范式

> https://www.guru99.com/zh-CN/database-normalization.html#:~:text=2NF%EF%BC%88%E7%AC%AC%E4%BA%8C%E8%8C%83%E5%BC%8F%EF%BC%89%EF%BC%9A%20%E5%9F%BA%E4%BA%8E%201NF%20%E6%9E%84%E5%BB%BA%EF%BC%8C%E6%88%91%E4%BB%AC%E9%9C%80%E8%A6%81%E4%BB%8E%E5%BA%94%E7%94%A8%E4%BA%8E%E5%A4%9A%E8%A1%8C%E7%9A%84%E8%A1%A8%E4%B8%AD%E5%88%A0%E9%99%A4%E5%86%97%E4%BD%99%E6%95%B0%E6%8D%AE%E3%80%82%20%E5%B9%B6%E5%B0%86%E5%AE%83%E4%BB%AC%E6%94%BE%E5%9C%A8%E5%8D%95%E7%8B%AC%E7%9A%84%E8%A1%A8%E4%B8%AD%E3%80%82%20%E5%AE%83%E8%A6%81%E6%B1%82%E6%89%80%E6%9C%89%E9%9D%9E%E9%94%AE%E5%B1%9E%E6%80%A7%E5%9C%A8%E4%B8%BB%E9%94%AE%E4%B8%8A%E5%AE%8C%E5%85%A8%E5%8F%91%E6%8C%A5%E4%BD%9C%E7%94%A8%E3%80%82%203NF%EF%BC%88%E7%AC%AC%E4%B8%89%E8%8C%83%E5%BC%8F%EF%BC%89%EF%BC%9A,%E9%80%9A%E8%BF%87%E7%A1%AE%E4%BF%9D%E6%89%80%E6%9C%89%E9%9D%9E%E9%94%AE%E5%B1%9E%E6%80%A7%E4%B8%8D%E4%BB%85%E5%9C%A8%E4%B8%BB%E9%94%AE%E4%B8%8A%E5%AE%8C%E5%85%A8%E5%8F%91%E6%8C%A5%E4%BD%9C%E7%94%A8%EF%BC%8C%E8%80%8C%E4%B8%94%E5%BD%BC%E6%AD%A4%E7%8B%AC%E7%AB%8B%EF%BC%8C%E6%89%A9%E5%B1%95%E4%BA%86%202NF%E3%80%82%20%E8%BF%99%E6%B6%88%E9%99%A4%E4%BA%86%E4%BC%A0%E9%80%92%E4%BE%9D%E8%B5%96%E6%80%A7%E3%80%82%20BCNF%EF%BC%88Boyce-Codd%E8%8C%83%E5%BC%8F%EF%BC%89%EF%BC%9A%203NF%20%E7%9A%84%E6%94%B9%E8%BF%9B%E7%89%88%EF%BC%8C%E8%A7%A3%E5%86%B3%E4%BA%86%203NF%20%E6%97%A0%E6%B3%95%E5%A4%84%E7%90%86%E7%9A%84%E5%BC%82%E5%B8%B8%E9%97%AE%E9%A2%98%E3%80%82

## 择，投影，连接，除法运算

## 数据库中关系有哪些性质

> https://blog.csdn.net/m0_37149062/article/details/119897353
>
> https://blog.csdn.net/dyw_666666/article/details/88842371

## 三级模式 二级映像

- 三级模式
  - 模式
  - 内模式
  - 外模式

- 二级映像
  - 外/模
  - 模/内

## 函数依赖

> https://blog.csdn.net/Jeremy_Tsang/article/details/108949656

- 完全依赖 依赖于多个元素 且必须根据全部元素才能查找到数据
- 部分函数依赖 可以根据多个元素中任意一个元素查询到这个数据 
- 传递函数依赖 需要通过A查到B 再通过B查到C以此循环直到查到目标数据

## 联系模型(E-R图)

> https://blog.csdn.net/m0_63006478/article/details/130952118
>
> E-R图用于表示**实体**、**属性**和**联系**之间的关系。

## 关系代数表达式

> https://blog.csdn.net/qq_34246965/article/details/115960424

并(`∪`)、差(`-`)、[笛卡尔积](https://so.csdn.net/so/search?q=笛卡尔积&spm=1001.2101.3001.7020)(`×`)、投影(`π`)[Where]、选择(`σ`)[Select]

## 事物的特性

> ***\*事务是用户定义的一个数据库操作序列，这些操作要么全不做，要么全做，是一个不可分割的工作单位。\****例如在[关系数据库](https://so.csdn.net/so/search?q=关系数据库&spm=1001.2101.3001.7020)中，一个事务可以是一条SQL语句，一组SQL语句或者整个程序。

事务具有四个特性：

- **原子性（Atomicity）、**
- **持续性（Durability）、**
- **一致性（Consistency）**
- **隔离性（Isolation）。**

**这四个特性简称ACID特性（ACID Properties）**。

## 数据库的分布式结构

### 特点

- 数据的独立性
- 集中与自治相互结合的数据结构
- 适当增加了数据的冗余度
- 全局一致性

- 分布透明性,用户不用担心数据的逻辑分片

## 数据库的故障分类

- 事务故障；
- 系统故障；
- 介质故障。
