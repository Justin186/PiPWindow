/*This plugin is licensed under the GNU/GPL-3.0
**Copyright (C) 2024-2025 Lukoning
*/

import { state, DcvUrl, discUrl, pO, pC } from "./state.js";
import { cE, q, qAll, cn2jp, DEBUG, taskbarButton, tipMsg, reRatio, getDpr, dlog } from "./utils.js";
import { colorPick } from "./color.js";

/** 使用原 Canvas 的比例参数，为 DOM 窗口提供同一套布局数据。 */
export function getSharedLayout(width, height) {
  let aspect = state.readCfg.aspectRatio.split(":").map(Number),
    ratio = aspect[0] / aspect[1],
    baseHeight = 204,
    cvSizeY = baseHeight / 3,
    o10 = baseHeight / 48,
    o15 = baseHeight / 32,
    o35 = baseHeight / 13.7143,
    o55 = baseHeight / 8.7272,
    o105 = baseHeight / 4.57143,
    o150 = baseHeight / 3.2,
    lrcFS = o55,
    translationSize = lrcFS - baseHeight / 30,
    // /9（原 /10.6667）：给封面下方的时间条行留出上下呼吸空间（时间条行底 ≈87，歌词起点 ≈90.7）
    lrcTop = cvSizeY + baseHeight / 9,
    lyricWindowHeight = state.domLyricWindowHeight || lrcFS * 1.2 + 2 + translationSize * 1.2 + o10,
    contentHeight = lrcTop + lyricWindowHeight,
    scale = width / (contentHeight * ratio);
  return {
    scale,
    width: contentHeight * ratio,
    height: contentHeight,
    cover: cvSizeY,
    infoLeft: cvSizeY + o10,
    titleSize: o55,
    subtitleSize: baseHeight / 13.7143,
    artistSize: baseHeight / 16,
    titleTop: baseHeight / 8,
    subtitleTop: o105,
    artistTop: o150,
    lyricStart: lrcTop,
    lyricWindowHeight,
    lyricSize: lrcFS,
    nextLyricSize: lrcFS - o10,
    lyricGap: o10,
    translationSize,
    padding: o15,
    paddingTop: baseHeight / 48,
    gap: o10,
    timeSize: baseHeight / 16, //时间文字：对齐 canvas 版字号（o30 = r/16），且宽度约等于封面宽度
    progressSize: baseHeight / 96, //进度条粗细：对齐 canvas 版（o5 = r/96），原 /240 过细
  };
}

/**
 * 核心渲染模块：负责把歌曲信息、歌词、封面等绘制到 canvas，
 * 并通过 Picture-in-Picture 显示为小窗。
 *
 * 注意：loadPiP 内部嵌套了大量依赖其局部作用域的函数（歌词获取/处理、
 * 绘制样式等），因此整体保留在此模块中，仅将对外部全局状态的访问
 * 改为通过 state 对象。
 */

/** 把 canvas 捕获为视频流并请求 PiP 小窗 */
HTMLCanvasElement.prototype.toPiP = function () {
  const startVideoFrameLoop = () => {
    if (!(state.v instanceof HTMLVideoElement) || !state.v.requestVideoFrameCallback || state.videoFrameLoopStarted) {
      return;
    }
    state.videoFrameLoopStarted = true;
    const token = ++state.videoFrameLoopToken;
    const renderAfterVideoFrame = () => {
      state.v.requestVideoFrameCallback(() => {
        if (token !== state.videoFrameLoopToken) {
          return;
        }
        loadPiP(false, "VideoFrame");
        if (!state.v.paused && !state.v.ended) {
          renderAfterVideoFrame();
        } else {
          state.videoFrameLoopStarted = false;
        }
      });
    };
    renderAfterVideoFrame();
  };
  const stopVideoFrameLoop = () => {
    state.videoFrameLoopToken++;
    state.videoFrameLoopStarted = false;
  };
  if (!(state.v instanceof HTMLVideoElement)) {
    state.v = cE("video");
    state.v.addEventListener("loadedmetadata", async () => {
      try {
        //请求小窗
        state.v.requestPictureInPicture().then((p) => {
          state.thePiPWindow = p;
          reRatio(p.height); //自适应分辨率
          loadPiP(false, "PiP-created");
          p.addEventListener("resize", (e) => {
            reRatio(e.target.height);
            loadPiP(false, "PiP-resize");
          });
          taskbarButton(state.readCfg.showTaskbarButton); //任务栏按钮
        });
        let pS = ".m-player:not(.f-dn)";
        //控制按钮设置
        navigator.mediaSession.setActionHandler("play", () => {
          state.v.play();
          navigator.mediaSession.playbackState = "playing";
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          state.v.pause();
          navigator.mediaSession.playbackState = "paused";
        });
        navigator.mediaSession.setActionHandler("previoustrack", () => {
          q(`${pS} .btnc-prv`).click();
        });
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          q(`${pS} .btnc-nxt`).click();
        });
        if (state.isVLsnAdded) {
          return; //防止重复加监听器
        }
        //小窗暂停/播放同步到主窗口
        function ncmPlay() {
          if (!state.DontPlay) {
            try {
              q(`${pS} .btnp-play`).click();
            } catch {}
          }
          state.DontPause = false;
        }
        function ncmPause() {
          if (!state.DontPause) {
            try {
              q(`${pS} .btnp-pause`).click();
            } catch {}
          }
          state.DontPlay = false;
        }
        state.v.addEventListener("play", () => {
          startVideoFrameLoop();
          ncmPlay();
        });
        state.v.addEventListener("pause", () => {
          stopVideoFrameLoop();
          ncmPause();
        });
        //小窗打开/关闭逻辑
        state.v.addEventListener("enterpictureinpicture", (e) => {
          console.log("PiPW Log: PiP窗口已创建", state.v);
          let s = betterncm.ncm.getPlayingSong();
          if (!s) {
            s = { state: 1 };
          }
          if (state.readCfg.autoHideMainWindow) {
            mwf.cef.R$exec("winhelper.showWindow", "minimize");
            mwf.cef.R$call("winhelper.showWindow", "hide");
          }
          tipMsg("已打开小窗");
          q("svg", state.b).innerHTML = pC;
          state.b.setAttribute("style", "fill: currentColor; opacity: 1");
          state.b.title = "关闭小窗";
          if (s.state == 1) {
            state.v.pause();
          }
          state.DontPlay = false;
          if (state.debugMode) {
            console.log(e);
          }
        });
        state.v.addEventListener("leavepictureinpicture", (e) => {
          state.DontPause = true;
          let p = state.v.paused;
          tipMsg("已关闭小窗");
          q("svg", state.b).innerHTML = pO;
          state.b.setAttribute("style", "");
          state.b.title = "打开小窗";
          setTimeout(() => {
            if (state.v.paused != p) {
              //状态不一致，判定为按下关闭按钮
              let c = state.readCfg.whenClose;
              if (c == "pause") {
                state.DontPause = false;
                ncmPause();
              } else if (c == "shutdown") {
                state.DontPause = false;
                ncmPause();
                if (state.debugMode) {
                  tipMsg("调试模式：触发退出云音乐");
                  return;
                }
                mwf.cef.R$call("winhelper.showWindow", "hide");
                mwf.cef.R$exit();
              }
            } else if (!p && state.readCfg.whenBack == "back") {
              mwf.cef.R$call("winhelper.showWindow", "show");
            } else if (state.readCfg.whenCloseOrBack_paused == "back") {
              mwf.cef.R$call("winhelper.showWindow", "show");
            }
          }, 10);
          if (state.debugMode) {
            console.log(e);
          }
        });
        //主窗口暂停/播放同步到小窗
        legacyNativeCmder.appendRegisterCall("PlayState", "audioplayer", (_, __, st) => {
          //监听播放状态变动
          if (st === 2) {
            state.DontPause = true;
            state.v.pause();
            try {
              state.amllbgv.pause();
            } catch {}
          } else if (st === 1) {
            state.DontPlay = true;
            state.v.play();
            startVideoFrameLoop();
            try {
              state.amllbgv.play();
            } catch {}
          }
        });
        state.isVLsnAdded = true;
      } catch (e) {
        console.error("PiPW Error: PiP窗口创建出错，详情：\n", e);
        tipMsg("PiP窗口创建出错，详见JavaScript控制台", "err");
      }
    });
  }
  state.v.id = "PiPW-VideoE";
  let cs = this.captureStream(0);
  state.captureTrack = cs.getVideoTracks()[0];
  if (state.captureTrack) {
    state.captureTrack.contentHint = "motion";
  }
  state.v.srcObject = cs; //刷新源
  state.v.controls = state.debugMode;
  state.v.muted = true;
  state.v.playsInline = true;
  if (state.debugMode) {
    DEBUG();
  }
  state.DontPlay = true; //解决打开小窗时自动播放的问题
  state.v.play(); //否则黑窗
  startVideoFrameLoop();
};

