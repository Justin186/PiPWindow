/*This plugin is licensed under the GNU/GPL-3.0
**Copyright (C) 2024-2025 Lukoning
*/

import { state, cfgDefault } from "./state.js";
import { q, qAll, cE, DEBUG, tipMsg, reRatio } from "./utils.js";
import { colorPick } from "./color.js";
import { saveCfg, resetCfg } from "./config.js";

/**
 * 设置页面：生成 BetterNCM 插件设置页的 HTML 并绑定事件。
 */
export function getSettingsPage() {
  colorPick();
  if (!state.cP) {
    state.cP = cE("div");
  }
  state.cP.setAttribute("id", "PiPWSettings");
  state.cP.innerHTML = `
<style id="PiPWSettingsStyle0">
    #PiPWSettings {
        --pipws-fg: ${state.colorS.accent};
        --pipws-bg: ${state.colorS.bgT};
        --pipws-bg-wot: ${state.colorS.bg};
        color: ${state.colorS.text};
    }
</style>
<style>
    #PiPWSettings {
        padding-top: 10px;
        line-height: 24px;
        font-size: 16px;
    }
    #PiPWSettings .noAutoBr p {
        display: inline;
    }
    #PiPWSettings .switch, #PiPWSettings .switch + p, #PiPWSettings .radio, #PiPWSettings .radio + p {
        line-height: 34px;
    }
    #PiPWSettings ::selection {
        color: var(--pipws-bg-wot);
        background: var(--pipws-fg);
    }
    #PiPWSettings :disabled, #PiPWSettings :disabled + .slider {
        cursor: not-allowed;
    }
    #PiPWSettings :disabled::selection {
        color: #000000;
        background: #888;
    }

    #PiPWSettings .part {
        width: 550px;
        margin: 20px 0 0;
        padding: 10px 20px;
        border: 1px solid #0000;
        border-radius: 12px;
        box-shadow: 0 0 25px -5px #0003;
        background: var(--pipws-bg) padding-box;
        backdrop-filter: blur(24px);
        transition: .5s;
    }
    #PiPWSettings .parting {
        height: 1px;
        margin: 10px 0;
        border: solid var(--pipws-fg);
        border-width: 1px 0 0 0;
        box-shadow: 0 0 3px var(--pipws-fg);
    }
    #PiPWSettings .partTitle {
        font-size: 23px;
        font-weight: bold;
        line-height: 30px;
    }
    #PiPWSettings .subPart {
        margin: 5px;
    }
    #PiPWSettings .subTitle {
        width: fit-content;
        padding: 2px;
        margin: 6px 0 4px;
        font-size: 20px;
        font-weight: bold;
        box-shadow: inset 0 -9px 3px -6px var(--pipws-fg);
    }
    #PiPWSettings .item {
        display: inline-table;
        margin-right: 5px;
    }
    #PiPWSettings .tipText {
        line-height: 12px;
        font-size: 12px;
    }

    #PiPWSettings .button {
        color: var(--md-accent-color-secondary, var(--ncm-text)) !important;
        font-size: 16px;
        width: 90px;
        height: 40px;
        box-shadow: 0 0 3px var(--pipws-fg);
        border: 1px solid var(--pipws-fg);
        border-radius: 10px;
        background: var(--pipws-bg);
        backdrop-filter: blur(12px);
        transition: .1s;
    }
    #PiPWSettings input.button {
        line-height: 0;
        outline: 0;
    }
    #PiPWSettings div.button {
        line-height: 38px;
        text-align: center;
    }
    #PiPWSettings .button:hover {
        box-shadow: 0 0 6px var(--pipws-fg);
    }
    #PiPWSettings .button:active {
        font-size: 14px;
        border-width: 4px;
        box-shadow: 0 0 8px var(--pipws-fg);
    }
    #PiPWSettings div.button:active {
        line-height: 32px;
        text-align: center;
    }
    #PiPWSettings .part .button {
        backdrop-filter: none;
    }
    #PiPWSettings div.button.dynamicColor {
        box-shadow: 0 0 4px var(--current-color);
        border: 1px solid var(--current-color);
        background: var(--current-color);
        backdrop-filter: none;
    }
    #PiPWSettings div.button.dynamicColor:hover {
        box-shadow: 0 0 8px var(--current-color);
    }
    #PiPWSettings div.button.dynamicColor:active {
        line-height: 38px;
        font-size: 13px;
        border-width: 2px;
        box-shadow: 0 0 12px 1px var(--current-color);
    }
    #PiPWSettings div.button.dynamicColor p {
        filter: invert(80%);
        color: var(--current-color);
        text-shadow: 0 0 1px var(--current-color);
    }

    #PiPWSettings .button + p {
        line-height: 41px;
    }

    #PiPWSettings .textBox {
        padding: 10px;
        padding-right: 5px;
    }
    #PiPWSettings .textBox:focus {
        font-size: 15px;
        border-width: 3px;
        box-shadow: 0 0 8px var(--pipws-fg);
    }
    #PiPWSettings [type=number] {
        width: 90px;
    }
    #PiPWSettings [type=search] {
        width: 320px;
    }
    #PiPWSettings textarea.textBox {
        width: 320px;
        height: 160px;
        line-height: inherit;
    }
    #PiPWSettings [type=color] {
        width: 0;
        height: 0;
        position: absolute;
        opacity: 0;
    }

    #PiPWSettings .switch {
        position: relative;
        margin: 0 50px 0 0;
        display: inline-block;
    }
    #PiPWSettings .radio {
        position: relative;
        margin: 0 25px 0 0;
        display: inline-block;
    }
    #PiPWSettings .item .radio {
        margin-right: 30px;
    }
    #PiPWSettings .switch input, #PiPWSettings .radio input{ 
        opacity: 0;
        width: 0;
        height: 0;
    }

    #PiPWSettings .slider {
        position: absolute;
        width: 50px;
        height: 25px;
        margin: 5px 0;
        border-radius: 8px;
        transition: .2s, box-shadow .1s;
    }
    #PiPWSettings .slider:active {
        border-width: 3px;
        transition: .1s;
    }

    #PiPWSettings .radio .slider {
        width: 25px;
    }
    #PiPWSettings .radio .slider:active {
        border-width: 4px;
        transition: .1s;
    }

    #PiPWSettings input:checked + .slider {
        border: 1px solid var(--pipws-bg);
        background: var(--pipws-fg);
    }
    #PiPWSettings input:checked + .slider:active {
        border-width: 3px;
    }

    #PiPWSettings .radio input:checked + .slider {
        border-color: var(--pipws-fg);
        background: var(--pipws-bg);
    }

    #PiPWSettings input:disabled + .slider {
        border: 1px solid #888;
        box-shadow: 0 0 3px #888;
    }
    #PiPWSettings input:disabled + .slider:hover {
        box-shadow: 0 0 6px #888; 
    }
    #PiPWSettings input:disabled + .slider:active {
        border-width: 1px;
        box-shadow: 0 0 6px #888;
    }
    #PiPWSettings input:disabled:checked + .slider {
        border: 1px solid #909090;
        background: #888;
    }
    #PiPWSettings .radio input:disabled:checked + .slider {
        border-color: #888;
        background: var(--pipws-bg);
    }

    #PiPWSettings .slider::before {
        position: absolute;
        content: "";
        height: 15px;
        width: 15px;
        left: 4px;
        bottom: 4px;
        border-radius: 4px;
        background: var(--pipws-fg);
        transition: .2s;
    }
    #PiPWSettings .slider:active::before {
        height: 11px;
        width: 11px;
        border-radius: 3px;
        transition: .1s;
    }

    #PiPWSettings .radio .slider::before {
        opacity: 0;
        height: 3px;
        width: 3px;
        left: 10px;
        bottom: 10px;
    }
    #PiPWSettings .radio .slider:active::before {
        opacity: 0;
        height: 27px;
        width: 27px;
        left: -5px;
        bottom: -5px;
        border-radius: 5px;
        transition: .2s;
    }

    #PiPWSettings input:checked + .slider::before {
        background: var(--pipws-bg-wot);
        transform: translateX(25px);
    }

    #PiPWSettings .radio input:checked + .slider::before {
        opacity: 1;
        height: 15px;
        width: 15px;
        left: 4px;
        bottom: 4px;
        background: var(--pipws-fg);
        transform: translateX(0px);
    }
    #PiPWSettings .radio input:checked + .slider:active::before {
        height: 11px;
        width: 11px;
        left: 4px;
        bottom: 4px;
    }

    #PiPWSettings input:disabled + .slider::before {
        background: #888;
    }
    #PiPWSettings input:disabled + .slider:active::before {
        height: 15px;
        width: 15px;
        border-radius: 4px;
    }

    #PiPWSettings input:disabled:checked + .slider::before {
        background: var(--pipws-bg-wot);
    }

    #PiPWSettings .radio input:disabled:checked + .slider::before {
        background: #888;
    }
    #PiPWSettings .radio input:disabled:checked + .slider:active::before {
        height: 15px;
        width: 15px;
    }

    #PiPWSettings .link {
        text-decoration: underline;
        cursor: pointer;
        color: var(--pipws-fg) !important;
        background: rgba(0, 0, 0, 0);
        border: 0 solid;
    }

    #PIPWDEBUGMODE {
        opacity: 0;
        transition: opacity .2s;
    }
    #PIPWDEBUGMODE:hover {
        opacity: 1;
    }
</style>
<div class="part noAutoBr" style="margin-top: 0;">
    <p class="partTitle">PiPWindow </p><p> ${loadedPlugins.PiPWindow.manifest.version?loadedPlugins.PiPWindow.manifest.version:"未知版本"}</p>
    <br />
    <p>by </p>
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning')" value=" Lukoning " />
    <p> 2025</p>
    <div style="text-align: right; position: absolute; bottom: 10px; right: 20px;">
        <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/PiPWindow')" value=" 源代码仓库(GitHub) " />
        <br />
        <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/PiPWindow/issues')" value=" 问题反馈/功能建议(GitHub Issues) " />
    </div>
</div>
<div class="part">
    <p class="partTitle">说明</p>
    <p>点击歌曲红心❤️旁按钮或<input id="PiPW-ToggleLink" class="link" type="button" value="这里" />打开/关闭◲小窗</p>
    <p>可拖动↔↕可调整大小</p>
    <p>🐀鼠标移上◲小窗显示控制按钮</p>
    <p>也可以单击小窗后敲击 空格来控制▶️播放⏸️暂停</p>
    <p>↗返回和x关闭的效果可在下方自定义</p>
</div>
<div class="part noAutoBr">
    <p class="partTitle">自定义设置</p>
    <p>注: 启用带*的选项可能会出现卡顿</p>
    <input id="resetButton-All" class="link" type="button" value="恢复默认" />
    <br />
    <div class="subPart">
        <div class="subTitle"><p>行为</p></div>
        <p>关闭按钮</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenClose" value="none" />
                <span class="slider button"></span>
            </label>
            <p>仅关闭小窗</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenClose" value="pause" />
                <span class="slider button"></span>
            </label>
            <p>关闭并暂停</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenClose" value="shutdown" />
                <span class="slider button"></span>
            </label>
            <p>关闭并退出云音乐</p>
        </div>
        <br />
        <p>返回按钮</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenBack" value="close" />
                <span class="slider button"></span>
            </label>
            <p>仅关闭小窗</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenBack" value="back" />
                <span class="slider button"></span>
            </label>
            <p>关闭并返回主窗口</p>
        </div>
        <br />
        <p>暂停时 关闭/返回按钮</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenCloseOrBack_paused" value="close" />
                <span class="slider button"></span>
            </label>
            <p>仅关闭小窗</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenCloseOrBack_paused" value="back" />
                <span class="slider button"></span>
            </label>
            <p>关闭并返回主窗口</p>
        </div>
        <br />
        <label class="switch">
            <input id="autoHideMainWindowSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>打开小窗时隐藏主窗口 (类似mini模式)</p>
        <br />
        <label class="switch">
            <input id="showTaskbarButtonSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>显示任务栏图标 (通过PowerShell, 显示/隐藏可能有延迟)</p>
    </div>
    <div class="subPart">
        <div class="subTitle"><p>信息</p></div>
        <label class="switch">
            <input id="useCloudDataForLocalFileSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>对本地文件使用云端歌曲信息 (而非文件内写入的信息)</p>
        <br />
        <label class="switch">
            <input id="showDiscWhenNoCoverSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>无封面时在封面位置显示唱片</p>
        <br />
        <label class="switch">
            <input id="allowNonsquareCoverSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>尝试适配非正方形封面</p><p class="tipText"> !这会强制下载封面原图 <a title='如果要下载缩略图，就要指定确切分辨率，这样将无法获取原始图片的宽高比'>为什么?</a></p>
        <br />
        <p>歌曲信息第二行显示</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="trackInfoShow" value="auto" />
                <span class="slider button"></span>
            </label>
            <p>自动 <a title='翻译优先，无翻译再显示所属专辑'>?</a></p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="trackInfoShow" value="album" />
                <span class="slider button"></span>
            </label>
            <p>所属专辑</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="trackInfoShow" value="translation" />
                <span class="slider button"></span>
            </label>
            <p>曲名翻译</p>
        </div>
        <br />
        <p>时间信息</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="timeInfo" value="CurrentTotal" />
                <span class="slider button"></span>
            </label>
            <p>已播时长/总时长</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="timeInfo" value="CurrentRemaining" />
                <span class="slider button"></span>
            </label>
            <p>已播时长/剩余时长</p>
        </div>
    </div>
    <div class="subPart">
        <div class="subTitle"><p>歌词</p></div>
        <p>歌词第二行显示</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricLine2Show" value="none" />
                <span class="slider button"></span>
            </label>
            <p>不要显示</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricLine2Show" value="auto" />
                <span class="slider button"></span>
            </label>
            <p>自动 <a title='翻译优先，无翻译再显示拉丁化歌词，类似桌面歌词的做法'>?</a></p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricLine2Show" value="translation" />
                <span class="slider button"></span>
            </label>
            <p>歌词翻译</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricLine2Show" value="latinization" />
                <span class="slider button"></span>
            </label>
            <p>拉丁化歌词 <a title='粤语拼音/闽南拼音/日语罗马字等'>?</a></p>
        </div>
        <br />
        <label class="switch">
            <input id="dynamicLyricsSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>逐字歌词*</p>
        <br />
        <label class="switch">
            <input id="autoScrollSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>单行歌词超出滚动*</p>
        <br />
        <label class="switch">
            <input id="lyricsTaperOffSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>歌词渐小</p>
        <br />
        <label class="switch">
            <input id="lyricsMaskSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>歌词渐隐</p>
        <br />
        <div class="tipText" style="color:#F33;${loadedPlugins.LibOpenCC?"display:none":""}"><p>v 缺失依赖: LibOpenCC 请前往插件市场下载 <a title='鼠标移至插件市场最底部的空白处，打开「开发者选项」，然后打开「显示"依赖库"分类」，回到顶部，选择「依赖库」'>找不到?</a></p></div>
        <label class="switch">
            <input id="lyricsHanzi2KanjiSwitch" type="checkbox" ${loadedPlugins.LibOpenCC?"":"disabled"}/>
            <span class="slider button"></span>
        </label>
        <p>日文歌歌词汉字纠错 (切歌生效)</p>
        <br />
        <p>偏移 (正提前，负延后)</p>
        <br />
        <input class="button textBox" id="lyricsOffsetSetBox" type="number" step="0.1" placeholder='${cfgDefault.lyricsOffset}'
            value="${state.readCfg.lyricsOffset}" />
        <p>s</p>
        <br />
        <p>歌词源</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricsFrom" value="LibLyric" ${loadedPlugins.liblyric?"":"disabled"}/>
                <span class="slider button"></span>
            </label>
            <p>LibLyric依赖库</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricsFrom" value="OriginalLyricBar" />
                <span class="slider button"></span>
            </label>
            <p>云音乐的软件内词栏</p>
        </div>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricsFrom" value="RNP" ${loadedPlugins.RefinedNowPlaying?"":"disabled"}/>
                <span class="slider button"></span>
            </label>
            <p>RefinedNowPlaying插件</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricsFrom" value="Custom" />
                <span class="slider button"></span>
            </label>
            <p>自定义歌词源 (暂时仅支持单个URL及yrc格式)</p>
            <br />
            <textarea class="button textBox" id="lyricsCustomSourcesSetBox" placeholder='${cfgDefault.lyricsCustomSources}'>${state.readCfg.lyricsCustomSources.replaceAll("\"", "&quot;" )}</textarea>
            <br />
            <input class="button" style="position: absolute; transform: translate(325px, -46px);" id="applyButton-lyricsCustomSources" type="button" value="应用" />
        </div>
        <br />
        <label class="switch">
            <input id="showLyricsErrorTipSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>显示歌词源错误提示</p>
    </div>
    <div class="subPart">
        <div class="subTitle"><p>外观</p></div>
        <p>颜色来源</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="colorFrom" value="mainWindow" />
                <span class="slider button"></span>
            </label>
            <p>主窗口</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="colorFrom" value="albumCover" />
                <span class="slider button"></span>
            </label>
            <p>专辑封面</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="colorFrom" value="custom" />
                <span class="slider button"></span>
            </label>
            <p>自定义</p>
        </div>
        <br />
        <p>自定义颜色</p>
        <div style="height: 42px">
            <div class="item">
                <label style="--current-color: ${state.readCfg.colorCustom_text}">
                    <div class="button dynamicColor">
                        <p>文字</p>
                    </div>
                    <input id="colorCustom_textSetBox" type="color" value="${state.readCfg.colorCustom_text}">
                </label>
            </div>
            <div class="item">
                <label style="--current-color: ${state.readCfg.colorCustom_bg}">
                    <div class="button dynamicColor">
                        <p>背景</p>
                    </div>
                    <input id="colorCustom_bgSetBox" type="color" value="${state.readCfg.colorCustom_bg}">
                </label>
            </div>
            <div class="item">
                <label style="--current-color: ${state.readCfg.colorCustom_accent}">
                    <div class="button dynamicColor">
                        <p>进度条</p>
                    </div>
                    <input id="colorCustom_accentSetBox" type="color" value="${state.readCfg.colorCustom_accent}">
                </label>
            </div>
        </div>
        <p>背景来源</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="backgroundFrom" value="themeBackgroundColor" />
                <span class="slider button"></span>
            </label>
            <p>主题背景色</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="backgroundFrom" value="albumCoverBlur" />
                <span class="slider button"></span>
            </label>
            <p>专辑封面模糊</p>
        </div>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="backgroundFrom" value="AMLL" ${loadedPlugins["Apple-Musiclike-lyrics"]?"":"disabled"}/>
                <span class="slider button"></span>
            </label>
            <p>(测试版) 类苹果歌词插件背景*</p>
        </div>
        <br />
        <div class="item">
            <p>全局字重 <a title='范围为1~1000，400相当于常规或中等，700相当于加粗，具体显示效果取决于字体'>?</a></p>
            <br />
            <input class="button textBox" id="generalFontWeightSetBox" type="number" step="100" min="0" max="1000" placeholder='${cfgDefault.generalFontWeight}'
            value="${state.readCfg.generalFontWeight}" />
        </div>
        <div class="item">
            <p>歌词(原文)字重</p>
            <br />
            <input class="button textBox" id="originalLyricsFontWeightSetBox" type="number" step="100" min="0" max="1000" placeholder='${cfgDefault.originalLyricsFontWeight}'
            value="${state.readCfg.originalLyricsFontWeight}" />
        </div>
        <div class="item">
            <p>歌词第二行字重</p>
            <br />
            <input class="button textBox" id="translatedLyricsFontWeightSetBox" type="number" step="100" min="0" max="1000" placeholder='${cfgDefault.translatedLyricsFontWeight}'
            value="${state.readCfg.translatedLyricsFontWeight}" />
        </div>
        <br />
        <p>全局字体</p>
        <br />
        <input class="button textBox" id="customFontsSetBox" type="search" placeholder='${cfgDefault.customFonts}'
            value="${state.readCfg.customFonts.replaceAll("\"", "&quot;" )}" />
        <br />
        <input class="button" style="position: absolute; transform: translate(325px, -40px);" id="applyButton-customFonts" type="button" value="应用" />
        <label class="switch">
            <input id="useJapaneseFontsSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>日文歌歌词使用日文字体</p>
        <br />
        <p>日文字体</p>
        <br />
        <input class="button textBox" id="customJapaneseFontsSetBox" type="search" placeholder='${cfgDefault.customJapaneseFonts}'
            value="${state.readCfg.customJapaneseFonts.replaceAll("\"", "&quot;" )}" />
        <br />
        <input class="button" style="position: absolute; transform: translate(325px, -40px);" id="applyButton-customJapaneseFonts" type="button" value="应用" />
    </div>
    <div class="subPart">
        <div class="subTitle"><p>渲染 (高级)</p></div>
        <label class="switch">
            <input id="smoothProgessBarSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>顺滑的进度条*</p>
        <br />
        <p>窗口宽高比</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="aspectRatio" value="16:9" />
                <span class="slider button"></span>
            </label>
            <p>16:9</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="aspectRatio" value="2:1" />
                <span class="slider button"></span>
            </label>
            <p>2:1</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="aspectRatio" value="21:9" />
                <span class="slider button"></span>
            </label>
            <p>21:9</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="aspectRatio" value="24:9" />
                <span class="slider button"></span>
            </label>
            <p>24:9</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="aspectRatio" value="3:1" />
                <span class="slider button"></span>
            </label>
            <p>3:1</p>
        </div>
        <br />
        <p>渲染分辨率 (越小性能越好)</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="auto" />
                <span class="slider button"></span>
            </label>
            <p>自适应</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="1080" />
                <span class="slider button"></span>
            </label>
            <p>1080p</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="960" />
                <span class="slider button"></span>
            </label>
            <p>960p</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="720" />
                <span class="slider button"></span>
            </label>
            <p>720p</p>
        </div>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="560" />
                <span class="slider button"></span>
            </label>
            <p>560p</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="480" />
                <span class="slider button"></span>
            </label>
            <p>480p</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="320" />
                <span class="slider button"></span>
            </label>
            <p>320p</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="240" />
                <span class="slider button"></span>
            </label>
            <p>240p</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="160" />
                <span class="slider button"></span>
            </label>
            <p>160p</p>
        </div>
        <br />
        <p>封面分辨率 (建议不要频繁修改; 对本地缓存或文件无效)</p>
        <br />
        <input class="button textBox" id="albumCoverSizeSetBox" type="number" step="1" placeholder='${cfgDefault.albumCoverSize}'
            value="${state.readCfg.albumCoverSize}" />
        <p>p</p>
        <label class="switch">
            <input id="useFullCoverSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>原图</p>
    </div>
    <div class="subPart">
        <div class="subTitle"><p>杂项</p></div>
        <p>加载时显示的文本</p>
        <br />
        <input class="button textBox" id="customLoadingTxtSetBox" type="search" placeholder='${cfgDefault.customLoadingTxt}'
            value="${state.readCfg.customLoadingTxt.replaceAll("\"", "&quot;" )}" />
        <br />
        <input class="button" style="position: absolute; transform: translate(325px, -40px);" id="applyButton-customLoadingTxt" type="button" value="应用" />
    </div>
</div>
<div class="part">
    <p class="partTitle">关于BUG…</p>
    <p>实在没有办法在暂停时区分关闭和返回按钮……因此做了一个折中方案</p>
    <p>控制按钮在暂停时并不会显示，但是仍然可以空格播放和暂停（到底为什么会自动消失啊??）</p>
    <p>某些情况下选择自适应分辨率，小窗可能会出现色差</p>
    <p>某些情况下小窗右侧可能会渲染出一个绿条</p>
    <p>播放过MV后有概率无法通过小窗开始播放</p>
    <br />
    <p>以及你有没有发现拖动右边缘/下边缘调整大小后，下次打开小窗时并没有记住上次调整的大小……</p>
    <p>可能有点抽象，但这会导致：选择自适应分辨率后，没法成功通过右/下边缘调整大小</p>
    <p>原因未知。</p>
    <br />
    <p>有反馈说有窗口比例错误（出现黑边）及调整大小时"瞬移"到其他位置的情况出现</p>
    <p>这些情况比较难排查，作者已放弃挣扎</p>
</div>
<div class="part noAutoBr">
    <p class="partTitle">开放源代码许可</p>
    <br />
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Remix-Design/remixicon')" value=" Remix Icon " />
    <p> licensed under the </p>
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://www.apache.org/licenses/LICENSE-2.0.txt')" value=" Apache License Version 2.0 " />
    <p> | 使用了其中picture-in-picture-2-line和picture-in-picture-fill两个图标，并对其代码进行了拆分以节省空间。</p>
    <br />
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/MuttonString/Furigana')" value=" Furigana " />
    <p> without any licenses </p>
    <p> | 修改并使用了其中的(很简单的)日文歌识别算法。</p>
    <br />
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/BetterNCM/FluentProgessBar')" value=" FluentProgessBar " />
    <p> licensed under the </p>
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://www.gnu.org/licenses/gpl-3.0.txt')" value=" GNU/GPL-3.0 " />
    <p> | 修改并使用了其中关于获取歌曲播放状态及进度的方法。</p>
</div>
<br /><br />
<div id="PIPWDEBUGMODE" class="noAutoBr">
    <label class="switch">
        <input id="debugModeSwitch" type="checkbox" />
        <span class="slider button"></span>
    </label>
    <p>BUG多多怎么办？调试模式且力你一臂之力！（重载复位）</p>
    <br />
    <p style="user-select: text">也可在控制台使用 PiPWShowRefreshing() 来手动开关&lt;canvas&gt;重绘情况跟踪</p>
</div>
<br /><br />
    `;
  let cfgDfKeys = Object.keys(cfgDefault);
  for (let i = 0; i < cfgDfKeys.length; i++) {
    let keyName = cfgDfKeys[i],
      key = state.readCfg[keyName];
    if (key == void 0 || key == null) {
      key = cfgDefault[keyName];
    }
    switch (typeof key) {
      case "number":
        let n = q(`#${keyName}SetBox`, state.cP);
        if (n) {
          n.addEventListener("change", () => {
            saveCfg(keyName);
          });
          n.addEventListener("keydown", (e) => {
            if (e.key == "Enter") {
              saveCfg(keyName);
            }
          });
        }
        break;
      case "string":
        let str = q(`#${keyName}SetBox`, state.cP),
          radios = qAll(`[name=${keyName}]`, state.cP);
        if (radios.length != 0) {
          for (let i = 0; i < radios.length; i++) {
            if (radios[i].value == key) {
              radios[i].checked = true;
            }
            radios[i].addEventListener("change", () => {
              saveCfg(keyName);
            });
          }
        } else if (str) {
          if (str.type == "color") {
            str.addEventListener("change", (e) => {
              saveCfg(keyName);
              e.target.parentElement.style.setProperty("--current-color", e.target.value);
            });
          } else if (str.tagName != "TEXTAREA") {
            str.addEventListener("keydown", (e) => {
              if (e.key == "Enter") {
                saveCfg(keyName);
              }
            });
          } //回车应用
          try {
            q(`#applyButton-${keyName}`, state.cP).addEventListener("click", () => {
              saveCfg(keyName);
            });
          } catch {}
        }
        break;
      case "boolean":
        try {
          let f,
            swc = q(`#${keyName}Switch`, state.cP),
            ckBox = q(`#${keyName}CheckBox`, state.cP);
          if (swc) {
            f = swc;
          } else if (ckBox) {
            f = swc;
          }
          f.checked = key;
          f.addEventListener("change", () => {
            saveCfg(keyName);
          });
        } catch (e) {
          console.error(`PiPW Error: ${e}`);
        }
        break;
      default:
        console.error(`PiPW Error: 未知错误。设置界面可能异常。`);
        tipMsg("PiPWindow设置界面可能异常", "err");
    }
  }
  q("#PiPW-ToggleLink", state.cP).addEventListener("click", () => {
    window.PiPWTestDomWindow();
  });
  q("#resetButton-All", state.cP).addEventListener("click", () => {
    resetCfg();
  });
  let sTBS = q("#showTaskbarButtonSwitch", state.cP);
  sTBS.addEventListener("change", () => {
    sTBS.disabled = true;
    setTimeout(() => {
      sTBS.disabled = false;
    }, 3000);
  });
  q(`[name="resolutionRatio"][value="auto"]`, state.cP).addEventListener("click", () => {
    state.autoRatio = true;
    reRatio(state.thePiPWindow.height);
  });
  q("#debugModeSwitch", state.cP).addEventListener("change", () => {
    state.debugMode = q("#debugModeSwitch").checked;
    if (state.debugMode) {
      DEBUG();
      window.PiPWShowRefreshing();
    }
  });
  console.log(state.cP);
  return state.cP;
}
