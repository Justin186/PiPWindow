/*This plugin is licensed under the GNU/GPL-3.0
**Copyright (C) 2024-2025 Lukoning
*/

import { state, pO } from "./state.js";
import { q, qAll, cE, tipMsg } from "./utils.js";
import { colorPick } from "./color.js";
import { getSharedLayout, loadPiP, renderDomWindow } from "./render.js";
import { getSettingsPage } from "./settings.js";

/**
 * 入口模块：注册 BetterNCM 插件生命周期回调，
 * 初始化事件监听（播放进度、词栏变动、设置按钮、颜色变动、PiP 开关）。
 */

// 暴露给控制台的刷新跟踪开关
window.PiPWShowRefreshing = (x = true) => {
  if (x == true) {
    state.showRefreshing = true;
    return true;
  } else if (x == false) {
    state.showRefreshing = false;
    return false;
  }
};

window.PiPWTestDocumentPiP = async () => {
  if (!("documentPictureInPicture" in window)) {
    console.warn("PiPW Document PiP: 当前 CEF 不支持");
    return false;
  }
  try {
    let pipWindow = await documentPictureInPicture.requestWindow({ width: 408, height: 204 });
    pipWindow.document.body.innerHTML = `<div style="display:grid;place-items:center;height:100vh;margin:0;background:#202124;color:#fff;font:16px sans-serif">Document PiP 可用</div>`;
    console.log("PiPW Document PiP: 支持并成功打开测试窗口", pipWindow);
    return true;
  } catch (e) {
    console.error("PiPW Document PiP: API 存在但打开失败", e);
    return false;
  }
};

