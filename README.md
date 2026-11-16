# 拾记 · Local Notes 0.1

Mac 和 Android 的本地 Markdown 笔记、待办工具。应用不提供同步服务，Syncthing 负责设备间文件同步。默认使用隔离的 Sample 样本目录。

## 运行

- Mac：打开 `dist/LocalNotes.app`。这是本机临时签名的 Apple Silicon 构建，未做 Apple 公证。
- Android：安装 `dist/LocalNotes-debug.apk`，要求 Android 8 或以上。这是开发签名包，尚未真机验证。
- 首次运行不需要选择目录；先在样本里体验。后续选择各端同步目录中同一专用笔记子目录。不要选择包含其他私人资料的上层目录。

## 已实现

本地自动保存、未保存草稿恢复、全文搜索、最近编辑、按路径排序、收藏、Markdown 简易阅读、待办汇总和写回、移动/改名、外部修改检测、冲突另存。收藏和索引不跨端同步。原文件保留 Markdown 形式。

读取时跳过隐藏目录与 Credentials，仅列出 2 MB 以内的 Markdown。附件目前不展示，尚无到期日期、提醒、标签和富文本。阅读模式仅支持基本标题、粗体、代码、任务，不是完整 Markdown 渲染器。按目录目前是路径排序，不是目录树。

## 文件保护及限制

保存前比较磁盘内容；发现外部修改时停止覆盖，允许将编辑另存为副本。每次修改前将旧内容保存在应用私有 History，保留最近 200 份。Android 使用系统目录授权（SAF）并持久保留授权，不申请全盘访问或网络权限。

外部编辑器和 Syncthing 不遵循本应用的锁协议，保存前比较无法消除极短的并发竞争窗口；Android 文件提供者也不保证原子替换。请先用样本文件测试，启用 Syncthing 版本历史，再连接真实笔记。若系统目录选择器无法访问 Syncthing 所用目录，需真机确认可用的共享目录。

## 开发

无第三方运行依赖。界面使用 HTML/CSS/JS，Mac 外壳为 Swift/WKWebView，Android 为 Java/WebView，通过独立本地文件桥读写。

```sh
npm test
npm run build:mac
npm run build:android
```

Mac 需要 Xcode 工具链。Android 脚本支持 ANDROID_HOME/JAVA_HOME，默认使用 Homebrew Android SDK 35、Build Tools 35.0.0 和 OpenJDK 21，无需 Gradle 或联网。开发签名密钥保存在 build/，请自行保留以便未来覆盖安装。

## 验证记录

- Mac 与 Android 构建完成；APK 开发签名验证通过。
- 5 项核心测试通过：CRLF/嵌套任务写回、代码块任务排除、路径边界、HTML 转义、标题特殊字符。
- Mac 实际打开，笔记列表正常；样本编辑自动保存、任务汇总、勾选写回原 Markdown 已验证。
- 自动浏览器交互脚本位于 tests/ui.mjs；本会话环境限制启动浏览器子进程，未执行通过。可先安装 Playwright 并下载 Chromium，再用 node tests/ui.mjs 运行；也可用 CHROME_PATH 指定浏览器路径。
- Android 尚未安装到设备；目录授权、杀进程后恢复、移动端键盘和三端同步仍需真机验证。
