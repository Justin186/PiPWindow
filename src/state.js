/*This plugin is licensed under the GNU/GPL-3.0
**Copyright (C) 2024-2025 Lukoning
*/

/**
 * 集中管理所有共享的可变状态。
 * 原 main.js 中大量全局变量被集中到 state 对象中，
 * 各功能模块通过 `import { state } from './state.js'` 访问。
 */

// ---- 常量（不可变）----
export const pdd =
  "M21 3C21.5523 3 22 3.44772 22 4V11H20V5H4V19H10V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM21 13C21.5523 13 22 13.4477 22 14V20C22 20.5523 21.5523 21 21 21H13C12.4477 21 12 20.5523 12 20V14C12 13.4477 12.4477 13 13 13H21Z";
export const pO = `<path d="${pdd}M20 15H14V19H20V15ZM6.70711 6.29289L8.95689 8.54289L11 6.5V12H5.5L7.54289 9.95689L5.29289 7.70711L6.70711 6.29289Z"></path>`;
export const pC = `<path d="${pdd}"></path>`;

export const cfgDefault = {
  whenClose: "none",
  whenBack: "back",
  whenCloseOrBack_paused: "close",
  autoHideMainWindow: false,
  showTaskbarButton: false,
  useCloudDataForLocalFile: false,
  showDiscWhenNoCover: false,
  allowNonsquareCover: false,
  trackInfoShow: "album",
  timeInfo: "CurrentTotal",
  lyricLine2Show: "auto",
  dynamicLyrics: true,
  autoScroll: true,
  lyricsTaperOff: true,
  lyricsMask: false,
  lyricsHanzi2Kanji: true,
  lyricsOffset: 0,
  lyricsFrom: "LibLyric",
  lyricsCustomSources:
    "https://example.com/lyric?track=${track}&id=${trackId}&art=${artist}&arts=${artists}&album=${album}&albumId=${albumId}",
  showLyricsErrorTip: true,
  colorFrom: "albumCover",
  colorCustom_accent: "#FFFFFF",
  colorCustom_text: "#FFFFFF",
  colorCustom_bg: "#424242",
  backgroundFrom: "albumCoverBlur",
  generalFontWeight: 400,
  originalLyricsFontWeight: 700,
  translatedLyricsFontWeight: 400,
  customFonts: '"Segoe UI", "Microsoft Yahei UI", system-ui',
  useJapaneseFonts: true,
  customJapaneseFonts: '"Yu Gothic UI", "Meiryo UI", "Microsoft Yahei UI", system-ui',
  smoothProgessBar: true,
  resolutionRatio: "auto",
  aspectRatio: "2:1",
  albumCoverSize: 160,
  useFullCover: false,
  customLoadingTxt: "正在载入猫猫…",
};

export const DcvUrl = "orpheus://orpheus/style/res/common/discovery/calendar_bg.png";
export const discUrl = "orpheus://orpheus/style/res/default/default_play_disc.png";

// ---- 共享可变状态 ----
export const state = {
  // 分辨率
  rvN: undefined,
  // video 元素（PiP 源）
  v: undefined,
  // AMLL 背景视频
  amllbgv: undefined,
  // toggle 按钮
  b: undefined,
  // configPage（设置页容器）
  cP: undefined,
  // 主 canvas
  c: undefined,
  // 背景 canvas
  bgc: undefined,
  // 取色 canvas
  cpc: undefined,
  // 各 canvas 的 context
  cC: undefined,
  bgcC: undefined,
  cpcC: undefined,
  // 封面 Image
  cover: undefined,
  // 封面 URL 相关
  OcvUrl: undefined,
  cvUrl: undefined,
  cvUrlCache: undefined,
  OcvUrlCache: undefined,
  songDataCache: undefined,
  // 提示消息定时器
  tMsT: undefined,
  // 歌词缓存
  lrcCache: undefined,
  pLrc: undefined,
  pLrcKeys: undefined,
  // 逐字歌词宽度缓存（词不随帧变化，仅进度变化，避免每帧重复 measureText）
  dynLrcCache: { key: "", wordWidths: [], cumulativeWidths: [], totalWidth: 0 },
  dynLrcCanvas: undefined,
  dynLrcPlayedCanvas: undefined,
  // 当前歌词行缓存（避免每帧全量扫描定位当前行）
  lrcLineCache: { line: -1, key: "" },
  // 刷新跟踪
  showRefreshing: undefined,
  // PiP 窗口对象
  thePiPWindow: undefined,
  domWindow: undefined,
  domView: {
    coverUrl: "",
    title: "没有曲目",
    subtitle: "",
    artist: "未知艺术家",
    time: "0:00 / 0:00",
    progress: 0,
    duration: 0,
    lines: [],
    dynamicWords: null,
    dynamicTime: 0,
    dynamicDuration: 0,
    isPlaying: false,
    background: "#202124",
    textColor: "#ffffff",
    accent: "#70d6ff",
    lyricKey: "",
    lyricIndex: -1,
  },
  domLyricAnimation: undefined,
  domRenderedLyricIndex: -1,
  domLyricWindowHeight: undefined,
  domViewRevision: 0,
  domRenderedRevision: -1,
  // DOM 窗口上次实际应用的底色/前景色（幂等写入用，避免重复写 style）
  domAppliedBg: undefined,
  domAppliedText: undefined,

  // ---- 布尔标志 ----
  DontPlay: false,
  DontPause: false,
  autoRatio: undefined,
  autoRatioValue: 480,
  lastReRatio: 0,
  songIdCache: 0,
  playProgress: 0,
  playProgressTimestamp: 0,
  nrLrc: false,
  lrcNowLoading: false,
  reRatioPending: false,
  redrawInProgress: false,
  redrawPending: false,
  videoFrameLoopStarted: false,
  videoFrameLoopToken: 0,
  captureTrack: undefined,
  fpsWindowStart: 0,
  fpsRequestCount: 0,
  fpsRenderCount: 0,
  isDynamicLyrics: false,
  isJp: false,
  debugMode: false,
  isVLsnAdded: false,
  isLrcRnpLsnAdded: false,

  // ---- 歌词调试（window.PiPWDebugLyric() 开启后生效）----
  debugLyric: false,
  dbgLastStatAt: 0,
  dbgRenderCount: 0,
  dbgRenderSources: {},
  dbgLastCurrentProgress: 0,
  dbgLastPlayProgressAt: 0,
  dbgPlayProgressHeartbeatAt: 0,

  // ---- 时间显示 ----
  t: "0:00 / 0:00",
  tC: 0,
  tT: 0,
  tP: 0,
  tR: 0,

  // ---- 配置 ----
  readCfg: { ...cfgDefault },
  oldCfg: { ...cfgDefault },

  // ---- 颜色 ----
  color: { accent: "", text: "", textT13: "", textT31: "", textT42: "", textT56: "", bg: "", bgT00: "", bgT50: "" },
  colorS: { accent: "", text: "", bg: "", bgT: "" },
  colorCache: { text: "", bg: "" },

  // ---- 歌曲信息 ----
  song: { name: "", nameAnother: "", artist: "" },
};

// 从 localStorage 读取配置并合并默认值
try {
  const saved = JSON.parse(localStorage.getItem("PiPWindowSettings"));
  state.readCfg = { ...cfgDefault, ...saved };
} catch {
  state.readCfg = { ...cfgDefault };
}
state.oldCfg = { ...state.readCfg };
