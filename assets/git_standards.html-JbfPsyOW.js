import{_ as e}from"./plugin-vue_export-helper-x3n3nnut.js";import{o as i,c as a,e as d}from"./app-ftWqySVa.js";const l={},n=d(`<h1 id="git提交规范-与-项目提交规范学习-浅学习1-0" tabindex="-1"><a class="header-anchor" href="#git提交规范-与-项目提交规范学习-浅学习1-0" aria-hidden="true">#</a> git提交规范 与 项目提交规范学习(浅学习1.0)</h1><blockquote><p>因为我使用git比较随性 所以在这里系统学习一下git的代码提交规范 <br>参考文章:[Git代码提交规范-阿里云开发者社区 (aliyun.com)](https://developer.aliyun.com/article/1290068#:~:text=简介： 关于git的规范 良好的代码提交规范可以帮助团队成员更好地理解和维护代码库。 以下是一些常见的Git代码提交规范：,提交频率：尽量保持提交频率较小，每个提交应该只包含一个逻辑上的更改或修复。 提交信息格式：每个提交应该包含一个简明扼要的提交信息，格式为： [类型]%3A 描述。) <br>结合cubefs社区的提交规范进行的总结</p></blockquote><h2 id="提交信息格式" tabindex="-1"><a class="header-anchor" href="#提交信息格式" aria-hidden="true">#</a> 提交信息格式</h2><blockquote><p>commit应该包含一个简明扼要的提交信息</p></blockquote><h3 id="格式" tabindex="-1"><a class="header-anchor" href="#格式" aria-hidden="true">#</a> 格式:</h3><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code><span class="token punctuation">[</span>类型<span class="token punctuation">]</span>:描述
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><blockquote><p>列如:<code>feat: 添加用户注册功能</code></p></blockquote><ul><li>类型 <ul><li><code>feat</code> 新增特性/功能</li><li><code>fix</code>修复bug</li><li><code>docs</code> 文档的变更</li><li><code>style</code> 代码风格的调整</li><li><code>refactor</code> 重构代码</li><li><code>test</code>增加或修改测试用例</li><li><code>chore</code>构建过程或者辅助工具的变更</li></ul></li></ul><h3 id="commit的内容" tabindex="-1"><a class="header-anchor" href="#commit的内容" aria-hidden="true">#</a> commit的内容</h3><ul><li><p>如果有关联的issue就把issue的编号写出来</p><div class="language-bash line-numbers-mode" data-ext="sh"><pre class="language-bash"><code>fix: 修复登录页面显示问题 <span class="token comment">#123</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div></li><li><p>描述清楚修改的内容</p><ul><li>顺便可以提供上下文信息</li></ul></li></ul><h2 id="分支管理" tabindex="-1"><a class="header-anchor" href="#分支管理" aria-hidden="true">#</a> 分支管理</h2><h3 id="主分支" tabindex="-1"><a class="header-anchor" href="#主分支" aria-hidden="true">#</a> 主分支:</h3><ul><li>一般是<code>master</code>/<code>main</code>用于部署稳定的版本</li><li><code>develop</code>分支一半用于功能开发或者集成测试</li><li><code>bugfix</code>一般用于解决问题 和 修复bug</li><li><code>feature</code>分支用于创建新功能时的测试分支</li></ul><h2 id="code-review" tabindex="-1"><a class="header-anchor" href="#code-review" aria-hidden="true">#</a> Code Review</h2><blockquote><p>我这里的理解是如提交pr的时候先挂着 然后等待一堆人讨论后再合并</p></blockquote><ul><li>良好的审查机制</li><li>共同讨论</li></ul><h2 id="提交pr的规范" tabindex="-1"><a class="header-anchor" href="#提交pr的规范" aria-hidden="true">#</a> 提交pr的规范</h2><ul><li><p>一般是填写一个表格</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>// 说明你的pr的作用 / 我们为什么需要它 
What this PR does / why we need it:

// 此pr修复了什么
Which issue this PR fixes:

// 修复问题的编号
fixes #

// 给你的批阅者的特别注意事项
Special notes for your reviewer:

// 发布说明
Release note:
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div></li></ul>`,18),s=[n];function c(r,t){return i(),a("div",null,s)}const h=e(l,[["render",c],["__file","git_standards.html.vue"]]);export{h as default};
