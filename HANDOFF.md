# PiPWindow 交接文档

更新时间：2026-09-02

## 项目目标

PiPWindow 是 BetterNCM 插件，用于显示歌曲信息、封面和歌词小窗。当前同时保留两条实现路线：

1. 原有系统 Picture-in-Picture：Canvas -> captureStream -> video.requestPictureInPicture()
2. 新增 DOM 独立窗口原型：window.open() -> DOM/CSS，绕过 Canvas/PiP 媒体管线

## 当前最重要结论

- 网易云 CEF 不支持 Document Picture-in-Picture：
  `PiPWTestDocumentPiP()` 输出“当前 CEF 不支持”。
- `window.open()` 可以创建独立 DOM 窗口。
- 传统 PiP 只能显示 video，不能直接显示 DOM/SVG。
- 传统 Canvas PiP 的延迟和卡顿主要来自 CEF 的 captureStream/PiP 媒体管线，而不是电脑性能或单次 JS 绘制耗时。
- 同机 `D:\refined-now-playing-netease` 流畅，是因为它主要使用网易云原生 DOM/CSS，而不是 Canvas -> MediaStream -> PiP。

## 当前 DOM 窗口原型（当前主路线）

主要入口：

- 歌曲信息区域旁的 PiP 图标
- 插件设置页中的打开链接

调试时仍可使用控制台命令：

```js
PiPWTestDomWindow()
```

当前原型特性：

- 使用 DOM/CSS 显示逐字歌词测试文本
- 窗口先在屏幕外创建，避免显示原生边框到无边框的切换过程
- 创建后调用 `domWindowStyle.ps1`，应用无边框、置顶并刷新客户区
- 当前最终尺寸为 `408x204`
- PowerShell 启动常驻 Win32 鼠标监视器，整个窗口区域都支持拖动
- 窗口四边和四角支持自定义缩放，命中区约为 `8px`
- 已有窗口再次点击图标时只聚焦，不重复创建或初始化
- 网易云主窗口退出时尝试自动关闭 DOM 窗口
- 脚本执行日志写入：`%TEMP%\\PiPW-domWindowStyle.log`

脚本日志：

- `styled=true`：找到窗口并成功应用 Windows 样式
- `matched=false`：脚本执行了，但没有匹配到窗口
- `drag-watcher=true`：常驻 Win32 拖动监视器已启动
- `resize-start=true`：鼠标按下时命中了窗口边缘缩放区域

当前 DOM 原型还没有接入真实歌曲、封面、歌词和播放状态。

## 关键文件

- [src/main.js](src/main.js)：插件入口、事件监听、DOM 窗口测试命令
- [src/render.js](src/render.js)：Canvas 绘制、传统 PiP、逐字歌词和视频帧循环
- [src/state.js](src/state.js)：共享状态
- [src/utils.js](src/utils.js)：DPI 检测、任务栏按钮、通用工具
- [domWindowStyle.ps1](domWindowStyle.ps1)：DOM 窗口原生无边框/置顶处理
- [webpack.config.js](webpack.config.js)：构建时复制 `domWindowStyle.ps1`
- [deploy.ps1](deploy.ps1)：构建、打包并同步三个 BetterNCM 位置
- [taskbarButton.ps1](taskbarButton.ps1)：传统 PiP 任务栏按钮处理
- [HANDOFF.md](HANDOFF.md)：本交接文档

## 构建和部署

项目根目录：`D:\PiPWindow`

```powershell
npm run build
.\\deploy.ps1 -Build
```

部署脚本会同步：

- `C:\betterncm\plugins\PiPWindow-0.5.5.plugin`
- `C:\betterncm\plugins\PiPWindow`
- `C:\betterncm\plugins_runtime\PiPWindow`

注意：BetterNCM 重启时会从安装包重新生成 `plugins_runtime`。只改运行时目录不够，必须同步更新 `C:\betterncm\plugins\PiPWindow-0.5.5.plugin`。

## 传统 Canvas PiP 当前实现

当前方案使用：

