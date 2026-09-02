/*This plugin is licensed under the GNU/GPL-3.0
**Copyright (C) 2024-2025 Lukoning
*/

import { loadPiP } from "./render.js";

/** 切换 PiP 小窗的打开/关闭 */
export function pipToggle() {
  let pE = document.pictureInPictureElement;
  if (pE && pE.id == "PiPW-VideoE") {
    document.exitPictureInPicture();
  } else {
    loadPiP(true, "PiPW-Toggle");
  }
}
