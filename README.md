Vimium++
========
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.txt)
![Version 1.59](https://img.shields.io/badge/release-1.59-orange.svg)

**[Visit Vimium++ in Chrome Web Store](https://chrome.google.com/webstore/detail/vimium%2B%2B/hfjbmagddngcpeloejdejnfgbamkjaeg)**.

A customized [Vimium](https://github.com/philc/vimium)
  licensed under the [MIT license](LICENSE.txt)
  by [gdh1995](https://github.com/gdh1995),
  supporting Chrome with the session functionalities (ver >= 37).
  For older version, it would try to work ^_^

If you wants to use Vimium++ on Firefox, please go to `about:config` and
  mark `dom.webcomponents.enabled` as `true`.

In the *weidu* directory is 微度新标签页.


# Project Introduction

__Vimium++:__

* a Chrome extension that provides keyboard-based navigation and control
    of the web in the spirit of the Vim editor.
* forked from [philc/vimium:master](https://github.com/philc/vimium).
* optimized after translating it from CoffeeScript into JavaScript.
* more functions, more powerful, and more convenient (for me, at least).

__Vomnibar Page:__

* [visit it on Chrome Web Store](https://chrome.google.com/webstore/detail/vomnibar-page-for-vimium%20/ekohaelnhhdhbccgefjmjpdjoijhojgd)
* is an extension to replace Vimium++'s inner Vomnibar page.
* With this, Vimium++'s memory cost will be smaller since Chrome 56.

__微度新标签页修改版 (Modified X New Tab Page):__

* [visit it on Chrome Web Store](https://chrome.google.com/webstore/detail/微度新标签页修改版/hdnehngglnbnehkfcidabjckinphnief)
* in folder [*weidu*](https://github.com/gdh1995/vimium-plus/tree/master/weidu)
* support Vimium++ and provide a vomnibar page: chrome-extension://hdnehngglnbnehkfcidabjckinphnief/vomnibar.html
* 一款基于Html5的Chrome浏览器扩展程序。
  它提供了网站快速拨号、网站云添加、数据云备份等功能来增强 Chrome
    原生新标签页（New Tab）；
  另外微度还提供了：
    天气、云壁纸、快速搜索等插件，为用户提供最快捷的上网方式。
* 微度新标签页: [www.weidunewtab.com](http://www.weidunewtab.com/);
    X New Tab Page: [www.newtabplus.com](http://www.newtabplus.com/).
* its official online version supporting multi browsers:
    [www.94994.com](http://www.94994.com/).
* selected only one language: zh_CN.UTF-8.
* some is customized.
* the official settings file is OK for it, but not the other way around.

__Other extensions supporting Vimium++:__

* [PDF Viewer for Vimium++](https://chrome.google.com/webstore/detail/pdf-viewer-for-vimium%20%20/nacjakoppgmdcpemlfnfegmlhipddanj)
    : a modified version of [PDF Viewer](https://chrome.google.com/webstore/detail/pdf-viewer/oemmndcbldboiebfnladdacbdfmadadm)
    from [PDF.js](https://github.com/mozilla/pdf.js/)

# Release Notes

Known issues (Up to the master branch):
1. Chrome before version 49 has bugs in `Window.postMessage` if the flag `#enable-site-per-process` is on,
which breaks `Vomnibar`. Then `Vomnibar` would only work well on Vimium++ Options pages.
2. `Preferred Vomnibar Page` can not support Http/File URLs before Chrome 41.

Not released yet:
* **WARNING**: the global shortcut for "Go one tab right" needs to be re-installed
* fix bugs about the option `Preferred Vomnibar Page`

1.59.1:
* **add an option "Vomnibar Page" to show user's preferred Vomnibar page**
  * recommended: use `chrome-extension://ekohaelnhhdhbccgefjmjpdjoijhojgd/vomnibar.html`
  * If set, Vimium will be away from a Chrome bug of extension memory leak.
* **global keyboard shortcuts: remove suggested keys**, so that Vimium++ is cleaner
  * those suggested mappings are added into the default list and the recommended settings
* auto convert mapped keys containing `<s-`: e.g. `<s-a>` to `A`, `<c-s-a>` to `<c-A>`
  * `<s-*>` is a grammar Vimium will support (https://github.com/philc/vimium/pull/2388)
* add my 3 Chrome extensions into the extension white list by default
  * Vomnibar Page for Vimium++, Modified X New Tab Page, PDF Viewer for Vimium++
* add a checker to ensure `New tab URL` won't cause a dead loop
* fix a performance issue of Vomnibar UI on an edge case
* auto complete a domain in Vomnibar using
    the protocol of the last opened page of the same domain
  * complete `www.bing.com` using `https` once open `https://www.bing.com`
* fix broken `<SPACE>` mapping since Chrome 51
* move the PRIVACY-POLICY document to [`PRIVACY-POLICY.md`](PRIVACY-POLICY.md) and update it

1.58.1:
* fix detection for Mac system: fix `LinkHints.activateModeToOpenInNewTab`

1.58.0:
* temporarily disable the experimental feature of options_ui dialog
* fix broken `Vomnibar` caused by the Chrome flag `#enable-site-per-process`
  * this problem may occur since Chrome 56 even if this flag is off
* use `closed` shadowDOM to show UI more safely
* fix many small code bugs

1.57.6:
* fix bugs like single-completer searching and opening showPage in place

1.57.5:
* **WARNING**: "Custom outer CSS" will be definitely removed in the future
* **WARNING**: revert semantics of `metaKey`: now the same as `ctrlKey`
* support `mapKey` which works on both normal and insert modes
* support zoomed pages better and handle malformed pages safely
* the background process has smaller memory cost
* lazy refresh when you update bookmarks
* allow showing options page as a dialogue in Chrome's options page,
  but Chrome 55 has bugs in option dialogue if `#enable-md-extensions` is enabled.

1.57.3:
* fix a bug that tab completer does not accept commands like "+10"
* use different color to hint containers like iframes and scrollable boxes
* fix some other small bugs

1.57.2:
* fix a serious performance regression which was imported in 1.57 and made
  `LinkHints` slow down significantly if a page had some overlapped links.
* rework logic of `toggleCS` and `enableCSTemp` about `commandCount`,
  so when content on a base domain is enabled, the current sub-domain
    will be ensured to enable the content, too.

1.57.1:
* fix broken `LinkHints.activateModeToOpenVomnibar`
* change fonts in UI for better presentation: `Helvetica Neue` is preferred,
  and for Chinese characters, now try to use `PingFang` and `YaHei`.
* `removeTab` accepts an boolean option `allow_close` (default to `false`),
  and Vimium++ will not retain the last tab if getting `allow_close=false`.
* add back `Vomnibar.activateEditUrl` and `Vomnibar.activateEditUrlInNewTab`
* `Vomnibar.activateEditUrl` now supports `count` to get an upper url
* suggest using `Gg` to `openInNewTab` and `GG` to `searchInGoogle`

1.57:
* **WARNING**: revert modifier keys' orders into `a-c-m-`
* **WARNING**: change semantics of `metaKey`: just the same as `altKey`
* **WARNING**: The default of `grabBackFocus` becomes `false`,
  although its recommended value is still `true`.
* add `searchInAnother` to search current content using another search engine.
* add `toggleMuteTab`.
* add `parentFrame` which only works on Chrome 41+.
* `Marks`: global marks search other tabs by url prefix by default,
  and you may turn off this feature by `map Marks.activate prefix=false`.
* fix a bug history titles may be wrong.
* other bug fixes.

1.56:
* Vomnibar is re-implemented using `<iframe>`, which is much safer than shadowDOM.
* Backend completer procedure is reworked and Vomnibar works faster for continuous input.
* remove the setting item "Try to reduce Vimium++'s memory cost" (`tinyMemory`).
* fix a bug that Vimium++ would break on Chrome 37 to 47.
* version 1.56.1: fix a bug of lacking tips for vimium://copy urls in vomnibar.
* version 1.56.2: support to map `backspace`.
* version 1.56.3: fix that VScroller will break
    if the flag `#enable-experimental-web-platform-features` is enabled.
* version 1.56.4: fix that `Vomnibar` breaks on other extensions' page
    if Vimium++ is forced to reload.
  fix an edge case that `LinkHints` may break on page loading.
* small bug fixes; try to avoid unnecessary forced reflows.

1.55:
* add **Visual Mode**, and support all commands of philc/Vimium's.
  This implementation works well on `<textarea>`s and `shadowDOM`s.
* add commend `clearFindHistory` to remove all find mode history,
    in normal mode incognito mode.
* use a small `options_ui.html` to jump to the options page on Chrome's settings page,
  and this manifest item makes a warning on installation before Chrome 40,
    though it has not any influence.
* some bug fixes.

1.54:
* **WARNING**: change modifier keys' order into `m-c-a-` (breaking)
* add `LinkHints.activateModeToEdit` to select an editable area with hints
* deprecate `clearGlobalMarks` and please use `Marks.clearGlobal` instead
* rework `goUp` and `goToRoot`: try to support different forms of hash bangs
* use `event.key` if it exists, to disable warning on Chrome 52
* the default `tinyMemory` is set `true`,
  and the history completer loads slower but has a smaller memory peak
* Chrome 52 doesn't allow Vimium++ to create an incognito window
    using a normal tab,
  so those tricks which allow Vimium++ to show normal tabs in incognito windows
    won't work any more.
  Also fix a bug that `createTab` may not work properly on a popup window.
* lots of bug fixes
* add a branch `basic-on-edge` to make Vimium++ work on Microsoft Edge,
    although many commands become broken after the migration
* rename front-end global variables to `V***`,
  in order to avoid potential name collisions when injected into other hosts

# Building

If you want to compile this project manually, please run:

``` bash
npm install typescript@next
# remove options "narrowFormat" in `tsconfig.json`
node tsc.js
node tsc.js front
node tsc.js pages
#./make.sh output-file.zip
```

The two options are for another version of [TypeScript](https://github.com/gdh1995/TypeScript).

`gulp local` can also compile files in place, while `gulp dist` compiles and minimizes files into `dist/`.

# Thanks & License

* [Vimium](https://github.com/philc/vimium):
  Copyright (c) 2010 Phil Crosby, Ilya Sukhar.
* [微度新标签页](http://www.weidunewtab.com/):
  ©2012 杭州佐拉网络有限公司 保留所有权利.
* [JavaScript Expression Evaluator](https://github.com/silentmatt/expr-eval):
  Copyright (c) 2015 Matthew Crumley.
  [license](https://github.com/silentmatt/expr-eval/blob/master/LICENSE.txt).
* [Viewer.js](https://github.com/fengyuanchen/viewerjs):
  Copyright (c) 2015-2016 Fengyuan Chen.
  [license](https://github.com/fengyuanchen/viewerjs/blob/master/LICENSE).
* [TypeScript](https://github.com/Microsoft/TypeScript)
    and modified `es.d.ts`, `es/*`, `dom.d.ts` and `chrome.d.ts` in `types/`:
  Copyright (c) Microsoft Corporation (All rights reserved).
  Licensed under the Apache License, Version 2.0.
  See more in [www.typescriptlang.org](http://www.typescriptlang.org/).
* [PDF Viewer](https://github.com/mozilla/pdf.js/)
  Copyright (c) Mozilla and individual contributors.
  Licensed under the Apache License, Version 2.0.