- DPI：`window.devicePixelRatio`，并用 `matchMedia('(resolution: Xdppx)')` 兜底
- 1.5 倍缩放下 canvas 已确认约为 `612x306`
- `captureStream(0)` 手动采样
- `track.requestFrame()` 手动请求帧
- 使用 `requestVideoFrameCallback` 按 PiP 实际消费节拍同步，限制帧队列和延迟
- Canvas 单帧绘制通常约 1 到 2ms
- 逐帧 console.log 已移除，只保留每秒 FPS 汇总
- 逐字歌词使用累计宽度缓存、二分定位当前词、离屏 canvas 文字缓存
- 背景合成尝试只处理动态下半区

调试命令：

```js
PiPWShowRefreshing(true)
```

FPS 输出类似：

```text
PiPW FPS: 请求23.4次/s，完成23.4帧/s，视频轨道0fps，canvas 612x306，DPR 1.5
```

## 已验证的性能现象

- `captureStream(60)` 时生产端约 60 FPS，但会产生 PiP 队列堆积，延迟越来越大。
- `requestVideoFrameCallback` + 自动 captureStream 曾形成反馈回路，导致切歌或某些时段掉到约 1 FPS。
- `captureStream(0)` + 固定 60Hz + `requestFrame()` 可达到约 60 请求/完成，但 PiP 延迟会重新增加。
- 当前改为单帧 pacing：PiP 呈现一帧后再绘制下一帧。延迟不再增长，但实际消费通常只有约 20 到 30 FPS。
- 看到 `视频轨道60fps` 不代表 PiP 实际呈现 60 FPS。
- 慢帧警告阈值为 50ms，但卡顿时没有触发，说明卡顿多发生在 CEF 媒体管线，而非 JS 同步绘制。

## 已知问题

### 传统 Canvas PiP

- PiP 实际呈现率在当前 CEF 环境通常约 20 到 30 FPS，偶尔降到更低。
- Canvas/PiP 媒体管线会导致明显卡顿或渲染延迟。
- 逐字歌词是刚需，因此简单关闭逐字歌词不是可接受方案。

### DOM 窗口原型

- 原型仍然只是测试文字，没有接入真实数据。
- 无边框、置顶、拖动和缩放依赖 PowerShell 查找窗口标题及 Win32 API。
- 需要确认 `%TEMP%\\PiPW-domWindowStyle.log`，判断脚本是否成功匹配窗口。
- 首次创建需要启动 PowerShell 并加载 Win32 类型，存在少量初始化延迟；窗口会在屏幕外等待完成后再显示。
- 自定义缩放依赖 Win32 光标轮询，缩放命中区约为 `8px`；调整时需同步修改 `domWindowStyle.ps1` 和 `src/main.js`。
- 主窗口退出自动关闭依赖 `beforeunload`，需要实际验证。
- DOM 窗口目前没有真实 PiP 的控制按钮和歌曲同步。

## 推荐下一步

优先继续 DOM 窗口路线，因为它能完全绕过 Canvas/PiP 媒体管线：

1. 新建窗口后确认日志包含 `styled=true` 和 `drag-watcher=true`。
2. 测试边缘缩放时是否出现 `resize-start=true`。
3. 把 DOM 原型拆成独立窗口渲染器。
4. 从 `betterncm.ncm.getPlayingSong()` 获取歌曲、封面和时长。
5. 把歌词解析和当前行定位接入 DOM 窗口。
6. 用 `<span>` 或逐词元素实现逐字高亮，使用 CSS `clip-path`、宽度或 transform 更新高亮。
7. 监听 `PlayProgress`，只更新状态；DOM 窗口内部用 `requestAnimationFrame` 更新高亮。
8. 增加窗口关闭、主程序退出、切歌、暂停、播放和置顶状态同步。
9. 最后再决定是否保留传统 Canvas PiP 作为兼容模式。

## 重要实现注意事项

- 当前源码使用 `src/`，Webpack 入口是 `src/main.js`。
- 根目录 `main.js` 是旧的单文件入口，历史上实际曾被误加载；目前部署产物来自 `dist/main.js`，但根入口仍同步过部分修复。
- 修改部署逻辑时注意 PowerShell 5.1 的路径引号和 UTF-8 manifest 读取。
- 修改后直接运行 `.\deploy.ps1 -Build`即可，并重启网易云。
- 不要用 `git reset --hard` 或覆盖用户已有的无关修改。
