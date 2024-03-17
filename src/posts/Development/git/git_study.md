---
date: 2024-3-17
tag:
  - development
  - git
---

# 记一次删除commit操作

## 目的

> 项目上传一个commit 但是这个commit带了bug 为了安全的 优雅的去除这个bug 而且我觉得自己手动查看上次的commit内容并且删除对应文件有点麻烦 不能以后每次都这样操作 于是学习一下如何用git安全地去除(本来不足以写成一篇博文的 但是我感觉以后我可能忘记 于是还是写上)
>
> 学习文章:[如何从 Github 中删除提交 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/439212074)
>
> [【git revert】使用以及理解（详解）_git revert用法-CSDN博客](https://blog.csdn.net/allanGold/article/details/111372750)

## 使用git revert原因

- 因为从git中删除一个commit这通常是一个坏主意(文章说的) 

  "从 Git 的历史记录中删除提交通常是一个坏主意。Git 旨在跟踪文件的每个版本"

- 以及git revert和git reset的区别 

  - revert是用一个新的commit（逆向commit）中合要去除的commit 

    > 也就是说我们的commit链长这个样子

    ![img](file:///C:\Users\NewOm\Documents\Tencent Files\614286773\nt_qq\nt_data\Pic\2024-03\Ori\403fa820f3bc49c2fdf37a4f0419fac2.png)

  - reset通常是直接删除

## git revert的类型

- 一种是直接revert common commit 也就是正常git commit产生的commit 我们直接输入指令

  ```shell
  git revert commit_id
  ```

- 还有一种是revert merge commit 也就是通过merge合并分支产生的commit

  ```shell
  git revert -m num commit_id
  ```

  - 这里的num 也就是我们要选择的主线 

  - num我们可以通过git show commit_id来查看

    ```shell
    git show bd86846
    commit bd868465569400a6b9408050643e5949e8f2b8f5
    Merge: ba25a9d 1c7036f
    ```

    - 这里num为1就是让ba25a9d 为主线 2则是1c7036f

### 使用git revert的注意事项

> 这里最好直接去看原文 因为这次我的问题其实不属于这种情况但是还是写下来 方便以后查看

- 简单总结就是如果我fork了一个分支 然后进行了修改 并且merge进入了master分支
- 但是写太多bug了被revert了 我继续基于我的分支进行了fix bug 然后我想重新合并回去
- 就不能直接git merge 而是先revert 掉revert我merge commit分支的那个commit（这里称为g commit）（这里很绕建议直接看原文章的图 写得很好）
- 而是我们先revert掉g commit然后再merge进入master分支 不然会出问题（仅新的commit会被合并）

## 实践

- 由于我们是common commit 也就是正常的commit 所以我们直接进行git revert HEAD即可（因为是最新的commit）

![image-20240317160934372](https://awaqwqa.github.io/img/git_study/image-20240317160934372.png)