/** 主渲染函数：合并异步重绘请求，避免多个渲染同时执行 */
export function loadPiP(isToPiP = true, from = "unknow") {
  let renderStart = performance.now();
  if (state.showRefreshing) {
    state.fpsRequestCount++;
  } else {
    state.fpsWindowStart = 0;
    state.fpsRequestCount = 0;
    state.fpsRenderCount = 0;
  }
  if (state.redrawInProgress) {
    state.redrawPending = true;
    return Promise.resolve();
  }
  state.redrawInProgress = true;
  return loadPiPImpl(isToPiP, from).finally(() => {
    let renderDuration = performance.now() - renderStart;
    if (state.showRefreshing && renderDuration >= 50) {
      console.warn(
        `PiPW SlowFrame: ${renderDuration.toFixed(1)}ms，来源${from}，动态歌词${state.isDynamicLyrics}，歌词行${state.lrcLineCache.line}，canvas ${state.c?.width}x${state.c?.height}`
      );
    }
    state.redrawInProgress = false;
    state.captureTrack?.requestFrame?.();
    if (state.showRefreshing) {
      state.fpsRenderCount++;
      let now = Date.now();
      if (!state.fpsWindowStart) {
        state.fpsWindowStart = now;
      } else if (now - state.fpsWindowStart >= 1000) {
        let seconds = (now - state.fpsWindowStart) / 1000,
          track = state.v?.srcObject?.getVideoTracks?.()[0],
          settings = track?.getSettings?.();
        console.log(
          `PiPW FPS: 请求${(state.fpsRequestCount / seconds).toFixed(1)}次/s，完成${(state.fpsRenderCount / seconds).toFixed(1)}帧/s，视频轨道${settings?.frameRate ?? "?"}fps，canvas ${state.c?.width}x${state.c?.height}，DPR ${getDpr()}`
        );
        state.fpsWindowStart = now;
        state.fpsRequestCount = 0;
        state.fpsRenderCount = 0;
      }
    }
    if (state.redrawPending) {
      state.redrawPending = false;
      loadPiP(false, "coalesced");
    }
  });
}

/** 把与 Canvas 相同的已解析内容同步给 DOM 小窗。 */
function syncDomLyrics(currentProgress) {
  if (!Array.isArray(state.pLrc) || !state.pLrc.length) {
    return;
  }
  let keys = state.pLrcKeys || Object.keys(state.pLrc),
    position = currentProgress + state.readCfg.lyricsOffset * 1000,
    left = 0,
    right = keys.length;
  // 找到最后一个 time <= position 的行，不再要求 position < time + duration；
  // 这样在当前行结束（time + duration）到下一行开始（nextLine.time）之间的
  // 空白间隔里，仍然停留在当前行，直到下一句开始才切换。
  while (left < right) {
    let middle = Math.floor((left + right) / 2),
      line = state.pLrc[middle];
    if (position < line.time) {
      right = middle;
    } else {
      left = middle + 1;
    }
  }
  let lineIndex = Math.max(0, Math.min(left - 1, keys.length - 1)),
    currentLine = state.pLrc[lineIndex],
    main = currentLine.dynamicLyric && state.readCfg.dynamicLyrics ? currentLine.dynamicLyric : currentLine.originalLyric,
    translations = [];
  for (let i = 0; i < 5; i++) {
    let item = state.pLrc[lineIndex + i];
    translations.push({
      main: item ? (item.dynamicLyric && i === 0 && state.readCfg.dynamicLyrics ? item.dynamicLyric : item.originalLyric) || "" : "",
      translation: item ? item.translatedLyric || "" : "",
    });
  }
  if (state.readCfg.lyricLine2Show === "none") {
    for (let item of translations) item.translation = "";
  } else if (state.readCfg.lyricLine2Show === "latinization") {
    for (let i = 0; i < translations.length; i++) translations[i].translation = state.pLrc[lineIndex + i]?.romanLyric || "";
  }
  let lyricKey = `${lineIndex}:${Array.isArray(main) ? main.map((word) => word.word).join("") : main}`;
  if (state.domView.lyricKey !== lyricKey) {
    if (state.debugLyric) {
      let prevLine = state.domView.lyricIndex >= 0 ? state.pLrc[state.domView.lyricIndex] : null;
      dlog(
        `换行判定 ${state.domView.lyricIndex}→${lineIndex}`,
        `位置=${(position / 1000).toFixed(2)}s`,
        `旧行起止=[${prevLine ? (prevLine.time / 1000).toFixed(2) : "?"}~${prevLine ? ((prevLine.time + (prevLine.duration || 0)) / 1000).toFixed(2) : "?"}]`,
        `新行起止=[${(currentLine.time / 1000).toFixed(2)}~${((currentLine.time + (currentLine.duration || 0)) / 1000).toFixed(2)}]`
      );
    }
    state.domView.lyricKey = lyricKey;
    state.domView.lyricIndex = lineIndex;
    state.domView.lines = translations;
    state.domView.dynamicWords = Array.isArray(main) ? main : null;
    state.domView.dynamicTime = currentLine.dynamicLyricTime || currentLine.time;
    state.domView.dynamicDuration = currentLine.duration;
    state.domViewRevision++;
  }
}

