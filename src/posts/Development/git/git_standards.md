---
date: 2024-3-3
tag:
  - development
  - git
---

# git提交规范 与 项目提交规范学习(浅学习1.0) 

> 因为我使用git比较随性 所以在这里系统学习一下git的代码提交规范 <br>参考文章:[Git代码提交规范-阿里云开发者社区 (aliyun.com)](https://developer.aliyun.com/article/1290068#:~:text=简介： 关于git的规范 良好的代码提交规范可以帮助团队成员更好地理解和维护代码库。 以下是一些常见的Git代码提交规范：,提交频率：尽量保持提交频率较小，每个提交应该只包含一个逻辑上的更改或修复。 提交信息格式：每个提交应该包含一个简明扼要的提交信息，格式为： [类型]%3A 描述。) <br>结合cubefs社区的提交规范进行的总结

## 提交信息格式

> commit应该包含一个简明扼要的提交信息

### 格式:

```shell
[类型]:描述
```

> 列如:`feat: 添加用户注册功能`

- 类型
  - `feat` 新增特性/功能
  - `fix`修复bug
  - `docs` 文档的变更
  - `style` 代码风格的调整
  - `refactor` 重构代码
  - `test`增加或修改测试用例
  - `chore`构建过程或者辅助工具的变更

### commit的内容

- 如果有关联的issue就把issue的编号写出来

  ```shell
  fix: 修复登录页面显示问题 #123
  ```

- 描述清楚修改的内容

  - 顺便可以提供上下文信息

## 分支管理

### 主分支:

- 一般是`master`/`main`用于部署稳定的版本
- `develop`分支一半用于功能开发或者集成测试
- `bugfix`一般用于解决问题 和 修复bug
- `feature`分支用于创建新功能时的测试分支

## Code Review

> 我这里的理解是如提交pr的时候先挂着 然后等待一堆人讨论后再合并

- 良好的审查机制
- 共同讨论

## 提交pr的规范

- 一般是填写一个表格

  ```
  // 说明你的pr的作用 / 我们为什么需要它 
  What this PR does / why we need it:
  
  // 此pr修复了什么
  Which issue this PR fixes:
  
  // 修复问题的编号
  fixes #
  
  // 给你的批阅者的特别注意事项
  Special notes for your reviewer:
  
  // 发布说明
  Release note:
  ```

  