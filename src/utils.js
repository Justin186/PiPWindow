/*This plugin is licensed under the GNU/GPL-3.0
**Copyright (C) 2024-2025 Lukoning
*/

import { state } from "./state.js";

/** 创建元素 */
export function cE(n, d = document) {
  return d.createElement(n);
}

/** 查询单个元素 */
export function q(n, d = document) {
  return d.querySelector(n);
}

/** 查询多个元素 */
export function qAll(n, d = document) {
  return d.querySelectorAll(n);
}

/** 简体中文 -> 日文汉字（依赖 LibOpenCC 插件） */
export const cn2jp = loadedPlugins.LibOpenCC ? OpenCC.Converter({ from: "cn", to: "jp" }) : waht;

/** 原样返回（无 LibOpenCC 时的降级） */
export function waht() {
  return arguments[0];
}

/** 调试模式：把 canvas 等元素挂到设置页便于检查 */
export function DEBUG() {
  try {
    q("#PiPWSettings").appendChild(state.bgc);
    q("#PiPWSettings").appendChild(state.c);
    q("#PiPWSettings").appendChild(state.v);
    state.amllbgv ? q("#PiPWSettings").appendChild(state.amllbgv) : "";
  } catch {}
}

/** 通过 PowerShell 显示/隐藏任务栏按钮 */
export async function taskbarButton(isShow = true) {
  betterncm.app.exec(
    `PowerShell -command "Set-ExecutionPolicy -Scope Process UnRestricted; ${loadedPlugins.PiPWindow.pluginPath}/taskbarButton.ps1 -Action ${
      isShow ? "Show" : "Hide"
    }"`
  );
}

/** 顶部提示消息 */
export async function tipMsg(m, t) {
  let c1 = "u-result",
    c2 = "j-tips",
    c = `.${c1}.${c2}`,
    iiH = `<span class="u-tit f-ff2">${m}</span>`;
  if (t == "err") {
    iiH = `<i class="icon u-icn u-icn-operatefail"></i><span class="u-tit f-ff2 errTxt">${m}</span>`;
  }
  let iH = `<div class="wrap"><div class="inner j-flag">${iiH}</div></div>`;
  if (q(c + ":not(.z-hide)")) {
    if (q(c + " .inner")) {
      q(c + " .inner").innerHTML = iiH;
    } else {
      q(c).innerHTML = iH;
    }
    try {
      clearTimeout(state.tMsT);
    } catch {}
  } else {
    let d = cE("div");
    d.classList.add(c1, c2);
    d.innerHTML = iH;
    q("body").appendChild(d);
  }
  state.tMsT = setTimeout(() => {
    q(c).classList.add("z-hide");
    q(c + ".z-hide").addEventListener("animationend", () => {
      q(c).remove();
    });
  }, 1200);
}

/** 获取真实 DPI 缩放比。
 * 网易云音乐的 CEF 环境里 window.devicePixelRatio 可能恒为 1，
 * 导致 canvas 分辨率不足、画面模糊。这里用 matchMedia 检测真实系统缩放作为兜底。 */
export function getDpr() {
  let dpr = window.devicePixelRatio || 1;
  if (dpr === 1) {
    try {
      const candidates = [1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 4];
      for (const c of candidates) {
        if (window.matchMedia(`(resolution: ${c}dppx)`).matches) {
          dpr = c;
          break;
        }
      }
    } catch {}
  }
  return dpr;
}

/** 自适应分辨率（按真实 DPI 缩放） */
export function reRatio(rv) {
  if (state.autoRatio) {
    state.rvN = rv;
    // PiP 窗口的 height 是 CSS 像素，canvas backing store 需使用物理像素。
    state.autoRatioValue = Math.round(rv * getDpr());
    state.lastReRatio = Date.now();
  }
}