export function renderDomWindow(from = "unknown") {
  let domWindow = state.domWindow;
  if (!domWindow || domWindow.closed) {
    return;
  }
  let doc = domWindow.document;
  let layout = getSharedLayout(doc.documentElement.clientWidth, doc.documentElement.clientHeight);
  let view = state.domView;
  let isPlaying = view.isPlaying;
  let currentProgress = state.playProgress;
  let hasAudioTime = false;
  let audioPlayer = loadedPlugins.LibFrontendPlay?.currentAudioPlayer;
  if (audioPlayer && Number.isFinite(audioPlayer.currentTime)) {
    currentProgress = audioPlayer.currentTime * 1000;
    isPlaying = !audioPlayer.paused;
    hasAudioTime = true;
  }
  if (!hasAudioTime && isPlaying && state.playProgressTimestamp) {
    currentProgress += Math.max(0, performance.now() - state.playProgressTimestamp);
  }
  // 每秒一次渲染统计：来源分布、进度源健康度（帧间增量/PlayProgress 陈旧度/主窗口是否隐藏）
  if (state.debugLyric) {
    let now = performance.now();
    state.dbgRenderCount++;
    state.dbgRenderSources[from] = (state.dbgRenderSources[from] || 0) + 1;
    if (now - state.dbgLastStatAt >= 1000) {
      let staleness = state.playProgressTimestamp ? now - state.playProgressTimestamp : -1;
      dlog(
        `渲染${state.dbgRenderCount}次/s[${Object.entries(state.dbgRenderSources).map(([k, v]) => `${k}:${v}`).join(",")}]`,
        `进度=${(currentProgress / 1000).toFixed(2)}s(Δ${((currentProgress - state.dbgLastCurrentProgress) / 1000).toFixed(2)})`,
        `音频=${audioPlayer ? `${audioPlayer.currentTime.toFixed(2)}s${audioPlayer.paused ? "⏸" : "▶"}` : "无LFP"}`,
        `PP陈旧=${staleness < 0 ? "无" : `${staleness.toFixed(0)}ms`}`,
        `主窗隐藏=${document.hidden}`,
        `行=${state.domView.lyricIndex}`
      );
      state.dbgLastStatAt = now;
      state.dbgRenderCount = 0;
      state.dbgRenderSources = {};
      state.dbgLastCurrentProgress = currentProgress;
    }
  }
  syncDomLyrics(currentProgress);
  let lyricProgress = currentProgress + state.readCfg.lyricsOffset * 1000;
  let duration = state.tT || view.duration;
  let currentRatio = duration > 0 ? currentProgress / 1000 / duration : view.progress;
  let currentSeconds = Math.max(0, currentProgress / 1000),
    totalSeconds = Math.max(0, duration),
    currentMinutes = Math.floor(currentSeconds / 60),
    currentSecondPart = Math.floor(currentSeconds % 60),
    totalMinutes = Math.floor(totalSeconds / 60),
    totalSecondPart = Math.floor(totalSeconds % 60),
    currentText = `${currentMinutes}:${currentSecondPart < 10 ? "0" : ""}${currentSecondPart}`,
    totalText = `${totalMinutes}:${totalSecondPart < 10 ? "0" : ""}${totalSecondPart}`,
    remainingSeconds = Math.max(0, totalSeconds - currentSeconds),
    remainingMinutes = Math.floor(remainingSeconds / 60),
    remainingSecondPart = Math.floor(remainingSeconds % 60),
    remainingText = `-${remainingMinutes}:${remainingSecondPart < 10 ? "0" : ""}${remainingSecondPart}`,
    displayTime = state.readCfg.timeInfo === "CurrentRemaining" ? `${currentText} / ${remainingText}` : `${currentText} / ${totalText}`;
  let viewChanged = state.domRenderedRevision !== state.domViewRevision;
  let cover = q(".dom-cover", doc),
    background = q(".dom-background", doc),
    title = q(".dom-title", doc),
    subtitle = q(".dom-subtitle", doc),
    artist = q(".dom-artist", doc),
    time = q(".dom-time", doc),
    progress = q(".dom-progress-value", doc),
    track = q(".lyric-track", doc);
  if (!cover || !title) {
    return;
  }
  progress.style.transform = `scaleX(${Math.max(0, Math.min(1, currentRatio))})`;
  for (let [key, value] of Object.entries(layout)) {
    doc.documentElement.style.setProperty(`--dom-${key}`, key === "scale" ? value : `${value}px`);
  }
  if (time.textContent !== displayTime) {
    time.textContent = displayTime;
  }
  // 歌词行是否真正变化（用 lyricKey 判断，而非 viewChanged——后者因 loadPiP 每帧
  // 递增 domViewRevision 而每帧为 true，会导致歌词行每帧重建、动画每帧重播）
  let lyricChanged = state.domRenderedLyricKey !== view.lyricKey;
  if (viewChanged) {
    if (cover.src !== view.coverUrl && view.coverUrl) {
      cover.src = view.coverUrl;
    }
    if (background && background.src !== view.coverUrl && view.coverUrl) {
      background.src = view.coverUrl;
    }
    if (background) {
      background.hidden = state.readCfg.backgroundFrom !== "albumCoverBlur";
    }
    title.textContent = view.title;
    subtitle.textContent = view.subtitle;
    artist.textContent = view.artist;
  }
  // 背景/前景色应用放在 viewChanged 门之外：启动初期 cover.onload 后若没有任何
  // 驱动调用 renderDomWindow（DOM 窗口 rAF 未跑 + 暂停播放无 PlayProgress），
  // 被 bump 的修订号永远没机会被消费，表现为"纯色底一直是中性的，只有暂停/继续才正常"。
  // 另外主窗口 MutationObserver 触发的 colorPick 不提升修订号，也依赖此处无条件应用。
  // 幂等写入：用上次已应用的值做比较（不能直接读 style.background——
  // 浏览器会把 hex 序列化成 rgb()，导致比较永不相等、每帧重复写入）。
  {
    let effectiveBg = state.color.bg || view.background || "#202124";
    let effectiveText = state.color.text || view.textColor || "#ffffff";
    if (state.domAppliedBg !== effectiveBg) {
      state.domAppliedBg = effectiveBg;
      doc.body.style.background = effectiveBg;
    }
    if (state.domAppliedText !== effectiveText) {
      state.domAppliedText = effectiveText;
      doc.body.style.color = effectiveText;
    }
    doc.documentElement.style.setProperty("--dom-accent", state.color.accent || view.accent || "#70d6ff");
  }
  // 标题/副标题/歌手/时间的颜色跟随取色动态变化（与 canvas 版配色层级一致）
  doc.documentElement.style.setProperty("--dom-text-primary", state.color.text || "#ffffff");
  doc.documentElement.style.setProperty("--dom-text-secondary", state.color.textT56 || "#b7bbc5");
  doc.documentElement.style.setProperty("--dom-text-tertiary", state.color.textT56 || "#858995");
  doc.documentElement.style.setProperty("--dom-text-meta", state.color.textT56 || "#b7bbc5");
  doc.documentElement.style.setProperty("--dom-lyric-current", state.color.text || "#ffffff");
  doc.documentElement.style.setProperty("--dom-lyric-next", state.color.textT56 || "#ffffff");
  doc.documentElement.style.setProperty("--dom-lyric-unplayed", state.color.textT42 || "#777b86");
  doc.documentElement.style.setProperty("--dom-lyric-played", state.color.text || "#ffffff");
  doc.documentElement.style.setProperty("--dom-translation-current", state.color.textT56 || "#8f929a");
  doc.documentElement.style.setProperty("--dom-translation-next", state.color.textT31 || "#8f929a");
  if (lyricChanged && track) {
    dlog(`重建DOM歌词行 index=${view.lyricIndex}`, `歌词进度=${(lyricProgress / 1000).toFixed(2)}s`, `来源=${from}`);
    let targetIndex = view.lyricIndex,
      previousIndex = state.domRenderedLyricIndex ?? -1;
    // 保留旧行 DOM 不动（scroll 状态天然保留），只重建目标行
    let oldRow = previousIndex >= 0 ? q(`.dom-lyric[data-lyric-index="${previousIndex}"]`, track) : null;
    if (oldRow) {
      oldRow.classList.remove("is-next");
      oldRow.classList.add("is-old");
      // 冻结旧行 scroll：换行后不再更新，保持唱完时的位置
      oldRow.dataset.scrollFrozen = "";
    }
    // 移除旧的目标行（若存在），避免重复
    let existingTarget = q(`.dom-lyric[data-lyric-index="${targetIndex}"]`, track);
    if (existingTarget) existingTarget.remove();
    // 创建目标行
    let item = state.pLrc?.[targetIndex],
      row = doc.createElement("div"),
      main = doc.createElement("div"),
      translation = doc.createElement("div");
    row.className = "dom-lyric";
    row.dataset.lyricIndex = `${targetIndex}`;
    main.className = "dom-main";
    translation.className = "dom-translation";
    let words = Array.isArray(view.dynamicWords) ? view.dynamicWords : item?.dynamicLyric;
    if (Array.isArray(words)) {
      let dynamic = doc.createElement("div");
      dynamic.className = "dom-dynamic";
      dynamic.dataset.lyricIndex = `${targetIndex}`;
      main.appendChild(dynamic);
      renderDynamic(dynamic, words);
    } else {
      main.textContent = item?.originalLyric || "";
    }
    translation.textContent =
      state.readCfg.lyricLine2Show === "none"
        ? ""
        : state.readCfg.lyricLine2Show === "latinization"
          ? item?.romanLyric || ""
          : item?.translatedLyric || "";
    row.append(main, translation);
    // 新行插到旧行之后（若旧行存在），否则追加到末尾
    if (oldRow) {
      oldRow.after(row);
    } else {
      track.appendChild(row);
    }
    let targetRow = row;
    if (targetRow) {
      let aspect = state.readCfg.aspectRatio.split(":").map(Number),
        ratio = aspect[0] / aspect[1];
      state.domLyricWindowHeight = targetRow.offsetHeight;
      layout.lyricWindowHeight = state.domLyricWindowHeight;
      layout.height = layout.lyricStart + layout.lyricWindowHeight;
      layout.width = layout.height * ratio;
      layout.scale = doc.documentElement.clientWidth / layout.width;
      doc.documentElement.style.setProperty("--dom-scale", layout.scale);
      doc.documentElement.style.setProperty("--dom-width", `${layout.width}px`);
      doc.documentElement.style.setProperty("--dom-height", `${layout.height}px`);
      doc.documentElement.style.setProperty("--dom-lyric-window-height", `${layout.lyricWindowHeight}px`);
    }
    track.parentElement.style.height = `${layout.lyricWindowHeight}px`;
    let mainEl = targetRow.querySelector(".dom-main");
    if (!mainEl.querySelector(".dom-dynamic")) prepareDomScroll(mainEl);
    prepareDomScroll(targetRow.querySelector(".dom-translation"));
    fitDomWindowHeight(targetRow, layout);
    state.domRenderedLyricKey = view.lyricKey;
    state.domRenderedLyricIndex = targetIndex;
    let oldRowHeight = oldRow ? oldRow.offsetHeight : 0;
    let initialOffset = oldRow ? -oldRow.offsetTop : 0,
      targetOffset = targetRow ? -targetRow.offsetTop : 0,
      distance = Math.abs(targetOffset - initialOffset),
      duration = Math.round(260 + Math.sqrt(Math.max(1, distance / Math.max(1, targetRow?.offsetHeight || 1))) * 180);
    track.style.transform = `translateY(${initialOffset}px)`;
    void track.offsetWidth;
    let finish = (event) => {
      if (state.domLyricAnimation !== finish) return;
      if (event && (event.target !== track || event.propertyName !== "transform")) return;
      let clip = track.parentElement.getBoundingClientRect(),
        finishedRows = qAll(".dom-lyric", track);
      for (let finishedRow of finishedRows) {
        if (finishedRow !== targetRow && (finishedRow.getBoundingClientRect().bottom <= clip.top || finishedRow.getBoundingClientRect().top >= clip.bottom)) {
          finishedRow.remove();
        }
      }
      targetRow.classList.remove("is-old");
      track.style.transition = "none";
      // 旧行移除后 targetRow.offsetTop 变了，瞬移补偿后归零
      if (oldRowHeight && targetRow) {
        track.style.transform = `translateY(${-targetRow.offsetTop - oldRowHeight}px)`;
        void track.offsetWidth;
      }
      track.style.transform = "translateY(0)";
      track.removeEventListener("transitionend", finish);
      state.domLyricAnimation = undefined;
    };
    track.removeEventListener("transitionend", state.domLyricAnimation);
    track.addEventListener("transitionend", finish);
    state.domLyricAnimation = finish;
    setTimeout(finish, duration + 80);
    // 必须用 DOM 窗口自己的 rAF 启动过渡：主窗口最小化后其 rAF 被冻结，
    // 该回调永不执行 → track 停在旧行位置（换行判定正确但界面不换行），
    // 只能靠被节流的 setTimeout(finish) 在 ~1s 后跳变归位，动画全部丢失。
    // DOM 小窗可见，其 rAF 不受主窗口最小化影响。
    domWindow.requestAnimationFrame(() => {
      if (state.domLyricAnimation !== finish) return;
      track.style.transition = `transform ${duration}ms var(--dom-timing)`;
      track.style.transform = `translateY(${targetOffset}px)`;
    });
  } else if (lyricChanged) {
    dlog("异常：行已变化但找不到 .lyric-track，重建被跳过", `index=${view.lyricIndex}`);
  }
  for (let dynamic of qAll(".dom-dynamic", track)) {
    let row = dynamic.closest(".dom-lyric");
    if (row && "scrollFrozen" in row.dataset) continue;
    let lyricIndex = Number(dynamic.dataset.lyricIndex),
      words = state.pLrc?.[lyricIndex]?.dynamicLyric;
    if (Array.isArray(words)) renderDynamic(dynamic, words);
  }
  for (let row of qAll(".dom-lyric", track)) {
    if ("scrollFrozen" in row.dataset) continue;
    let lyricIndex = Number(row.dataset.lyricIndex),
      item = state.pLrc?.[lyricIndex],
      lineDuration = item?.duration || 0,
      lineProgress = lineDuration > 0 ? (lyricProgress - item.time) / lineDuration : 0;
    for (let element of qAll(".dom-scroll", row)) {
      let tw = element.scrollWidth || 0;
      updateDomScroll(element, tw * Math.max(0, Math.min(1, lineProgress)), tw);
    }
  }
  state.domRenderedRevision = state.domViewRevision;

  function renderDynamic(dynamic, words) {
    let dynamicKey = words.map((word) => `${word.time}:${word.duration}:${word.word}`).join("|");
    if (dynamicKey !== dynamic.dataset.key) {
      dynamic.dataset.key = dynamicKey;
      dynamic.textContent = "";
      for (let i = 0; i < words.length; i++) {
        let word = words[i],
          wordContainer = doc.createElement("span"),
          base = doc.createElement("span"),
          played = doc.createElement("span");
        wordContainer.className = "dom-word";
        base.textContent = word.word;
        played.textContent = word.word;
        played.className = "dom-word-played";
        wordContainer.append(base, played);
        dynamic.appendChild(wordContainer);
      }
    }
    let wordElements = qAll(".dom-word-played", dynamic),
      wordContainers = qAll(".dom-word", dynamic),
      playedWidth = 0,
      totalWidth = 0;
    for (let i = 0; i < wordElements.length; i++) {
      let word = words[i],
        wordProgress = word.duration > 0 ? (lyricProgress - word.time) / word.duration : lyricProgress >= word.time ? 1 : 0,
        clampedProgress = Math.max(0, Math.min(1, wordProgress)),
        right = `${Math.max(0, Math.min(1, 1 - wordProgress)) * 100}%`;
      wordElements[i].style.clipPath = `inset(0 ${right} 0 0)`;
      totalWidth += wordContainers[i].offsetWidth;
      playedWidth += wordContainers[i].offsetWidth * clampedProgress;
    }
    prepareDomScroll(dynamic);
  }

  function prepareDomScroll(element) {
    if (!element) return;
    if (!state.readCfg.autoScroll) {
      element.classList.remove("dom-scroll");
      element.style.removeProperty("--dom-scroll-distance");
      element.style.removeProperty("--dom-scroll-duration");
      element.style.removeProperty("transform");
      return;
    }
    if (!element.classList.contains("dom-scroll") && element.scrollWidth > element.clientWidth) {
      element.classList.add("dom-scroll");
    }
  }

  // 像素空间等速滚动：offset 随 playedWidth 线性变化（速度恒定）。
  // 触发更早：播放头到达 triggerX 处即开始滚动；
  // 末尾贴最右：滚动结束时（playedWidth=totalWidth）文本末尾停在 viewport 右缘。
  function updateDomScroll(element, playedWidth, totalWidth) {
    if (!element || !element.classList.contains("dom-scroll")) return;
    let viewportWidth = element.parentElement?.clientWidth || element.clientWidth,
      scrollPadding = layout.cover / 3.2,
      triggerRatio = 0.7,
      triggerX = viewportWidth * triggerRatio,
      // 触发点：playedWidth 达到 triggerX - scrollPadding 时 offset=0
      startPlayed = triggerX - scrollPadding,
      // 终点：playedWidth=totalWidth 时文本末尾贴右
      endOffset = viewportWidth - totalWidth - scrollPadding,
      offset = 0;
    if (playedWidth > startPlayed && totalWidth > startPlayed) {
      // 线性插值：offset 从 0 线性过渡到 endOffset，速度恒定
      let t = (playedWidth - startPlayed) / (totalWidth - startPlayed);
      offset = endOffset * Math.max(0, Math.min(1, t));
    }
    element.style.transform = `translateX(${offset}px)`;
  }

  function fitDomWindowHeight(row, currentLayout) {
    if (!row || typeof domWindow.resizeTo !== "function") return;
    let targetHeight = Math.ceil(currentLayout.height * currentLayout.scale),
      targetWidth = Math.ceil(currentLayout.width * currentLayout.scale),
      currentHeight = doc.documentElement.clientHeight,
      currentWidth = doc.documentElement.clientWidth;
    doc.documentElement.style.setProperty("--dom-content-height", `${Math.ceil(currentLayout.height)}px`);
    if (Math.abs(currentHeight - targetHeight) < 8 && Math.abs(currentWidth - targetWidth) < 8) return;
    domWindow.resizeTo(domWindow.outerWidth - currentWidth + targetWidth, domWindow.outerHeight - currentHeight + targetHeight);
  }
}

