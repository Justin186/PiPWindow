# PiPWindow

一个通过JavaScript实现的歌曲信息小窗

灵感来源：网易云Web端的歌词小窗。使用了与其相似的方法实现

![preview.webp](https://github.com/Lukoning/PiPWindow/raw/refs/heads/dist/preview.webp)

![image](https://github.com/user-attachments/assets/3e24fe01-1e79-4f84-8de3-19adc115e533)

⚠️ 由于本人已不再使用betterncm，本项目无限期停更

### <a href="https://github.com/Lukoning/PiPWindow/releases">更新日志在RELEASES, HERE PLEASE -></a>
# 说明
<p>点击歌曲红心❤️旁按钮或⚙️设置页链接打开/关闭◲小窗</p>
<p>可拖动↔↕可调整大小</p>
<p>🐀鼠标移上◲小窗显示控制按钮</p>
<p>也可以敲击 空格来控制▶️播放⏸️暂停</p>
<p>↗返回和x关闭的效果可自定义</p>

# 开发 / 构建

本项目使用 **Webpack** 将 `src/` 下的多个 ES Module 打包为单个 `dist/main.js`，
再由 BetterNCM 注入。源码按职责拆分为多个模块，便于阅读与维护。

## 项目结构

```
src/
├── main.js       # 入口：注册插件生命周期、初始化事件监听
├── state.js      # 集中管理所有共享可变状态与常量
├── utils.js      # 通用工具函数（DOM 查询、提示、任务栏等）
├── color.js      # 取色逻辑（主窗口 / 专辑封面 / 自定义）
├── render.js     # 核心渲染：canvas 绘制 + PiP 小窗（含歌词处理）
├── pip.js        # PiP 小窗开关
├── config.js     # 配置读写（保存 / 重置）
├── settings.js   # 设置页面 HTML 与事件绑定
└── manifest.json # 插件清单（构建时复制到 dist）
```

## 构建

```bash
npm install        # 首次安装依赖
npm run build      # 生产构建，输出到 dist/
npm run build:dev  # 开发构建（未压缩）
npm run watch      # 监听源码变化自动构建
```

## 部署

```powershell
.\deploy.ps1 -Build                 # 构建并部署到 C:\betterncm
.\deploy.ps1 -Build -BetterNCMRoot D:\betterncm   # 指定 BetterNCM 根目录
.\deploy.ps1                        # 仅部署已有的 dist/
```

部署后重启网易云音乐即可生效。

