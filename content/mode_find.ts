var VFindMode = {
  isActive: false,
  query: "",
  parsedQuery: "",
  historyIndex: 0,
  isRegex: false,
  ignoreCase: false,
  hasNoIgnoreCaseFlag: false,
  hasResults: false,
  matchCount: 0,
  coords: null as null | [number, number],
  initialRange: null as Range | null,
  activeRegexIndex: 0,
  regexMatches: null as RegExpMatchArray | null,
  box: null as never as HTMLIFrameElement,
  input: null as never as HTMLBodyElement,
  countEl: null as never as HTMLSpanElement,
  styleIn: null as never as HTMLStyleElement,
  styleOut: null as never as HTMLStyleElement,
  A0Re: <RegExpG> /\xa0/g,
  tailRe: <RegExpOne> /\n$/,
  cssSel: "::selection{background:#ff9632 !important;}",
  cssOut: "body{-webkit-user-select:auto !important;user-select:auto !important;}\n",
  cssIFrame: `*{font:12px/14px "Helvetica Neue",Helvetica,Arial,sans-serif !important;
height:14px;margin:0;overflow:hidden;vertical-align:top;white-space:nowrap;cursor:default;}
body{cursor:text;display:inline-block;padding:0 3px 0 1px;max-width:215px;min-width:7px;}
body *{all:inherit !important;display:inline !important;}
html > count{float:right;}`,
  activate (_0?: number, options?: FgOptions): void {
    if (!VDom.isHTML()) { return; }
    options = Object.setPrototypeOf(options || {}, null);
    const query: string | undefined | null = options.query ? (options.query + "") : null;
    this.isActive || query === this.query || VMarks.setPreviousPosition();
    if (query != null) {
      return this.findAndFocus(this.query || query, options);
    }
    this.getCurrentRange();
    if (options.returnToViewport) {
      this.coords = [window.scrollX, window.scrollY];
    }
    this.box && VDom.UI.adjust();
    if (this.isActive) {
      this.box.contentWindow.focus();
      this.input.focus();
      this.box.contentDocument.execCommand("selectAll", false);
      return;
    }

    const zoom = VDom.UI.getZoom();
    this.parsedQuery = this.query = "";
    this.regexMatches = null;
    this.activeRegexIndex = 0;
    this.init && this.init();
    this.styleIn.disabled = this.styleOut.disabled = true;

    const el = this.box = VDom.createElement("iframe");
    el.className = "R HUD UI";
    el.style.width = "0px";
    options.browserVersion < BrowserVer.MinNotPassMouseWheelToParentIframe && (el.onmousewheel = VUtils.Prevent);
    if (zoom !== 1) { el.style.zoom = "" + 1 / zoom; }
    el.onload = function(this: HTMLIFrameElement): void { return VFindMode.onLoad(this); };
    VHandler.push(VDom.UI.SuppressMost, this);
    VDom.UI.addElement(el, {adjust: true, before: VHUD.box});
  },
  onLoad (box: HTMLIFrameElement): void {
    const wnd = box.contentWindow, doc = wnd.document, docEl = doc.documentElement as HTMLHtmlElement,
    zoom = wnd.devicePixelRatio;
    box.onload = null as never;
    wnd.dispatchEvent(new Event("unload"));
    wnd.onmousedown = box.onmousedown = this.OnMousedown;
    wnd.onkeydown = this.onKeydown.bind(this);
    wnd.onunload = this.OnUnload;
    zoom < 1 && (docEl.style.zoom = "" + 1 / zoom);
    (doc.head as HTMLHeadElement).appendChild(VDom.UI.createStyle(VFindMode.cssIFrame, doc));
    const el: HTMLElement = this.input = doc.body as HTMLBodyElement;
    docEl.insertBefore(doc.createTextNode("/"), el);
    try {
      el.contentEditable = "plaintext-only";
    } catch (e) {
      el.contentEditable = "true";
      el.onpaste = function (this: HTMLElement, event: ClipboardEvent): void {
        const d = event.clipboardData, text = d && typeof d.getData === "function" ? d.getData("text/plain") : "";
        event.preventDefault();
        if (!text) { return; }
        (event.target as HTMLElement).ownerDocument.execCommand("insertText", false, text);
      };
    }
    el.oninput = this.onInput.bind(this);
    const el2 = this.countEl = doc.createElement("count");
    el2.appendChild(doc.createTextNode(""));
    this.isActive = true;
    function cb(): void {
      VHandler.remove(VFindMode);
      docEl.appendChild(el2);
      el.focus();
      wnd.onfocus = VEventMode.OnWndFocus();
    }
    if ((VDom.UI.box as HTMLElement).style.display) {
      VDom.UI.callback = cb;
    } else {
      setTimeout(cb, 0);
    }
  },
  init (): HTMLStyleElement {
    const ref = this.postMode, UI = VDom.UI;
    ref.exit = ref.exit.bind(ref);
    UI.addElement(this.styleIn = UI.createStyle(this.cssSel));
    this.init = null as never;
    return (UI.box as HTMLElement).appendChild(this.styleOut = UI.createStyle(this.cssOut + this.cssSel));
  },
  findAndFocus (query: string, options: FgOptions): void {
    if (query !== this.query) {
      this.updateQuery(query);
      if (this.isActive) {
        this.input.textContent = query.replace(<RegExpOne> /^ /, '\xa0');
        this.showCount();
      }
    }
    this.init && this.init();
    const style = this.isActive || VHUD.opacity !== 1 ? null : (VHUD.box as HTMLDivElement).style;
    style && (style.visibility = "hidden");
    this.execute(null, options);
    style && (style.visibility = "");
    if (!this.hasResults) {
      this.isActive || VHUD.showForDuration(`No matches for '${this.query}'`, 1000);
      return;
    }
    this.focusFoundLink(window.getSelection().anchorNode as Element | null);
    return this.postMode.activate();
  },
  deactivate (unexpectly?: boolean): Element | null { // need keep @hasResults
    let el: Element | null = null;
    this.coords && window.scrollTo(this.coords[0], this.coords[1]);
    this.isActive = this._small = false;
    if (unexpectly !== true) {
      window.focus();
      el = VDom.getSelectionFocusElement();
      el && el.focus && el.focus();
    }
    this.box.remove();
    if (this.box === VDom.lastHovered) { VDom.lastHovered = null; }
    this.box = this.input = this.countEl = null as never;
    this.styleIn.disabled = true;
    this.parsedQuery = this.query = "";
    this.initialRange = this.regexMatches = this.coords = null;
    this.historyIndex = this.matchCount = 0;
    return el;
  },
  OnUnload (this: void, e: Event): void {
    if (e.isTrusted == false) { return; }
    const f = VFindMode; f && f.isActive && f.deactivate(true);
  },
  OnMousedown (this: void, event: MouseEvent): void {
    if (event.target !== VFindMode.input && event.isTrusted != false) {
      event.preventDefault();
      VFindMode.input.focus();
    }
  },
  onKeydown (event: KeyboardEvent): void {
    if (event.isTrusted == false) { return; }
    if (VScroller.keyIsDown && VEventMode.OnScrolls[0](event)) { return; }
    const enum Result {
      DoNothing = 0,
      Exit = 1, ExitToPostMode = 2, ExitAndReFocus = 3,
      MinComplicatedExit = ExitToPostMode,
      PassDirectly = -1,
    }
    const n = event.keyCode;
    let i = event.altKey ? Result.DoNothing
      : n === VKeyCodes.enter ? event.shiftKey ? Result.PassDirectly : (this.saveQuery(), Result.ExitToPostMode)
      : (n !== VKeyCodes.backspace && n !== VKeyCodes.deleteKey) ? Result.DoNothing
      : this.query || (n === VKeyCodes.deleteKey && !VSettings.cache.onMac) ? Result.PassDirectly : Result.Exit;
    if (!i) {
      if (VKeyboard.isEscape(event)) { i = Result.ExitAndReFocus; }
      else if (i = VKeyboard.getKeyStat(event)) {
        if ((i & ~KeyStat.PrimaryModifier) !== 0) { return; }
        else if (n === VKeyCodes.up || n === VKeyCodes.down || n === VKeyCodes.end || n === VKeyCodes.home) {
          VEventMode.scroll(event, this.box.contentWindow);
        }
        else if (n === VKeyCodes.J || n === VKeyCodes.K) { this.execute(null, { dir: (VKeyCodes.K - n) as BOOL }); }
        else { return; }
        i = Result.DoNothing;
      }
      else if (n === VKeyCodes.f1) { this.box.contentDocument.execCommand("delete"); }
      else if (n === VKeyCodes.f2) { window.focus(); VEventMode.suppress(n); }
      else if (n === VKeyCodes.up || n === VKeyCodes.down) { this.nextQuery(n === VKeyCodes.up ? 1 : -1); }
      else { return; }
    } else if (i === Result.PassDirectly) {
      return;
    }
    VUtils.Prevent(event);
    if (!i) { return; }
    let hasStyle = !this.styleIn.disabled, el = this.deactivate(), el2: Element | null;
    VEventMode.suppress(n);
    if ((i === Result.ExitAndReFocus || !this.hasResults || VVisualMode.mode) && hasStyle) {
      this.toggleStyle(0);
      this.restoreSelection(true);
    }
    if (VVisualMode.mode) { return VVisualMode.activate(); }
    if (i < Result.MinComplicatedExit || !this.hasResults) { return; }
    if (!el || el !== VEventMode.lock()) {
      el = window.getSelection().anchorNode as Element | null;
      if (el && !this.focusFoundLink(el) && i === Result.ExitAndReFocus && (el2 = document.activeElement)) {
        VDom.getEditableType(el2) >= EditableType.Editbox && el.contains(el2) && VDom.UI.simulateSelect(el2);
      }
    }
    if (i === Result.ExitToPostMode) { return this.postMode.activate(); }
  },
  focusFoundLink (el: Element | null): el is HTMLAnchorElement {
    for (; el && el !== document.body; el = el.parentElement) {
      if (el instanceof HTMLAnchorElement) {
        el.focus();
        return true;
      }
    }
    return false;
  },
  nextQuery (dir: 1 | -1): void {
    const ind = this.historyIndex + dir;
    if (ind < 0) { return; }
    this.historyIndex = ind;
    if (dir > 0) {
      return VPort.send({ handler: "findQuery", index: ind }, this.SetQuery);
    }
    this.box.contentDocument.execCommand("undo", false);
    this.box.contentWindow.getSelection().collapseToEnd();
  },
  SetQuery (this: void, query: string): void {
    let _this = VFindMode, doc: Document;
    if (query === _this.query) { return; }
    if (!query && _this.historyIndex > 0) { --_this.historyIndex; return; }
    (doc = _this.box.contentDocument).execCommand("selectAll", false);
    doc.execCommand("insertText", false, query.replace(<RegExpOne> /^ /, '\xa0'));
    return _this.onInput();
  },
  saveQuery (): string | void | 1 {
    return this.query && VPort.post({ handler: "findQuery", query: this.query });
  },
  postMode: {
    lock: null as Element | null,
    activate: function() {
      const el = VEventMode.lock(), Exit = this.exit as (this: void, a?: boolean | Event) => void;
      if (!el) { Exit(); return; }
      VHandler.push(this.onKeydown, this);
      if (el === this.lock) { return; }
      if (!this.lock) {
        addEventListener("click", Exit, true);
        VEventMode.setupSuppress(Exit);
      }
      Exit(true);
      this.lock = el;
      el.addEventListener("blur", Exit, true);
    },
    onKeydown (event: KeyboardEvent): HandlerResult {
      const exit = VKeyboard.isEscape(event);
      exit ? this.exit() : VHandler.remove(this);
      return exit ? HandlerResult.Prevent : HandlerResult.Nothing;
    },
    exit (skip?: boolean | Event): void {
      if (skip instanceof MouseEvent && skip.isTrusted == false) { return; }
      this.lock && this.lock.removeEventListener("blur", this.exit, true);
      if (!this.lock || skip === true) { return; }
      this.lock = null;
      removeEventListener("click", this.exit, true);
      VHandler.remove(this);
      return VEventMode.setupSuppress();
    }
  },
  onInput (): void {
    const query = this.input.innerText.replace(this.A0Re, " ").replace(this.tailRe, "");
    let s = this.query;
    if (!this.hasResults && s && query.startsWith(s) && query.substring(s.length - 1).indexOf("\\") < 0) { return; }
    s = "";
    this.coords && window.scrollTo(this.coords[0], this.coords[1]);
    this.updateQuery(query);
    this.restoreSelection();
    this.execute(!this.isRegex ? this.parsedQuery : this.regexMatches ? this.regexMatches[0] : "");
    return this.showCount();
  },
  _small: false,
  showCount (): void {
    let count = this.matchCount;
    (this.countEl.firstChild as Text).data = !this.parsedQuery ? ""
      : "(" + (count || (this.hasResults ? "Some" : "No")) + " match" + (count !== 1 ? "es)" : ")");
    count = this.input.offsetWidth + this.countEl.offsetWidth + 4;
    if (this._small && count < 150) { return; }
    this.box.style.width = ((this._small = count < 150) ? 0 : count) + "px";
  },
  _ctrlRe: <RegExpG & RegExpSearchable<2>> /(\\\\?)([rRI]?)/g,
  escapeAllRe: <RegExpG> /[$()*+.?\[\\\]\^{|}]/g,
  updateQuery (query: string): void {
    this.query = query;
    this.isRegex = VSettings.cache.regexFindMode;
    this.hasNoIgnoreCaseFlag = false;
    query = this.parsedQuery = query.replace(this._ctrlRe, this.FormatQuery);
    this.ignoreCase = !this.hasNoIgnoreCaseFlag && !VUtils.hasUpperCase(query);
    this.isRegex || (query = this.isActive ? query.replace(this.escapeAllRe, "\\$&") : "");

    let re: RegExpG | undefined;
    if (query) {
      try { re = new RegExp(query, this.ignoreCase ? "gi" as "g" : "g"); } catch (e) {}
    }
    let matches: RegExpMatchArray | null = null;
    if (re) {
      query = ((document.webkitFullscreenElement || document.documentElement) as HTMLElement).innerText;
      matches = query.match(re) || query.replace(this.A0Re, " ").match(re);
      query = "";
    }
    this.regexMatches = this.isRegex ? matches : null;
    this.activeRegexIndex = 0;
    this.matchCount = matches ? matches.length : 0;
  },
  FormatQuery (this: void, match: string, slashes: string, flag: string): string {
    if (!flag || slashes.length != 1) { return match; }
    if (flag === 'I') { VFindMode.hasNoIgnoreCaseFlag = true; }
    else { VFindMode.isRegex = flag === 'r'; }
    return "";
  },
  restoreSelection (isCur?: boolean): void {
    const sel = window.getSelection(),
    range = !isCur ? this.initialRange : sel.isCollapsed ? null : sel.getRangeAt(0);
    if (!range) { return; }
    sel.removeAllRanges();
    sel.addRange(range);
  },
  getNextQueryFromRegexMatches (dir: 1 | -1): string {
    if (!this.regexMatches) { return ""; }
    let count = this.matchCount;
    this.activeRegexIndex = count = (this.activeRegexIndex + dir + count) % count;
    return this.regexMatches[count];
  },
  execute (query?: string | null, options?: FindNS.ExecuteOptions): void {
    Object.setPrototypeOf(options || (options = {}), null);
    let el: Element | null, found: boolean, count = (options.count as number) | 0, back = (options.dir as number) <= 0
      , q: string, notSens = this.ignoreCase && !options.caseSensitive;
    options.noColor || this.toggleStyle(1);
    do {
      q = query != null ? query : this.isRegex ? this.getNextQueryFromRegexMatches(back ? -1 : 1) : this.parsedQuery;
      found = window.find(q, !notSens, back, true, false, true, false);
    } while (0 < --count && found);
    options.noColor || setTimeout(this.HookSel, 0);
    (el = VEventMode.lock()) && !VDom.isSelected(document.activeElement as Element) && el.blur && el.blur();
    this.hasResults = found;
  },
  RestoreHighlight (this: void): void { return VFindMode.toggleStyle(0); },
  HookSel (): void {
    document.addEventListener("selectionchange", VFindMode && VFindMode.RestoreHighlight, true);
  },
  toggleStyle (enabled: BOOL): void {
    document.removeEventListener("selectionchange", this.RestoreHighlight, true);
    this.styleOut.disabled = this.styleIn.disabled = !enabled;
  },
  getCurrentRange (): void {
    let sel = window.getSelection(), range: Range;
    if (!sel.rangeCount) {
      range = document.createRange();
      range.setStart(document.body || document.documentElement as Element, 0);
    } else {
      range = sel.getRangeAt(0);
    }
    range.setEnd(range.startContainer, range.startOffset);
    this.initialRange = range;
  }
};
