# 数据库学习

> 参考文章:[MySQL详细学习教程（建议收藏）-CSDN博客](https://blog.csdn.net/qq_45173404/article/details/115712758)

## 数据库分类

- 关系性数据库
  - mysql
  - oracle
  - sql server
  - Sql lite

- 非关性数据库
  - redis
  - mongodb

## 数据库数据类型

> mysql种默认的字符编码是Latin1,所以是不支持中文的.
>
> MySQL数据表以文件方式存放在磁盘中

- 其实就是int ,char, text,time等基本类型 后面碰到了再仔细了

- tiny就是微小

- small就是小

- var就是可变

  ...

## SQL基础语法学习(增删改查)

- 创建数据库

  ```sql
  CREATE DATABASE [IF NOT EXISTS] 数据库名;
  ```

- 创建数据库表

  ```sql
  CREATE TABLE IF NOT EXISTS `student`(
  	'字段名' 列类型 [属性] [索引] [注释],
      '字段名' 列类型 [属性] [索引] [注释],
      ......
      '字段名' 列类型 [属性] [索引] [注释]
  )[表的类型][字符集设置][注释]
  ```

  - 比如

  ```sql
  CREATE TABLE IF NOT EXISTS `student`(
  	`id` INT(4)	NOT NULL AUTO_INCREMENT COMMENT '学号',
  	`name` VARCHAR(30) NOT NULL DEFAULT '匿名' COMMENT '姓名',
  	`pwd` VARCHAR(20) NOT NULL DEFAULT '123456' COMMENT '密码',
  	`sex` VARCHAR(2) NOT NULL DEFAULT '女' COMMENT '性别',
  	`birthday` DATETIME DEFAULT NULL COMMENT '出生日期',
  	`address` VARCHAR(100) DEFAULT NULL COMMENT '家庭住址',
  	`email` VARCHAR(50) DEFAULT NULL COMMENT '邮箱',
  	PRIMARY KEY (`id`)
  )ENGINE=INNODB DEFAULT CHARSET=utf8
  ```

  

- 删除

```sql
DROP DATABASE [IF EXISTS] 数据库;
DROP TABLE [IF EXISTS] TABLE_NAME；
-- delete
DELETE FROM `student` 
```

- 使用

```sql
USE 数据库;
```

- 查看

```sql
SHOW CREATE DATABASE 数据库;
SHOW CREATE TABLE 表名;
DESC 表名;
```

- 修改

  - 修改表名字

  ```sql
  ALTER TABLE teacher RENAME AS teachers;
  ```

  - 增加字段

  ```sql
  ALTER TABLE teacher ADD age INT(11);
  ```

  - 修改约束 修改age的属性为:varchar

  ```sql
  ALTER TABLE teacher MODIFY age VARCHAR(11);
  ```

  - 重命名属性

  ```sql
  ALTER TABLE teacher CHANGE old_name new_name INT(1);
  ```

  - 删除属性

  ```sql
  ALTER TABLE teacher DROP age1
  ```

- 增加

  ```sql
  -- student是table name是对应属性
  -- intsert into tablename(property) values (...)
  INSERT INTO `student`(`name`) VALUES (`zsr`)
  INSERT INTO `student`(`name`,`pwd`,`sex`) VALUES ('zsr','200024','男'),('gcc','000421','女');
  -- 省略字段属性
  INSERT INTO `student` VALUES (5,'Bareth')
  ```

- 改

  ```sql
  -- 修改table_name中的propertyB为value2的prepertyA为value1 
  UPDATE table_name SET propertyA=value1 WHERE propertyB=value2;
  ```

- 筛选 where

  | 操作符       | 含义     |
  | ------------ | -------- |
  | =            | 等于     |
  | <>或!=       | 不等于   |
  | >            | 大于     |
  | <            | 小于     |
  | <=           | 小于等于 |
  | >=           | 大于等于 |
  | BETWEEN…AND… | 闭合区间 |
  | AND          | 和       |
  | OR           | 或       |

- 查询 SELECT

  ``` sql
  SELECT * FROM tablename;
  -- find data by property
  SELECT property1,property2 FROM tablename;
  -- 还可以和where一起搭配 根据条件查询
  SELECT property1 FROM tablename WHERE express;
  ```

  

## 外键

> 比如我现在有个A table 然后有个B table ，我为了绑定A和B 我将A的主键存入B中，方便B通过这个数据找到A。这个存在B中的属性就是外键

- 详细的在Grom中学习,不建议直接在数据库中写外键