async function loadPiPImpl(isToPiP = true, from = "unknow") {
  let PiPE = document.pictureInPictureElement;
  let domOnly = !isToPiP && !PiPE && state.domWindow;
  if (!isToPiP && !PiPE && !state.debugMode && !state.domWindow) {
    return;
  }
  if (PiPE && PiPE.id != "PiPW-VideoE") {
    tipMsg("PiP窗口被占用", "err");
    if (!state.debugMode) {
      return;
    }
  }
  let startTime = Date.now();
  try {
    let nrInfo = false /*need re-*/,
      nrHead = false,
      chigai = false /*曲目不同以往(?)*/,
      ldTxt = state.readCfg.customLoadingTxt;
    /*分辨率*/
    let r = state.readCfg.resolutionRatio;
    if (r == "auto") {
      state.autoRatio = true;
      r = state.thePiPWindow ? Math.round(state.thePiPWindow.height * getDpr()) : state.autoRatioValue;
      state.autoRatioValue = r;
    } else {
      state.autoRatio = false;
      r = r * 1;
    }

    let pS = betterncm.ncm.getPlayingSong(),
      data;
    if (!pS || !pS.data) {
      return;
    }
    if (pS) {
      data = pS.data;
      if (data.track && state.readCfg.useCloudDataForLocalFile) {
        //track为本地歌曲对应云端数据, 是否使用这个数据会影响歌词请求、信息展示等
        data = data.track;
      }
    }

    if (data.id != state.songIdCache) {
      getInfo();
      chigai = true;
      state.songIdCache = data.id;
      state.nrLrc = true;
      nrHead = true;
    }
    updateTime();
    if (
      from == "Settings" &&
      (state.oldCfg.lyricsFrom != state.readCfg.lyricsFrom ||
        state.oldCfg.lyricsCustomSources != state.readCfg.lyricsCustomSources)
    ) {
      state.nrLrc = true;
    }

    let cvSizeX = r / 3,
      cvSizeY = r / 3;
    /*封面*/
    if (!state.cover) {
      state.cover = new Image();
    }
    let s = state.readCfg.albumCoverSize,
      thbn = `thumbnail=${s}y${s}`;
    state.readCfg.useFullCover ? (thbn = "") : "";
    if (state.readCfg.allowNonsquareCover) {
      cvSizeX = state.cover.width * (cvSizeY / state.cover.height);
      thbn = "";
    }
    try {
      state.OcvUrl = q("img.j-cover").src;
      if (state.OcvUrl != state.OcvUrlCache) {
        nrHead = true;
        state.OcvUrlCache = state.OcvUrl;
      } //不对头…刷新！(解决断网有时获取封面为空问题)
    } catch {}
    try {
      let u = data.album.picUrl;
      if (!u) {
        ya.ma.no.su.su.me;
        throw new Error();
      } else {
        state.cvUrl = `orpheus://cache/?${u}?imageView&enlarge=1&type=webp${thbn == "" ? "" : `&${thbn}`}`;
      }
    } catch {
      try {
        state.cvUrl = state.OcvUrl.replace(/thumbnail=([^&]+)/, `type=webp${thbn == "" ? "" : `&${thbn}`}`);
        if (!state.cvUrl) {
          state.cvUrl = null;
        }
      } catch {
        state.cvUrl = null;
      }
    }
    if (state.cvUrl != state.cvUrlCache) {
      nrHead = true;
    }
    function getInfo() {
      /*歌名*/
      try {
        state.song.name = data.name;
        switch (state.readCfg.trackInfoShow) {
          case "auto":
            trans();
            if (state.song.nameAnother == "") {
              album();
            }
            break;
          case "album":
            album();
            break;
          case "translation":
            trans();
            break;
          default:
            album();
        }
        function trans() {
          let t = data.transNames,
            a = data.alias;
          t = t ? t[0] : null, (a = a ? a[0] : null);
          if (t || a) {
            state.song.nameAnother = `${t || ""}${t && a ? " " : ""}${a || ""}`;
          } else {
            state.song.nameAnother = "";
          }
        }
        function album() {
          let n = data.album.name,
            t = data.album.transNames;
          n = n ? n : null, (t = t ? t[0] : null);
          if (n || t) {
            state.song.nameAnother = `${n || ""}${t ? " (" + t + ")" : ""}`;
          } else {
            state.song.nameAnother = "未知专辑";
          }
        }
      } catch {
        let t = q(".m-pinfo .j-title");
        state.song.name = t ? t.title : "没有曲目";
        try {
          state.song.nameAnother = q(".m-pinfo .j-title .s-fc4").textContent.slice(1).slice(0, -1);
        } catch {}
      }

      /*歌手*/
      let sa = "",
        saE;
      try {
        saE = data.artists;
        for (let i = 0; i < saE.length; i++, sa = sa + " / ") {
          sa = sa + saE[i].name;
        }
        sa = sa.slice(0, -3); /*处理多余斜杠*/
        state.song.artist = sa == "" ? "未知艺术家" : sa;
      } catch {
        saE = qAll(".m-pinfo .bar > .j-title span:first-child *");
        if (saE && saE.length != 0) {
          for (let i = 0; i < saE.length; i++, sa = sa + " / ") {
            sa = sa + saE[i].textContent;
          }
          sa = sa.slice(0, -3); /*处理多余斜杠*/
          state.song.artist = sa == "未知" ? "未知艺术家" : sa;
        }
      }
    }

    function updateTime() {
      try {
        let current = state.playProgress / 1000,
          total = data.duration / 1000;
        if (!Number.isFinite(current)) {
          current = state.tC;
        }
        if (!Number.isFinite(total) || total <= 0) {
          return;
        }
        state.tC = current;
        state.tT = total;
        state.tP = Math.max(0, Math.min(1, current / total));
        state.tR = total - current;
        let currentMinutes = Math.floor(current / 60),
          currentSeconds = Math.floor(current % 60),
          currentText = `${currentMinutes}:${currentSeconds < 10 ? "0" : ""}${currentSeconds}`,
          totalMinutes = Math.floor(total / 60),
          totalSeconds = Math.floor(total % 60),
          totalText = `${totalMinutes}:${totalSeconds < 10 ? "0" : ""}${totalSeconds}`,
          remainingMinutes = totalMinutes - currentMinutes,
          remainingSeconds = totalSeconds - currentSeconds;
        if (remainingSeconds < 0) {
          remainingMinutes--;
          remainingSeconds += 60;
        }
        let remainingText = `-${remainingMinutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
        state.t = state.readCfg.timeInfo == "CurrentRemaining" ? `${currentText} / ${remainingText}` : `${currentText} / ${totalText}`;
      } catch {}
    }

    /*歌词*/
    let lyrics = {
        M: {
          0: "暂无歌词",
          1: "",
          2: "",
          3: "",
          4: "",
        },
        T: {
          0: "",
          1: "",
          2: "",
          3: "",
          4: "",
        },
        currentT: 0,
        currentD: 0,
      },
      offset = state.readCfg.lyricsOffset * 1000;
    if (state.readCfg.lyricsFrom != "RNP") {
      document.removeEventListener("lyrics-updated", rnpLrcUpdate);
      state.isLrcRnpLsnAdded = false;
    }
    switch (state.readCfg.lyricsFrom) {
      case "RNP":
        getLrcRnp();
        break;
      case "OriginalLyricBar":
        getLrcOrg();
        break;
      case "LibLyric":
        getLrcLibLyric();
        break;
      case "Custom":
        getLrcCustom();
        break;
      default:
        showLrcErr("该词源设置项不存在");
    }
    function showLrcErr(e = "没有详细错误信息") {
      state.isJp = false;
      if (state.readCfg.showLyricsErrorTip) {
        (lyrics.M[0] = "暂无歌词"), (lyrics.T[0] = "");
        (lyrics.M[1] = `当前歌词源错误: ${state.readCfg.lyricsFrom}`), (lyrics.T[1] = e);
      }
      state.pLrc = {
        0: { time: 0, duration: Infinity, originalLyric: lyrics.M[0], translatedLyric: lyrics.T[0] },
        1: { time: Infinity, duration: 0, originalLyric: lyrics.M[1], translatedLyric: lyrics.T[1] },
      };
      state.pLrcKeys = Object.keys(state.pLrc);
    }
    function getLrcErr(e) {
      state.lrcNowLoading = false;
      console.error("PiPW Error: 获取歌词时出错，详情：", e);
      Object.prototype.toString.call(e) === "[object Object]"
        ? e.message === void 0
          ? (e = JSON.stringify(e))
          : (e = e.message)
        : "";
      showLrcErr(e);
    }
    function rnpLrcUpdate(e) {
      state.pLrc = JSON.parse(JSON.stringify(e.detail.lyrics));
      handleLyrics();
      console.log("PiPW Log: GotLyrics", state.pLrc);
    }
    function getLrcRnp() {
      if (!loadedPlugins.RefinedNowPlaying) {
        showLrcErr("依赖的插件未安装");
      }
      try {
        if (!state.isLrcRnpLsnAdded) {
          document.addEventListener("lyrics-updated", rnpLrcUpdate);
          state.isLrcRnpLsnAdded = true;
          rnpLrcUpdate({ detail: window.currentLyrics });
        }
        lrcUpdate();
      } catch (e) {
        console.error(`PiPW Error: 获取歌词时出错，详情：\n${e}`);
        showLrcErr(e);
      }
    }
    function getLrcOrg() {
      try {
        (lyrics.M[0] = q(".m-lyric .s-fc0").textContent), (lyrics.T[0] = q(".m-lyric .s-fc3").textContent);
      } catch {
        try {
          lyrics.M[0] = q(".m-lyric p").textContent;
        } catch {}
      }
    }
    async function getLrcLibLyric() {
      if (state.lrcNowLoading) {
        lyrics.M[0] = ldTxt;
        return;
      }
      if (!loadedPlugins.liblyric) {
        showLrcErr("依赖的插件未安装");
      }
      try {
        let ll = loadedPlugins.liblyric;
        if (state.nrLrc) {
          state.lrcNowLoading = true;
          state.nrLrc = false;
          state.lrcCache = await ll.getLyricData(data.track ? data.track.id : data.id);
          console.log("PiPW Log: Lyrics", state.lrcCache);
          state.pLrc = ll.parseLyric(
            state.lrcCache.lrc.lyric,
            state.lrcCache.tlyric ? (state.lrcCache.ytlrc ? state.lrcCache.ytlrc.lyric : state.lrcCache.tlyric.lyric) : "",
            state.lrcCache.romalrc ? (state.lrcCache.yromalrc ? state.lrcCache.yromalrc.lyric : state.lrcCache.romalrc.lyric) : "",
            state.lrcCache.yrc ? (state.lrcCache.yrc.lyric ? state.lrcCache.yrc.lyric : "") : "" //为什么lrcCache.yrc.lyric可以是null...
          );
          handleLyrics();
          console.log("PiPW Log: ParsedLyrics", state.pLrc);
          state.lrcNowLoading = false;
          renderDomWindow();
        }
        lrcUpdate();
      } catch (e) {
        getLrcErr(e);
      }
    }
    async function getLrcCustom() {
      if (state.lrcNowLoading) {
        lyrics.M[0] = ldTxt;
        return;
      }
      if (!loadedPlugins.liblyric) {
        showLrcErr("依赖的插件未安装");
      }
      try {
        let ll = loadedPlugins.liblyric;
        if (state.nrLrc) {
          state.lrcNowLoading = true;
          state.nrLrc = false;
          let songDetails = {
            track: data.name,
            trackId: data.track ? data.track.id : data.id,
            artist: data.artists[0].name,
            artists: state.song.artist,
            album: data.album.name,
            albumId: data.album.id,
          };
          let url = state.readCfg.lyricsCustomSources.replace(/\$\{(\w+)\}/g, (_, p1) => {
            return songDetails[p1];
          });
          fetch(url)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`${response.status} ${response.statusText}`);
              }
              return response.text();
            })
            .then((lrc) => {
              state.pLrc = ll.parseLyric("", "", "", lrc);
              handleLyrics();
              console.log("PiPW Log: ParsedLyrics", state.pLrc);
              state.lrcNowLoading = false;
              renderDomWindow();
            })
            .catch((e) => {
              getLrcErr(e);
            });
        }
        lrcUpdate();
      } catch (e) {
        getLrcErr(e);
      }
    }
    function handleLyrics() {
      if (state.pLrc.length == 0) {
        state.isJp = false;
      } else {
        state.pLrcKeys = Object.keys(state.pLrc);
        for (let i = 0; i < state.pLrcKeys.length; i++) {
          state.isJp = /[ぁ-ヿ]/g.test(state.pLrc[i].originalLyric);
          if (state.isJp == true) {
            break;
          }
        }
        for (let i = 0; i < state.pLrcKeys.length; i++) {
          let o = state.pLrc[i].originalLyric,
            t = state.pLrc[i].translatedLyric,
            d = JSON.stringify(state.pLrc[i].dynamicLyric);
          if (o == t) {
            state.pLrc[i].translatedLyric = "";
          } //优化歌词展示体验
          o = state.pLrc[i].originalLyric.replace(/\s+/g, " ").trim();
          if (o == "") {
            if (i + 1 == state.pLrcKeys.length) {
              delete state.pLrc[i];
              state.pLrcKeys = Object.keys(state.pLrc);
              continue;
            } else {
              (state.pLrc[i].originalLyric = "· · ·"), (state.pLrc[i].translatedLyric = "");
            }
          } else if (state.isJp && state.readCfg.lyricsHanzi2Kanji) {
            state.pLrc[i].originalLyric = cn2jp(o);
            try {
              d = cn2jp(d);
            } catch {}
          } else {
            state.pLrc[i].originalLyric = o;
          }
          try {
            state.pLrc[i].dynamicLyric = JSON.parse(d);
          } catch {}
        }
      }
    }
    function lrcUpdate() {
      //更新歌词数据
      if (state.pLrc.length == 0) {
        return;
      }
      let l = state.pLrcKeys.length,
        p = state.playProgress + offset;
      // 歌词按时间排序，当前行只会向后移动。
      // 缓存上次定位的行，避免每帧从头全量扫描（长歌词时开销明显）。
      let start = 0;
      const cache = state.lrcLineCache;
      if (cache.keys === state.pLrcKeys && cache.line >= 0) {
        const cl = state.pLrc[cache.line];
        if (p >= cl.time && p < cl.time + cl.duration) {
          start = cache.line; // 仍在缓存行内，直接复用
        } else if (p >= cl.time + cl.duration) {
          start = cache.line + 1; // 向后继续找
        } else {
          start = 0; // 回退（如 seek 到前面）
        }
      } else {
        cache.keys = state.pLrcKeys;
      }
      for (let i = start; i < l; i++) {
        let d = state.pLrc[i].duration;
        if (p < state.pLrc[i].time + d || i == l - 1) {
          cache.line = i;
          if (state.pLrc[i].dynamicLyric && state.readCfg.dynamicLyrics) {
            //第1行主歌词
            lyrics.M[0] = state.pLrc[i].dynamicLyric;
            lyrics.currentT = state.pLrc[i].dynamicLyricTime;
          } else {
            lyrics.M[0] = state.pLrc[i].originalLyric;
            lyrics.currentT = state.pLrc[i].time;
          }
          lyrics.currentD = d == 0 ? data.duration - state.pLrc[i].time : d;
          for (let j = 1; j < 5; j++) {
            lyrics.M[j] = i + j < l ? state.pLrc[i + j].originalLyric : "";
          } //2~5行主歌词
          //1~5行翻译/拉丁化歌词
          switch (state.readCfg.lyricLine2Show) {
            case "none":
              for (let i = 0; i < 5; i++) {
                lyrics[`T${i}`] = "";
              }
              break;
            case "auto":
              trans();
              latin(false);
              break;
            case "translation":
              trans();
              break;
            case "latinization":
              latin();
              break;
            default:
              trans();
              latin(false);
          }
          break;
          function trans() {
            for (let j = 0; j < 5; j++) {
              lyrics.T[j] = i + j < l ? (state.pLrc[i + j].translatedLyric ? state.pLrc[i + j].translatedLyric : "") : "";
            }
          }
          function latin(b = true) {
            for (let j = 0; j < 5; j++) {
              if (lyrics.T[j] == "" || b) {
                lyrics.T[j] = i + j < l ? (state.pLrc[i + j].romanLyric ? state.pLrc[i + j].romanLyric : "") : "";
              }
            }
          }
        }
      }
    }

    state.domView.coverUrl = state.cvUrl || state.OcvUrl || "";
    state.domView.title = state.song.name;
    // 显示顺序互换：第二行（原专辑名位）显示歌手，第三行（原歌手位）显示专辑名。
    // 仅交换文字，两个槽位的字号/行高等样式保持不变。
    state.domView.subtitle = state.song.artist;
    state.domView.artist = state.song.nameAnother;
    state.domView.time = state.t;
    state.domView.progress = state.tP;
    state.domView.duration = state.tT;
    state.domView.isPlaying = !!pS?.state;
    dlog(
      `loadPiP 覆盖domView`,
      `from=${from}`,
      `playProgress=${(state.playProgress / 1000).toFixed(2)}s`,
      `canvas行=${state.lrcLineCache.line}`,
      `dom行=${state.domView.lyricIndex}`
    );
    state.domView.lines = Array.from({ length: 5 }, (_, i) => ({ main: lyrics.M[i] || "", translation: lyrics.T[i] || "" }));
    state.domView.dynamicWords = Array.isArray(lyrics.M[0]) ? lyrics.M[0] : null;
    state.domView.dynamicTime = lyrics.currentT;
    state.domView.dynamicDuration = lyrics.currentD;
    state.domViewRevision++;

    /*取色环节*/
    // 注：此处的 colorPick 已移除——切歌瞬间 state.cover 尚为上一首封面，
    // 过早取色只会把旧封面色写进 state.color。取色一律交由新封面 onload 后进行。
    // 这里仅作颜色变化的探测（供下游决定是否重绘头部），并将当前色登记为基线。
    if (
      state.color.text &&
      (state.color.text != state.colorCache.text || state.color.bg != state.colorCache.bg)
    ) {
      nrHead = true;
      (state.colorCache.text = state.color.text), (state.colorCache.bg = state.color.bg);
    }
    // 取色之后再回填 domView，确保背景/文字/accent 使用的是本轮最新颜色，
    // 而不是上一帧遗留的旧色（此前这三行位于 colorPicker 之前，总落后一拍）。
    state.domView.background = state.color.bg;
    state.domView.textColor = state.color.text;
    state.domView.accent = state.color.accent;

    /*创建canvas*/
    loadC();
    function loadC() {
      let [w, h] = state.readCfg.aspectRatio.split(":").map(Number),
        rw = Math.round(r * (w / h)); //因为width不能设为小数
      if (!state.c || !state.cC) {
        state.c = cE("canvas");
        state.cC = state.c.getContext("2d", { alpha: false }); //alpha:false可有效解决内存溢出问题
        console.log("PiPW Log: canvas元素已创建", state.c, state.cC);
      }
      if (!state.bgc || !state.bgcC) {
        state.bgc = cE("canvas");
        state.bgcC = state.bgc.getContext("2d", { alpha: false });
        console.log("PiPW Log: 背景canvas元素已创建", state.bgc, state.bgcC);
      }
      if (state.c.width != rw || state.c.height != r) {
        state.c.width = rw;
        state.c.height = r;
        nrHead = true;
        state.bgc.width = rw;
        state.bgc.height = r;
      }
    }

    /*字体*/
    let f = state.readCfg.customFonts,
      fM = f,
      fT = f; //这里f后期也许单独做一个界面字体
    let gFW = state.readCfg.generalFontWeight,
      oLFW = state.readCfg.originalLyricsFontWeight,
      tLFW = state.readCfg.translatedLyricsFontWeight;

    /*日文字体更换*/
    state.readCfg.useJapaneseFonts && state.isJp ? (fM = state.readCfg.customJapaneseFonts) : "";

    if (from == "Settings") {
      getInfo();
      nrHead = true;
    } //如果是改字体/显示的信息或者颜色有变……

    nrHead ? reloadHead() : "";
    function reloadHead() {
      if (!state.cvUrl) {
        state.cover.src = DcvUrl;
        state.readCfg.showDiscWhenNoCover ? "" : (cvSizeX = r / 96);
      } else {
        // 同址保护：若目标 URL 与当前封面相同，浏览器不会再派发 onload，
        // 导致 bgc（含其上方的半透明遮罩层）沿用旧封面不被重画。
        // 这里先将 src 置空打断当前加载，再赋回以强制触发一次全新 onload。
        if (state.cover.src === state.cvUrl) {
          state.cover.src = "";
        }
        state.cover.src = state.cvUrl;
      }
      state.cvUrlCache = state.cvUrl;
      nrInfo = true;
    }

    let o1 = r / 480,
      o2 = r / 240,
      o3 = r / 160,
      o5 = r / 96,
      o6 = r / 80,
      o9 = r / 53.3333,
      o10 = r / 48,
      o12 = r / 40,
      o15 = r / 32,
      o20 = r / 24,
      o21p5 = r / 22.3256,
      o25 = r / 19.2,
      o30 = r / 16,
      o30p5 = r / 15.7377,
      o35 = r / 13.7143,
      o40 = r / 12,
      o45 = r / 10.6667,
      o55 = r / 8.7272,
      o60 = r / 8,
      o105 = r / 4.57143,
      o150 = r / 3.2,
      o480 = r,
      txtMgL = cvSizeX + o10,
      x = 0,
      y = 0;
    state.cC.textAlign = "left";

    y = cvSizeY + o3;
    state.cC.clearRect(0, y, state.c.width, state.c.height);

    let lrcFS = o55,
      lrcMgT = o45,
      lrcMgL = o15,
      mLrcMgL = lrcMgL,
      lrcTop = cvSizeY + lrcMgT,
      lrcSSS = state.readCfg.lyricsTaperOff;
    let lrcLine = {
      0: lrcTop + lrcFS,
      1: lrcTop + lrcFS * 2 + o10,
      2: lrcTop + lrcFS * 3 + o12,
      3: lrcTop + lrcFS * 4 + o10,
      4: lrcTop + lrcFS * 5 + o2,
    };
    function lyricStyle(line = 0, isT = false, isU /*Unplayed*/ = false) {
      if (!isT) {
        switch (line) {
          case 0:
            if (!isU) {
              (state.cC.fillStyle = state.color.text), (state.cC.font = `${oLFW} ${lrcFS}px ${fM}`), (lrcMgL = o15);
            } else {
              (state.cC.fillStyle = state.color.textT42), (state.cC.font = `${oLFW} ${lrcFS}px ${fM}`), (lrcMgL = o15);
            }
            return;
          case 1:
            (state.cC.fillStyle = state.color.textT56), (state.cC.font = `${oLFW} ${lrcFS - o10}px ${fM}`), lrcSSS ? (lrcMgL = o12) : "";
            return;
          case 2:
            (state.cC.fillStyle = state.color.textT56),
              (state.cC.font = `${oLFW} ${lrcSSS ? lrcFS - o15 : lrcFS - o10}px ${fM}`),
              lrcSSS ? (lrcMgL = o9) : "";
            return;
          case 3:
            (state.cC.fillStyle = state.color.textT56),
              (state.cC.font = `${oLFW} ${lrcSSS ? lrcFS - o20 : lrcFS - o10}px ${fM}`),
              lrcSSS ? (lrcMgL = o6) : "";
            return;
          case 4:
          default:
            (state.cC.fillStyle = state.color.textT56),
              (state.cC.font = `${oLFW} ${lrcSSS ? lrcFS - o25 : lrcFS - o10}px ${fM}`),
              lrcSSS ? (lrcMgL = o3) : "";
            return;
        }
      } else {
        switch (line) {
          case 0:
            (state.cC.fillStyle = state.color.textT56), (state.cC.font = `${tLFW} ${lrcFS - o5}px ${fT}`), (lrcMgL = o15);
            return;
          case 1:
            (state.cC.fillStyle = state.color.textT31),
              (state.cC.font = `${tLFW} ${lrcFS - o15}px ${fT}`),
              lrcSSS ? (lrcMgL = o12) : "";
            return;
          case 2:
            (state.cC.fillStyle = state.color.textT31),
              (state.cC.font = `${tLFW} ${lrcSSS ? lrcFS - o20 : lrcFS - o15}px ${fT}`),
              lrcSSS ? (lrcMgL = o9) : "";
            return;
          case 3:
          default:
            (state.cC.fillStyle = state.color.textT31),
              (state.cC.font = `${tLFW} ${lrcSSS ? lrcFS - o25 : lrcFS - o15}px ${fT}`),
              lrcSSS ? (lrcMgL = o6) : "";
            return;
        }
      }
    }
    function updateMLrcMgL(w, now) {
      if (!state.readCfg.autoScroll) {
        return;
      }
      if (!now) {
        now = (state.playProgress + offset - lyrics.currentT) / lyrics.currentD;
        now = lyrics.currentT > state.playProgress + offset ? 0 : now > 1 ? 1 : now;
      }
      let l = w * now;
      if (w > state.c.width - lrcMgL && l + o150 > state.c.width - lrcMgL) {
        mLrcMgL = 0 - (l + lrcMgL - state.c.width) + lrcMgL - o150;
      }
    }

    state.isDynamicLyrics = false;
    if (Array.isArray(lyrics.M[0])) {
      state.isDynamicLyrics = true;
      let lyricDO = "" /*lyricDynamicOrigin*/,
        l = lyrics.M[0].length,
        now = 0,
        nowWidth = 0;
      lyricDO = lyrics.M[0].map((item) => item.word).join("");
      lyricStyle(0, false, true);
      // 逐字歌词：词本身不随帧变化，仅进度变化。
      // 缓存每词宽度与整行宽度，避免每帧重复 measureText（这是逐字歌词卡顿的主因）。
      let dynamicFont = `${oLFW} ${lrcFS}px ${fM}`,
        dynamicKey = `${lyricDO}|${dynamicFont}|${state.color.textT42}|${state.color.text}`;
      if (state.dynLrcCache.key !== dynamicKey) {
        state.dynLrcCache.key = dynamicKey;
        state.dynLrcCache.wordWidths = new Array(l);
        state.dynLrcCache.cumulativeWidths = new Array(l + 1);
        state.dynLrcCache.cumulativeWidths[0] = 0;
        let total = 0;
        for (let i = 0; i < l; i++) {
          const w = state.cC.measureText(lyrics.M[0][i].word).width;
          state.dynLrcCache.wordWidths[i] = w;
          total += w;
          state.dynLrcCache.cumulativeWidths[i + 1] = total;
        }
        state.dynLrcCache.totalWidth = total;
        let canvasWidth = Math.ceil(total + o30),
          canvasHeight = Math.ceil(lrcFS * 1.5);
        state.dynLrcCanvas = cE("canvas");
        state.dynLrcCanvas.width = canvasWidth;
        state.dynLrcCanvas.height = canvasHeight;
        state.dynLrcPlayedCanvas = cE("canvas");
        state.dynLrcPlayedCanvas.width = canvasWidth;
        state.dynLrcPlayedCanvas.height = canvasHeight;
        let dynamicContext = state.dynLrcCanvas.getContext("2d"),
          playedContext = state.dynLrcPlayedCanvas.getContext("2d");
        dynamicContext.font = dynamicFont;
        dynamicContext.fillStyle = state.color.textT42;
        dynamicContext.textBaseline = "alphabetic";
        dynamicContext.fillText(lyricDO, 0, lrcFS);
        playedContext.font = dynamicFont;
        playedContext.fillStyle = state.color.text;
        playedContext.textBaseline = "alphabetic";
        playedContext.fillText(lyricDO, 0, lrcFS);
      }
      let currentTime = state.playProgress + offset,
        left = 0,
        right = l;
      while (left < right) {
        let middle = Math.floor((left + right) / 2),
          word = lyrics.M[0][middle];
        if (currentTime < word.time + word.duration) {
          right = middle;
        } else {
          left = middle + 1;
        }
      }
      if (left > 0) {
        nowWidth = state.dynLrcCache.cumulativeWidths[left];
      }
      if (left < l) {
        let word = lyrics.M[0][left],
          Cnow = (currentTime - word.time) / word.duration;
        Cnow = word.time > currentTime ? 0 : Cnow > 1 ? 1 : Cnow;
        nowWidth += state.dynLrcCache.wordWidths[left] * Cnow;
      }
      let w = state.dynLrcCache.totalWidth;
      now = w ? nowWidth / w : 0;
      updateMLrcMgL(w, now);
      state.cC.drawImage(state.dynLrcCanvas, mLrcMgL, lrcLine[0] - lrcFS); /*主歌词(未播放)*/
      state.cC.save();
      state.cC.beginPath();
      state.cC.rect(0, 0, w * now + mLrcMgL, state.c.height);
      state.cC.clip();
      state.cC.drawImage(state.dynLrcPlayedCanvas, mLrcMgL, lrcLine[0] - lrcFS); /*主歌词(已播放)*/
      state.cC.restore();
    } else if (state.readCfg.lyricsFrom != "OriginalLyricBar") {
      lyricStyle();
      updateMLrcMgL(state.cC.measureText(lyrics.M[0]).width);
      state.cC.fillText(lyrics.M[0], mLrcMgL, lrcLine[0]); /*主歌词*/
    } else {
      lyricStyle();
      state.cC.fillText(lyrics.M[0], lrcMgL, lrcLine[0]); /*主歌词*/
    }

    if (lyrics.T[0] != "") {
      lyricStyle(0, true);
      if (state.readCfg.lyricsFrom != "OriginalLyricBar") {
        mLrcMgL = lrcMgL;
        updateMLrcMgL(state.cC.measureText(lyrics.T[0]).width);
      }
      state.cC.fillText(lyrics.T[0], mLrcMgL, lrcLine[1] - o10); /*歌词翻译*/
      lyricStyle(1);
      state.cC.fillText(lyrics.M[1], lrcMgL, lrcLine[2]); /*下1句主歌词*/
      if (lyrics.T[1] != "") {
        lyricStyle(1, true);
        state.cC.fillText(lyrics.T[1], lrcMgL, lrcLine[3] - o10); /*下1句歌词翻译*/
        lyricStyle(2);
        state.cC.fillText(lyrics.M[2], lrcMgL, lrcLine[4]); /*下2句主歌词*/
      } else {
        lyricStyle(2);
        state.cC.fillText(lyrics.M[2], lrcMgL, lrcLine[3]); /*下2句主歌词*/
        if (lyrics.T[2] != "") {
          lyricStyle(2, true);
          state.cC.fillText(lyrics.T[2], lrcMgL, lrcLine[4] - o10); /*下2句歌词翻译*/
        } else {
          lyricStyle(3);
          state.cC.fillText(lyrics.M[3], lrcMgL, lrcLine[4]); /*下3句主歌词*/
        }
      }
    } else {
      lyricStyle(1);
      state.cC.fillText(lyrics.M[1], lrcMgL, lrcLine[1]); /*下1句主歌词*/
      if (lyrics.T[1] != "") {
        lyricStyle(1, true);
        state.cC.fillText(lyrics.T[1], lrcMgL, lrcLine[2] - o10); /*下1句歌词翻译*/
        lyricStyle(2);
        state.cC.fillText(lyrics.M[2], lrcMgL, lrcLine[3]); /*下2句主歌词*/
        if (lyrics.T[2] != "") {
          lyricStyle(2, true);
          state.cC.fillText(lyrics.T[2], lrcMgL, lrcLine[4] - o10); /*下2句歌词翻译*/
        } else {
          lyricStyle(3);
          state.cC.fillText(lyrics.M[3], lrcMgL, lrcLine[4]); /*下3句主歌词*/
        }
      } else {
        lyricStyle(2);
        state.cC.fillText(lyrics.M[2], lrcMgL, lrcLine[2]); /*下2句主歌词*/
        if (lyrics.T[2] != "") {
          lyricStyle(2, true);
          state.cC.fillText(lyrics.T[2], lrcMgL, lrcLine[3] - o10); /*下2句歌词翻译*/
          lyricStyle(3);
          state.cC.fillText(lyrics.M[3], lrcMgL, lrcLine[4]); /*下3句主歌词*/
        } else {
          lyricStyle(3);
          state.cC.fillText(lyrics.M[3], lrcMgL, lrcLine[3]); /*下3句主歌词*/
          if (lyrics.T[3] != "") {
            lyricStyle(3, true);
            state.cC.fillText(lyrics.T[3], lrcMgL, lrcLine[4] - o10); /*下3句歌词翻译*/
          } else {
            lyricStyle(4);
            state.cC.fillText(lyrics.M[4], lrcMgL, lrcLine[4]); /*下4句主歌词*/
          }
        }
      }
    }

    if (state.readCfg.lyricsMask) {
      let lrcMask = state.cC.createLinearGradient(0, lrcTop, 0, state.c.height * 1.3);
      lrcMask.addColorStop(0.1, state.color.bgT00); //不能用#0000或者#FFF0等，会影响渐变的渲染效果
      lrcMask.addColorStop(1, state.color.bg);
      state.cC.fillStyle = lrcMask;
      state.cC.fillRect(0, lrcTop, state.c.width, state.c.height); /*歌词阴影遮罩*/
    }

    state.cC.font = `${gFW} ${o30}px ${f}`;
    state.cC.fillStyle = state.color.textT56;
    let tW = state.cC.measureText(state.t).width;
    state.cC.fillText(state.t, o15, cvSizeY + o35); /*时间*/

    let pbMgT = cvSizeY + o21p5,
      pbMgL = tW + o30p5;
    state.cC.fillStyle = state.color.textT13;
    state.cC.fillRect(pbMgL, pbMgT, state.c.width - pbMgL, o5); /*进度条背景*/
    state.cC.fillStyle = state.color.accent;
    state.cC.fillRect(pbMgL, pbMgT, (state.c.width - pbMgL) * state.tP, o5); /*进度条*/

    /*背景*/
    if (state.readCfg.backgroundFrom == "AMLL" && loadedPlugins["Apple-Musiclike-lyrics"]) {
      let amllbgc = q(".amll-background-render-wrapper canvas");
      if (amllbgc) {
        if (!state.amllbgv) {
          state.amllbgv = cE("video");
          state.amllbgv.srcObject = amllbgc.captureStream();
          state.amllbgv.controls = true; //调试用
          state.amllbgv.muted = true;
          state.amllbgv.playsInline = true;
          state.amllbgv.play();
        }
        state.bgcC.drawImage(state.amllbgv, 0, y, state.bgc.width, state.bgc.height - y, 0, y, state.bgc.width, state.bgc.height - y);
      } else {
        let amllbgE = q("#amll-view > :first-child:not(.lyric-player-horizonal)"),
          amllbg;
        amllbgE ? "" : (amllbgE = q("#amll-view"));
        amllbgE ? (amllbg = getComputedStyle(amllbgE).getPropertyValue("background-color")) : (amllbg = state.color.bg);
        state.bgcC.fillStyle = amllbg;
        state.bgcC.fillRect(0, y, state.bgc.width, state.bgc.height - y);
      }
      drawInfo();
      drawRC();
    } else {
      try {
        state.amllbgv.pause();
      } catch {}
    }
    if (state.readCfg.backgroundFrom == "themeBackgroundColor") {
      state.bgcC.filter = "none";
      state.bgcC.fillStyle = state.color.bg;
      state.bgcC.fillRect(0, y, state.bgc.width, state.bgc.height - y);
    }
    state.cC.globalCompositeOperation = "destination-over";
    y = cvSizeY + o3;
    state.cC.drawImage(state.bgc, 0, y, state.bgc.width, state.bgc.height - y, 0, y, state.c.width, state.c.height - y);
    state.cC.globalCompositeOperation = "source-over";

    function drawRC() {
      state.cC.globalCompositeOperation = "destination-out";
      state.cC.beginPath();
      state.cC.strokeStyle = "#000";
      state.cC.lineWidth = o5;
      x = cvSizeX + o2;
      y = cvSizeY + o2;
      /*封面圆角*/
      state.cC.moveTo(x, 0);
      state.cC.arcTo(x, y, 0, y, o12);
      state.cC.lineTo(0, y);
      state.cC.lineTo(x, y);
      state.cC.lineTo(x, 0);
      state.cC.stroke();
      state.cC.globalCompositeOperation = "destination-over";
      state.cC.drawImage(state.bgc, 0, 0, x + o3, y + o3, 0, 0, x + o3, y + o3);
      state.cC.globalCompositeOperation = "source-over";
    }
    function drawInfo() {
      /*if (readCfg.showIconBarBeforeInfo) {...}*/
      state.cC.drawImage(state.bgc, cvSizeX, 0, state.c.width, cvSizeY + o5, cvSizeX, 0, state.c.width, cvSizeY + o5); /*清除*/
      state.cC.fillStyle = state.color.text;
      state.cC.font = `${gFW} ${o55}px ${f}`;
      state.cC.fillText(state.song.name, txtMgL, o60); /*主名*/
      state.cC.fillStyle = state.color.textT31;
      state.cC.font = `${gFW} ${o35}px ${f}`;
      state.cC.fillText(state.song.nameAnother, txtMgL, o105); /*副名*/
      state.cC.fillStyle = state.color.textT56;
      state.cC.fillText(state.song.artist, txtMgL, state.song.nameAnother == "" ? o105 : o150); /*歌手*/
    }
    if (nrInfo) {
      state.cC.fillStyle = state.color.text;
      state.cC.font = `${gFW} ${o25}px ${f}`;
      state.cC.fillText(ldTxt, o5, o30); /*封面(加载)*/
      state.cover.onload = () => {
        /*封面(完毕)*/
        let isCoverEmpty = !state.cvUrl || state.cover.src == DcvUrl;
        isCoverEmpty ? (cvSizeX = o5) : void 0;
        if (!isCoverEmpty && state.readCfg.allowNonsquareCover) {
          cvSizeX = state.cover.width * (cvSizeY / state.cover.height);
        }
        txtMgL = cvSizeX + o10;
        state.readCfg.colorFrom == "albumCover" ? colorPick(state.cover ? state.cover : null) : colorPick();
        // 新封面取色完毕后，把最新颜色登记为基线，便于颜色变化在下游被识别。
        (state.colorCache.text = state.color.text), (state.colorCache.bg = state.color.bg);
        // DOM 窗口专用：取色后立即把新色灌进 domView 并提升修订号，
        // 让 renderDomWindow 的下一次 tick 即刻消费新底色，不再依赖 loadPiPImpl 的频率。
        // 不带 domWindow 判定：即使 DOM 窗口尚未创建，也先行更新共享的 domView，
        // 这样窗口晚些弹出时能立刻读到最新底色（解决启动初期纯色底为中性的问题）。
        state.domView.background = state.color.bg;
        state.domView.textColor = state.color.text;
        state.domView.accent = state.color.accent;
        state.domViewRevision++;
        /*背景图*/
        if (state.readCfg.backgroundFrom == "albumCoverBlur") {
          state.bgcC.fillStyle = state.color.bg;
          state.bgcC.fillRect(0, 0, state.bgc.width, state.bgc.height);
          state.bgcC.filter = `blur(${o60}px)`;
          state.bgcC.drawImage(state.cover, 0, 0, state.bgc.width, state.bgc.height);
          state.bgcC.filter = "none";
          state.bgcC.fillStyle = state.color.bgT50;
          state.bgcC.fillRect(0, 0, state.bgc.width, state.bgc.height);
        }
        state.cC.fillStyle = state.color.bg;
        state.cC.drawImage(state.bgc, 0, 0, cvSizeX, cvSizeY + o5, 0, 0, cvSizeX, cvSizeY + o5);
        drawInfo();
        if (!isCoverEmpty) {
          state.cC.drawImage(state.cover, 0, 0, cvSizeX, cvSizeY);
          drawRC();
          if (state.showRefreshing) {
            console.log(`PiPW Log: 歌曲封面绘制完成`);
          }
        } else if (state.readCfg.showDiscWhenNoCover) {
          let disc = new Image();
          disc.src = discUrl;
          disc.onload = () => {
            state.cC.drawImage(disc, 0, 0, cvSizeX, cvSizeY);
            drawRC();
            if (state.showRefreshing) {
              console.log(`PiPW Log: 唱片绘制完成`);
            }
            disc = null; //处理
          };
        }
        if (!domOnly) {
          loadPiP(); //解决首次打开黑窗问题(及其他小问题)的关键
        }
      };
      state.cover.onerror = () => {
        /*封面(失败)*/
        state.cover.src = state.OcvUrl ? state.OcvUrl : DcvUrl;
        if (!domOnly) {
          loadPiP();
        }
      };
    }

    if (isToPiP && !PiPE) {
      state.c.toPiP();
      nrHead = true;
    }
  } catch (e) {
    console.error("PiPW Error: <canvas>绘制出错，详情：\n", e);
    tipMsg("&lt;canvas&gt;绘制出错，详见JavaScript控制台", "err");
  }
}
