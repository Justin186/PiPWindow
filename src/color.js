/*This plugin is licensed under the GNU/GPL-3.0
**Copyright (C) 2024-2025 Lukoning
*/

import { state } from "./state.js";
import { q, cE } from "./utils.js";

/**
 * 取色：根据配置从主窗口 / 专辑封面 / 自定义颜色中计算
 * 小窗使用的 accent / text / bg 等颜色。
 */
export function colorPick(from = null) {
  let textTO, bgTO;
  function s(e, p) {
    return getComputedStyle(q(e)).getPropertyValue(p);
  }
  state.colorS.accent = s("body", "--themeC1"), (state.colorS.text = s("body", "color"));
  if (q("body.material-you-theme")) {
    state.colorS.text = s("body", "--md-accent-color-secondary");
  }
  if (/rgba/.test(state.colorS.text)) {
    textTO = state.colorS.text.replace(/,([^,)]*)\)/, "");
  } else {
    textTO = state.colorS.text.replace(/rgb\(/, "rgba(").replace(/\)/, "");
  }
  state.colorS.text = `${textTO})`;
  state.colorS.bg = s("body", "background-color");
  if (/rgba/.test(state.colorS.bg)) {
    bgTO = state.colorS.bg.replace(/,([^,)]*)\)/, "");
  } else {
    bgTO = state.colorS.bg.replace(/rgb\(/, "rgba(").replace(/\)/, "");
  }
  (state.colorS.bg = `${bgTO})`), (state.colorS.bgT = `${bgTO}, .3)`);
  if (q("body.material-you-theme:not(.ncm-light-theme)")) {
    state.colorS.bgT = `${state.colorS.accent.replace(/\)/, "")}, .1)`;
  }
  if (state.readCfg.colorFrom == "custom") {
    //这里的数据是HEX格式
    state.color.accent = state.readCfg.colorCustom_accent;
    textTO = state.readCfg.colorCustom_text;
    (state.color.text = textTO),
      (state.color.textT56 = `${textTO}8F`),
      (state.color.textT42 = `${textTO}6B`),
      (state.color.textT31 = `${textTO}4F`),
      (state.color.textT13 = `${textTO}21`);
    bgTO = state.readCfg.colorCustom_bg;
    (state.color.bg = bgTO), (state.color.bgT00 = `${bgTO}00`), (state.color.bgT50 = `${bgTO}7F`);
  } else {
    if (from == null) {
      state.color.accent = state.colorS.accent;
    } else if (from instanceof HTMLElement) {
      function brightness(rgb, factor) {
        let rN = Math.min(255, Math.max(0, rgb[0] * factor)),
          gN = Math.min(255, Math.max(0, rgb[1] * factor)),
          bN = Math.min(255, Math.max(0, rgb[2] * factor));
        return [Math.round(rN), Math.round(gN), Math.round(bN), 255];
      }
      function saturation(rgb, factor) {
        let l = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2],
          rN = Math.min(255, Math.max(0, l + (rgb[0] - l) * factor)),
          gN = Math.min(255, Math.max(0, l + (rgb[1] - l) * factor)),
          bN = Math.min(255, Math.max(0, l + (rgb[2] - l) * factor));
        return [Math.round(rN), Math.round(gN), Math.round(bN), 255];
      }
      if (!state.cpc || !state.cpcC) {
        state.cpc = cE("canvas");
        state.cpc.width = 3;
        state.cpc.height = 3;
        state.cpcC = state.cpc.getContext("2d", { alpha: false });
      }
      from.height ? state.cpcC.drawImage(from, 0, 0, state.cpc.width, state.cpc.height) : "";
      let rgb = state.cpcC.getImageData(1, 1, 2, 2).data,
        l = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2],
        bf = 1,
        sf = 1.2;
      l < 8 ? (bf = 50) : l < 16 ? (bf = 16) : l < 32 ? (bf = 12) : l < 64 ? (bf = 8) : l < 128 ? (bf = 2) : l > 144 ? (bf = -0.4) : "";
      l > 144 ? (sf = 6) : "";
      let rgbN = brightness(rgb, l > 160 ? 1.1 : l > 144 ? 1.4 : 0.5);
      bgTO = `rgba(${rgbN[0]}, ${rgbN[1]}, ${rgbN[2]}`;
      if (state.readCfg.backgroundFrom == "AMLL" && loadedPlugins["Apple-Musiclike-lyrics"]) {
        //AMLL背景下的颜色...优化?
        rgbN = brightness(saturation(rgb, sf + 0.3), 4 + bf);
        if (0.299 * rgbN[0] + 0.587 * rgbN[1] + 0.114 * rgbN[2] > 245) {
          rgbN = brightness(saturation(rgb, 4), 2 + bf);
        }
      } else {
        rgbN = brightness(saturation(rgb, sf), 0.7 + bf);
        if (0.299 * rgbN[0] + 0.587 * rgbN[1] + 0.114 * rgbN[2] > 245) {
          rgbN = brightness(saturation(rgb, 4), 0.7 + bf);
        }
      }
      if (rgbN[0] > 235 && rgbN[1] < 235 && rgbN[2] < 235) {
        rgbN = [235, rgbN[1] < 50 ? 50 : rgbN[1], rgbN[2] < 30 ? 30 : rgbN[2]];
      } //太红看不清
      state.color.accent = `rgb(${rgbN[0]}, ${rgbN[1]}, ${rgbN[2]})`;
      textTO = `rgba(${rgbN[0]}, ${rgbN[1]}, ${rgbN[2]}`;
    }
    (state.color.text = `${textTO})`),
      (state.color.textT56 = `${textTO}, .56)`),
      (state.color.textT42 = `${textTO}, .42)`),
      (state.color.textT31 = `${textTO}, .31)`),
      (state.color.textT13 = `${textTO}, .13)`);
    (state.color.bg = `${bgTO})`), (state.color.bgT00 = `${bgTO}, 0)`), (state.color.bgT50 = `${bgTO}, .5)`);
  }

  try {
    let s0 = q("#PiPWSettingsStyle0", state.cP),
      s = `
#PiPWSettings {
    --pipws-fg: ${state.colorS.accent};
    --pipws-bg: ${state.colorS.bgT};
    --pipws-bg-wot: ${state.colorS.bg};
    color: ${state.colorS.text};
}`;
    if (s0.innerHTML != s) {
      s0.innerHTML = s;
    }
  } catch {}
}
