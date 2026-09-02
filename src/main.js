/*This plugin is licensed under the GNU/GPL-3.0
**Copyright (C) 2024-2025 Lukoning
*/

import { state, pO } from "./state.js";
import { q, qAll, cE, tipMsg } from "./utils.js";
import { colorPick } from "./color.js";
import { loadPiP } from "./render.js";
import { pipToggle } from "./pip.js";
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
  let domWindow = state.domWindow && !state.domWindow.closed ? state.domWindow : window.open("", "PiPW-DomWindow", "popup=yes,width=408,height=204,resizable=yes");
  if (!domWindow) {
    console.warn("PiPW DOM Window: CEF 拒绝创建窗口");
    return false;
  }
  domWindow.document.write(`
  <title>PiPW DOM Window</title>
    <style>
      html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #202124; color: #fff; font: 700 24px sans-serif; }
      body { display: grid; grid-template-rows: 24px 1fr; }
      .dragbar { cursor: move; user-select: none; background: #303134; }
      .content { display: grid; place-items: center; }
      .line { position: relative; white-space: nowrap; }
      .played, .base { position: absolute; inset: 0 auto auto 0; overflow: hidden; }
      .played { width: 42%; color: #70d6ff; }
    </style>
    <div class="dragbar"></div><div class="content"><div class="line"><span class="base">逐字歌词 DOM 测试</span><span class="played">逐字歌词 DOM 测试</span></div></div>
  `);
  domWindow.document.close();
  domWindow.document.title = "PiPW DOM Window";
  state.domWindow = domWindow;
  domWindow.addEventListener("beforeunload", () => {
    if (state.domWindow === domWindow) {
      state.domWindow = undefined;
    }
  });
  let dragbar = domWindow.document.querySelector(".dragbar");
  dragbar.addEventListener("pointerdown", (event) => {
    let lastX = event.screenX,
      lastY = event.screenY;
    let moveWindow = (moveEvent) => {
      domWindow.moveBy(moveEvent.screenX - lastX, moveEvent.screenY - lastY);
      lastX = moveEvent.screenX;
      lastY = moveEvent.screenY;
    };
    let stopMoving = () => {
      dragbar.removeEventListener("pointermove", moveWindow);
      dragbar.removeEventListener("pointerup", stopMoving);
      dragbar.releasePointerCapture(event.pointerId);
    };
    dragbar.setPointerCapture(event.pointerId);
    dragbar.addEventListener("pointermove", moveWindow);
    dragbar.addEventListener("pointerup", stopMoving);
  });
  setTimeout(() => {
    betterncm.app.exec(
      `PowerShell -NoProfile -ExecutionPolicy Bypass -command "& '${loadedPlugins.PiPWindow.pluginPath}/domWindowStyle.ps1' -title 'PiPW DOM Window'"`
    );
  }, 300);
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
    let pZ = Math.floor(p);
    if (pZ > state.tC || p < state.tC || state.readCfg.smoothProgessBar) {
      state.tC = p;
    }
  }); //requestAnimationFrame或setInterval会在网易云最小化后被优化，导致1FPS的感人帧率

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
      pipToggle();
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
