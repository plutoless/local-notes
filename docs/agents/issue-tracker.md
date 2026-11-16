# Issue tracker: GitHub

本仓库通过 GitHub Issues 跟踪需求、问题和实施任务。
目标仓库固定为 plutoless/local-notes，使用 gh CLI 操作。

## 操作约定

- 创建：gh issue create --repo plutoless/local-notes --title "标题" --body-file <文件>
- 阅读：gh issue view <编号> --repo plutoless/local-notes --json number,title,body,labels,comments
- 列表：gh issue list --repo plutoless/local-notes --state open
- 标签：gh issue edit <编号> --repo plutoless/local-notes --add-label <标签>
- 评论：gh issue comment <编号> --repo plutoless/local-notes --body-file <文件>
- 关闭：先提交结果说明，再执行 gh issue close <编号> --repo plutoless/local-notes。

多行正文使用 UTF-8 文件，通过 --body-file 提交。

首次创建 issue 前，使用 gh repo view 核对目标仓库。
不得向技能来源仓库 mattpocock/skills 创建本项目的 issue。

父子任务优先使用 GitHub 原生子 issue；
无法使用时，在子任务正文中注明 Part of #<父任务编号>。

依赖优先使用 GitHub 原生 issue dependencies；
无法使用时，在正文中注明 Blocked by: #<编号>。
所有阻塞任务关闭后，任务才可视为解除阻塞。

## 技能语义

“发布到任务跟踪器”表示创建 GitHub issue。
“读取相关任务”表示读取对应 GitHub issue。
本地设计文档可以作为 issue 的详细依据，无需重复搬迁正文。

## Pull requests as a triage surface

PRs as a request surface: no.