window.PiPWTestDomWindow = () => {
  if (state.domWindow && !state.domWindow.closed) {
    state.domWindow.focus();
    return true;
  }
  let aspect = state.readCfg.aspectRatio.split(":").map(Number);
  let domWindow = window.open("", "PiPW-DomWindow", "popup=yes,width=240,height=80,left=-10000,top=-10000,resizable=yes");
  if (!domWindow) {
    console.warn("PiPW DOM Window: CEF 拒绝创建窗口");
    return false;
  }
  domWindow.document.write(`
  <title>PiPW DOM Window</title>
    <style>
      html, body { box-sizing: border-box; margin: 0; width: 100%; height: 100%; overflow: hidden; border: 0; background: #202124; color: #fff; font: 400 12px "Segoe UI", "Microsoft Yahei UI", sans-serif; }
      html { background: transparent; border-radius: 12px; overflow: hidden; }
      body { position: relative; background: #202124; border-radius: 12px; cursor: move; user-select: none; }
      .dom-background { position: absolute; z-index: 0; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .55; filter: blur(18px); transform: scale(1.08); pointer-events: none; user-select: none; }
      .dragbar { position: absolute; z-index: 2; inset: 0 0 auto; height: 14px; cursor: move; touch-action: none; }
      .content { position: relative; z-index: 1; display: grid; grid-template-columns: var(--dom-cover) 1fr; gap: var(--dom-gap); box-sizing: border-box; width: var(--dom-width); height: var(--dom-content-height, var(--dom-height)); padding: var(--dom-padding); padding-top: var(--dom-padding-top); transform: scale(var(--dom-scale, 1)); transform-origin: top left; pointer-events: none; }
      .dom-cover { width: var(--dom-cover); height: var(--dom-cover); object-fit: cover; border-radius: 3px; background: #38393d; pointer-events: none; user-select: none; }
      .details { min-width: 0; overflow: hidden; }
      .dom-title, .dom-subtitle, .dom-artist { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      /* line-height 须 ≥ 字体内容区高度（Segoe UI 约 1.33em），否则 overflow:hidden 会裁掉 g/y 等降部 */
      .dom-title { font-size: var(--dom-title-size); line-height: 1.35; font-weight: 400; color: var(--dom-text-primary, #fff); }
      .dom-subtitle { margin-top: 0; color: var(--dom-text-secondary, #b7bbc5); font-size: var(--dom-subtitle-size); line-height: 1.35; }
      .dom-artist { margin-top: 0; color: var(--dom-text-tertiary, #858995); font-size: var(--dom-artist-size); line-height: 1.35; }
      /* 时间 + 进度条：整行绝对定位于封面正下方（与 canvas 版一致），时间在左、进度条占满剩余宽度。
         top 不再加 gap：/16 字号的行高较大，需贴住封面底部才不压歌词区（行底 ≈85 < 歌词起点 ≈87.1） */
      .timebar { position: absolute; left: var(--dom-padding); right: var(--dom-padding); top: calc(var(--dom-cover) + var(--dom-padding-top) + 2px); display: flex; align-items: center; gap: var(--dom-gap); }
      /* min-width 让时间数字块宽度与上方封面等宽对齐，进度条起点随之固定在信息列起始位置；text-align 居中使其视觉上位于封面正下方中央 */
      .dom-time { min-width: var(--dom-cover); text-align: center; color: var(--dom-text-meta, #b7bbc5); font-size: var(--dom-time-size); line-height: 1; font-variant-numeric: tabular-nums; }
      .dom-progress { flex: 1; min-width: 0; height: var(--dom-progress-size); background: #555860; }
      .dom-progress-value { width: 100%; height: 100%; background: #70d6ff; transform: scaleX(0); transform-origin: left center; }
      :root { --dom-timing: cubic-bezier(0.45, 0, 0.07, 1); }
      .lyrics { position: absolute; left: var(--dom-padding); right: var(--dom-padding); top: var(--dom-lyric-start); height: var(--dom-lyric-window-height, 2em); overflow: hidden; line-height: 1.2; }
      .lyric-track { position: absolute; left: 0; right: 0; top: 0; will-change: transform; }
      .dom-lyric { box-sizing: border-box; padding-bottom: var(--dom-lyric-gap); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dom-lyric-current, #fff); font-size: var(--dom-lyric-size); font-weight: 700; opacity: 1; }
      .dom-lyric.is-next { color: var(--dom-lyric-next, #fff); }
      .dom-lyric.is-old { animation: dom-lyric-out 0.5s var(--dom-timing) forwards; }
      @keyframes dom-lyric-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0.45; transform: translateY(-6px); } }
      .dom-main, .dom-translation { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dom-translation { min-height: 1.2em; margin-top: 2px; color: var(--dom-translation-current, #8f929a); font-size: var(--dom-translation-size); font-weight: 700; }
      .dom-lyric.is-next .dom-translation { color: var(--dom-translation-next, #8f929a); }
      .dom-dynamic { color: var(--dom-lyric-unplayed, #777b86); white-space: nowrap; font-size: var(--dom-lyric-size); font-weight: 700; line-height: 1.2; transition: opacity 0.4s ease; }
      .dom-word { position: relative; display: inline-block; }
      .dom-word > span { display: block; white-space: pre; }
      .dom-word-played { position: absolute !important; inset: 0 auto auto 0; width: 100%; overflow: hidden; color: var(--dom-lyric-played, #fff); clip-path: inset(0 100% 0 0); will-change: clip-path; }
      .dom-scroll { width: max-content; max-width: none; overflow: visible; text-overflow: clip; transition: transform 100ms linear; will-change: transform; }
      .resize-handle { position: fixed; z-index: 10; }
      .resize-n, .resize-s { left: 8px; right: 8px; height: 8px; }
      .resize-e, .resize-w { top: 8px; bottom: 8px; width: 8px; }
      .resize-n { top: 0; cursor: ns-resize; }
      .resize-s { bottom: 0; cursor: ns-resize; }
      .resize-e { right: 0; cursor: ew-resize; }
      .resize-w { left: 0; cursor: ew-resize; }
      .resize-ne, .resize-nw, .resize-se, .resize-sw { width: 8px; height: 8px; }
      .resize-ne { top: 0; right: 0; cursor: nesw-resize; }
      .resize-nw { top: 0; left: 0; cursor: nwse-resize; }
      .resize-se { right: 0; bottom: 0; cursor: nwse-resize; }
      .resize-sw { left: 0; bottom: 0; cursor: nesw-resize; }
    </style>
    <img class="dom-background" alt="" draggable="false"><div class="dragbar"></div><main class="content"><img class="dom-cover" alt="" draggable="false"><section class="details"><div class="dom-title"></div><div class="dom-subtitle"></div><div class="dom-artist"></div></section><section class="timebar"><div class="dom-time"></div><div class="dom-progress"><div class="dom-progress-value"></div></div></section><section class="lyrics"><div class="lyric-track"></div></section></main>
    <div class="resize-handle resize-n"></div><div class="resize-handle resize-s"></div><div class="resize-handle resize-e"></div><div class="resize-handle resize-w"></div>
    <div class="resize-handle resize-ne"></div><div class="resize-handle resize-nw"></div><div class="resize-handle resize-se"></div><div class="resize-handle resize-sw"></div>
  `);
  domWindow.document.close();
  domWindow.document.title = "PiPW DOM Window";
  state.domWindow = domWindow;
  let resizeDom = () => {
    let width = domWindow.document.documentElement.clientWidth,
      height = domWindow.document.documentElement.clientHeight,
      layout = getSharedLayout(width, height);
    for (let [key, value] of Object.entries(layout)) {
      domWindow.document.documentElement.style.setProperty(`--dom-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, key === "scale" ? value : `${value}px`);
    }
  };
  if (domWindow.ResizeObserver) {
    new domWindow.ResizeObserver(resizeDom).observe(domWindow.document.documentElement);
  }
  resizeDom();
  domWindow.document.addEventListener("dragstart", (event) => event.preventDefault());
  loadPiP(false, "DomWindow");
  renderDomWindow();
  let updateDom = () => {
    if (!state.domWindow || state.domWindow !== domWindow || domWindow.closed) {
      return;
    }
    // 异常保护：renderDomWindow 一旦抛错且未捕获，下面的 requestAnimationFrame
    // 不会被调度，rAF 循环永久死亡。之后渲染只能靠 PlayProgress/PlayState 驱动
    // （暂停状态下完全没有），表现为小窗停在启动初期的中性底色不再更新。
    try {
      renderDomWindow();
    } catch (e) {
      console.error("PiPW DOM Window: renderDomWindow 异常（循环继续）\n", e);
    }
    domWindow.requestAnimationFrame(updateDom);
  };
  domWindow.requestAnimationFrame(updateDom);
  // 兜底驱动：CEF 对离屏/新建弹窗可能节流 rAF，且暂停播放时 PlayProgress 不回调，
  // 会导致取色结果（cover.onload 后）迟迟无人消费。主窗口侧的低频定时器保证
  // renderDomWindow 至少每 500ms 被调用一次，颜色/文本状态最终一致。
  let fallbackTimer = setInterval(() => {
    if (!state.domWindow || state.domWindow !== domWindow || domWindow.closed) {
      clearInterval(fallbackTimer);
      return;
    }
    try {
      renderDomWindow();
    } catch {}
  }, 500);
  domWindow.addEventListener("beforeunload", () => {
    clearInterval(fallbackTimer);
    if (state.domWindow === domWindow) {
      state.domWindow = undefined;
    }
  });
  domWindow.document.body.addEventListener("mousemove", (event) => {
    let margin = 8;
    let right = domWindow.document.documentElement.clientWidth - margin;
    let bottom = domWindow.document.documentElement.clientHeight - margin;
    let leftEdge = event.clientX < margin;
    let rightEdge = event.clientX >= right;
    let topEdge = event.clientY < margin;
    let bottomEdge = event.clientY >= bottom;
    let cursor = "move";
    if ((leftEdge && topEdge) || (rightEdge && bottomEdge)) cursor = "nwse-resize";
    else if ((rightEdge && topEdge) || (leftEdge && bottomEdge)) cursor = "nesw-resize";
    else if (leftEdge || rightEdge) cursor = "ew-resize";
    else if (topEdge || bottomEdge) cursor = "ns-resize";
    domWindow.document.body.style.cursor = cursor;
  });
  setTimeout(() => {
    betterncm.app.exec(
      `PowerShell -NoProfile -ExecutionPolicy Bypass -command "& '${loadedPlugins.PiPWindow.pluginPath}/domWindowStyle.ps1' -title 'PiPW DOM Window' -watchDrag -aspectWidth ${aspect[0]} -aspectHeight ${aspect[1]} -initialWidth ${Math.ceil(120 * aspect[0] / aspect[1])} -initialHeight 120"`
    );
    let correctDomWindowSize = () => {
      if (state.domWindow !== domWindow || domWindow.closed) return;
      state.domRenderedLyricKey = undefined;
      renderDomWindow();
    };
    setTimeout(correctDomWindowSize, 500);
    setTimeout(correctDomWindowSize, 1200);
  }, 0);
  console.log("PiPW DOM Window: 成功创建独立 DOM 窗口", domWindow);
  return true;
};

window.addEventListener("beforeunload", () => {
  if (state.domWindow && !state.domWindow.closed) {
    state.domWindow.close();
  }
});

plugin.onAllPluginsLoaded(() => {
  load();
});

function load() {
  B();
  C();
  D();
  E();
  F();
  legacyNativeCmder.appendRegisterCall("PlayProgress", "audioplayer", (_, p) => {
    state.playProgress = p * 1000;
    state.playProgressTimestamp = performance.now();
    renderDomWindow();
    let pZ = Math.floor(p);
    if (pZ > state.tC || p < state.tC || state.readCfg.smoothProgessBar) {
      state.tC = p;
    }
  }); //requestAnimationFrame或setInterval会在网易云最小化后被优化，导致1FPS的感人帧率
  legacyNativeCmder.appendRegisterCall("PlayState", "audioplayer", (_, __, playingState) => {
    let now = performance.now();
    if (playingState !== 1 && state.playProgressTimestamp) {
      state.playProgress += Math.max(0, now - state.playProgressTimestamp);
    }
    state.playProgressTimestamp = now;
    state.domView.isPlaying = playingState === 1;
    renderDomWindow();
  });

  async function B() {
    //监听自带词栏变动
    await betterncm.utils.waitForElement(".m-lyric");
    new MutationObserver(() => {
      loadPiP(false, "NCM-LyricBar");
    }).observe(q(".m-lyric"), {
      characterData: true,
      childList: true,
      subtree: true,
    });
  }
  async function C() {
    //监听LB插件词栏变动
    await betterncm.utils.waitForElement(".lyric-bar");
    new MutationObserver(() => {
      loadPiP(false, "Plugin-LyricBar");
    }).observe(q(".lyric-bar"), {
      attributeFilter: ["offset"],
      characterData: true,
      childList: true,
      subtree: true,
    });
  }
  async function D() {
    //监听设置按钮点击事件
    await betterncm.utils.waitForElement(`[data-plugin-slug="PiPWindow"]`);
    q(`[data-plugin-slug="PiPWindow"]`).addEventListener("click", () => {
      setTimeout(() => {
        state.readCfg.colorFrom == "albumCover" ? colorPick(state.cover ? state.cover : null) : colorPick();
      }, 200);
    });
  }
  async function E() {
    //监听颜色变动
    let A = qAll("html, body");
    for (let i = 0; i < A.length; i++) {
      new MutationObserver(() => {
        setTimeout(() => {
          state.readCfg.colorFrom == "albumCover" ? colorPick(state.cover ? state.cover : null) : colorPick();
        }, 100);
      }).observe(A[i], {
        attributeFilter: ["style", "class"],
        characterData: false,
      });
    }
  }
  async function F() {
    //向歌曲信息旁添加PiP开关
    await betterncm.utils.waitForElement(".m-pinfo h3");
    if (!state.b) {
      state.b = cE("div");
    }
    state.b.id = "PiPW-Toggle";
    state.b.title = "打开小窗";
    state.b.classList.add("icn", "f-cp");
    state.b.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 24px; height: 24px; transform: scale(.75);">${pO}</svg>`;
    state.b.addEventListener("click", () => {
      window.PiPWTestDomWindow();
    });
    q(".m-pinfo h3").appendChild(state.b);
    new MutationObserver(() => {
      //歌曲信息变动会清掉开关，加回去
      if (q(".m-pinfo h3") && !q(".m-pinfo h3 [id*=PiP]")) {
        q(".m-pinfo h3").appendChild(state.b);
      }
    }).observe(q(".m-pinfo"), {
      characterData: true,
      childList: true,
      subtree: true,
    });
  }
}

plugin.onConfig(() => {
  return getSettingsPage();
});
