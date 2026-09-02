/*This plugin is licensed under the GNU/GPL-3.0
**Copyright (C) 2024-2025 Lukoning
*/

import { state, cfgDefault } from "./state.js";
import { q, qAll, tipMsg, taskbarButton } from "./utils.js";
import { loadPiP } from "./render.js";

/** 写配置到 localStorage 并刷新内存中的设置 */
async function writeCfg(Cfg) {
  localStorage.setItem("PiPWindowSettings", JSON.stringify(Cfg));
  state.readCfg = JSON.parse(localStorage.getItem("PiPWindowSettings")); //刷新变量内存储的设置
}

/** 保存设置（从设置页读取控件值） */
export async function saveCfg(all = "all") {
  state.oldCfg = { ...state.readCfg };
  let a = Array.from(arguments);
  if (a[0] == "all") {
    a = Object.keys(cfgDefault);
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] in cfgDefault) {
      let key,
        dfSet = cfgDefault[`${a[i]}`];
      switch (typeof dfSet) {
        case "number":
          let n = q(`#${a[i]}SetBox`, state.cP);
          if (n) {
            let set = n.value * 1;
            if (typeof set != "number" || set == "") {
              set = dfSet;
              n.value = set;
            } else {
              if (n.validity.rangeOverflow) {
                set = n.max;
                n.value = n.max;
              } else if (n.validity.rangeUnderflow) {
                set = n.min;
                n.value = n.min;
              }
            }
            key = set;
          }
          break;
        case "string":
          let str = q(`#${a[i]}SetBox`, state.cP),
            radios = qAll(`[name=${a[i]}]`, state.cP);
          if (radios.length != 0) {
            for (let i = 0; i < radios.length; i++) {
              if (radios[i].checked) {
                key = radios[i].value;
              }
            }
          } else if (str) {
            let set = str.value;
            if (set == "undefined" || set == "null" || set == "") {
              set = dfSet;
              str.value = set;
            }
            key = set;
          }
          break;
        case "boolean":
          let swc = q(`#${a[i]}Switch`, state.cP),
            ckBox = q(`#${a[i]}CheckBox`, state.cP);
          if (swc) {
            key = swc.checked;
          } else if (ckBox) {
            key = ckBox.checked;
          }
          break;
        default:
          console.error(`PiPW Error: !! 不支持此设置项的类型: ${a[i]}`);
      }
      state.readCfg[`${a[i]}`] = key;
    } else {
      console.error(`PiPW Error: 无效的设置项: ${a[i]}`);
    }
  }
  writeCfg(state.readCfg);
  loadPiP(false, "Settings");
  tipMsg("设置已更新");
  console.log("PiPW Log: 设置已保存", state.oldCfg, state.readCfg);
  state.oldCfg.showTaskbarButton == state.readCfg.showTaskbarButton ? "" : taskbarButton(state.readCfg.showTaskbarButton); //特殊处理
}

/** 重置设置为默认值 */
export async function resetCfg() {
  state.oldCfg = { ...state.readCfg };
  state.readCfg = { ...cfgDefault };
  let a = Object.keys(cfgDefault);
  for (let i = 0; i < a.length; i++) {
    if (a[i] in cfgDefault) {
      let key = cfgDefault[`${a[i]}`];
      switch (typeof key) {
        case "string":
          let str = q(`#${a[i]}SetBox`, state.cP),
            radios = qAll(`[name=${a[i]}]`, state.cP);
          if (radios.length != 0) {
            for (let i = 0; i < radios.length; i++) {
              if (radios[i].value == key) {
                radios[i].checked = true;
              }
            }
          } else if (str) {
            str.value = key;
          }
          break;
        case "number":
          q(`#${a[i]}SetBox`, state.cP).value = key;
          break;
        case "boolean":
          let swc = q(`#${a[i]}Switch`, state.cP),
            ckBox = q(`#${a[i]}CheckBox`, state.cP);
          if (swc) {
            swc.checked = key;
          } else if (ckBox) {
            ckBox.checked = key;
          }
          break;
        default:
          console.error(`PiPW Error: !! 不支持此设置项的类型: ${a[i]}`);
      }
    } else {
      console.error(`PiPW Error: 无效的设置项: ${a[i]}`);
    }
  }
  writeCfg(state.readCfg);
  tipMsg("设置已重置");
  console.log("PiPW Log: 设置已重置并保存", state.oldCfg, state.readCfg);
  setTimeout(() => {
    loadPiP(false, "Settings");
  }, 100);
}
