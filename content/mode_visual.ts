declare namespace VisualModeNS {
  const enum Action {

  }
  type ValidActions = VisualModeNS.Action | ((this: any, count: number) => any);
  type ForwardDir = 0 | 1;
  const enum G {
    character = 0, line = 1, lineboundary = 2, paragraph = 3, sentence = 4, word = 6, documentboundary = 7,
  }
  const enum VimG {
    vimword = 5,
  }
}
var VVisualMode = {
  mode: "" as "visual" | "caret" | "line",
  hud: "",
  hudTimer: 0,
  currentCount: 0,
  currentSeconds: null as SafeDict<VisualModeNS.ValidActions> | null,
  retainSelection: false,
  selection: null as never as Selection,
  type (): string {
    const sel = this.selection;
    return sel.type || (sel.rangeCount <= 0 ? "None" : sel.isCollapsed ? "Caret" : "Range");
  },
  activate (_0?: number, options?: FgOptions): void {
    let sel: Selection, type: string, mode: typeof VVisualMode.mode;
    Object.setPrototypeOf(options = options || {} as FgOptions, null);
    this.init && this.init();
    this.movement.selection = this.selection = sel = VDom.UI.getSelection();
    VHandler.remove(this);
    VHandler.push(this.onKeydown, this);
    type = this.type();
    if (!this.mode) { this.retainSelection = type === "Range"; }
    this.mode = mode = options.mode || "visual";
    if (mode !== "caret") {
      this.movement.alterMethod = "extend";
      if (!VEventMode.lock() && (type === "Caret" || type === "Range")) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        VDom.prepareCrop();
        if (!VRect.cropRectToVisible(rect.left, rect.top, rect.right + 3, rect.bottom + 3)) {
          sel.removeAllRanges();
        } else if (type === "Caret") {
          this.movement.extendByOneCharacter(1) || this.movement.extend(0);
        }
        type = this.type();
      }
      if (type !== "Range") { mode = "caret"; }
    }
    this.hudTimer && clearTimeout(this.hudTimer);
    VHUD.show(this.hud = mode[0].toUpperCase() + mode.substring(1) + " mode");
    if (mode !== this.mode) {
      this.mode = mode;
      this.prompt("No usable selection, entering caret mode...", 1000);
    }
    if (mode !== "caret") { return mode === "line" ? this.movement.extendToLine() : undefined; }
    this.movement.alterMethod = "move";
    if (type === "Range") {
      this.movement.collapseSelectionTo(0);
    } else if (type === "None" && this.establishInitialSelectionAnchor()) {
      this.deactivate();
      return VHUD.showForDuration("Create a selection before entering visual mode.");
    }
    this.movement.extend(1);
    return this.movement.scrollIntoView();
  },
  deactivate (isEsc?: 1): void {
    VHandler.remove(this);
    if (!this.retainSelection) {
      this.movement.collapseSelectionTo(isEsc && this.mode !== "caret" ? 1 : 0);
    }
    const el = VEventMode.lock();
    el && VDom.getEditableType(el) && el.blur && el.blur();
    this.mode = "" as never; this.hud = "";
    this.retainSelection = false;
    this.selection = this.movement.selection = null as never;
    return VHUD.hide();
  },
  onKeydown (event: KeyboardEvent): HandlerResult {
    let i = event.keyCode, count = 0;
    if (i >= VKeyCodes.f1 && i <= VKeyCodes.f12) { return i === VKeyCodes.f1 ? HandlerResult.Prevent : HandlerResult.Nothing; }
    if (i === VKeyCodes.enter) {
      i = VKeyboard.getKeyStat(event);
      if ((i & KeyStat.shiftKey) && this.mode !== "caret") { this.retainSelection = true; }
      (i & KeyStat.PrimaryModifier) ? this.deactivate() : this.yank(i === KeyStat.altKey || null);
      return HandlerResult.Prevent;
    }
    if (VKeyboard.isEscape(event)) {
      this.currentCount || this.currentSeconds ? this.resetKeys() : this.deactivate(1);
      return HandlerResult.Prevent;
    }
    const ch = VKeyboard.getKeyChar(event);
    if (!ch) { this.resetKeys(); return i === VKeyCodes.ime || i === VKeyCodes.menuKey ? HandlerResult.Nothing : HandlerResult.Suppress; }
    let key = VKeyboard.getKey(event, ch), obj: SafeDict<VisualModeNS.ValidActions> | null | VisualModeNS.ValidActions | undefined;
    key = VEventMode.mapKey(key);
    if (obj = this.currentSeconds) {
      obj = obj[key];
      count = this.currentCount;
      this.resetKeys();
    }
    if (obj != null) {}
    else if (key.length === 1 && (i = +key[0]) < 10 && (i || this.currentCount)) {
      this.currentCount = this.currentCount * 10 + i;
      this.currentSeconds = null;
    } else if ((obj = this.keyMap[key]) == null) {
      this.currentCount = 0;
    } else if (typeof obj === "object") {
      this.currentSeconds = obj;
      obj = null;
    } else {
      count = this.currentCount;
      this.currentCount = 0;
    }
    if (obj == null) { return ch.length === 1 && ch === key ? HandlerResult.Prevent : HandlerResult.Suppress; }
    this.commandHandler(obj, count || 1);
    return HandlerResult.Prevent;
  },
  resetKeys (): void {
    this.currentCount = 0; this.currentSeconds = null;
  },
  commandHandler (command: VisualModeNS.ValidActions, count: number): any {
    if (command > 50) {
      if (command > 60) {
        return VScroller.scrollBy(1, (command === 61 ? 1 : -1) * count, 0);
      }
      if (command === 53 && this.mode !== "caret") {
        const flag = this.selection.toString().length > 1;
        this.movement.collapseSelectionTo(+flag as 0 | 1);
      }
      return this.activate(1, { mode: ["visual", "line", "caret"][(command as number - 51) as 0 | 1 | 2] } as object as FgOptions);
    }
    this.mode === "caret" && this.movement.collapseSelectionTo(0);
    if (command >= 0) {
      this.movement.runMovements(((command as number) & 1) as 0 | 1, (command as number) >>> 1, count);
    } else {
      (command as (count: number) => any).call(this, count);
    }
    return this.mode === "caret" ? this.movement.extend(1)
    : this.mode === "line" ? this.movement.extendToLine() : 0;
  },
  establishInitialSelectionAnchor (): boolean {
    let node: Text | null, element: Element, str: string | undefined, offset: number;
    if (!VDom.isHTML()) { return true; }
    VDom.prepareCrop();
    const nodes = document.createTreeWalker(document.body || document.documentElement as HTMLElement, NodeFilter.SHOW_TEXT);
    while (node = nodes.nextNode() as Text | null) {
      if (50 <= (str = node.data).length && 50 < str.trim().length) {
        element = node.parentElement as Element;
        if (VDom.getVisibleClientRect(element) && !VDom.getEditableType(element)) {
          break;
        }
      }
    }
    if (!node) { return true; }
    offset = ((str as string).match(<RegExpOne>/^\s*/) as RegExpMatchArray)[0].length;
    this.selection.collapse(node, offset);
    return this.type() === "None";
  },
  prompt (text: string, duration: number): void {
    this.hudTimer && clearTimeout(this.hudTimer);
    this.hudTimer = setTimeout(this.ResetHUD, duration);
    return VHUD.show(text);
  },
  ResetHUD (): void {
    const _this = VVisualMode;
    if (!_this) { return; }
    _this.hudTimer = 0;
    if (_this.hud) { return VHUD.show(_this.hud); }
  },
  find (count: number, dir?: VisualModeNS.ForwardDir): void {
    if (!VFindMode.query) {
      VPort.send({ handler: "findQuery" }, function(query): void {
        if (query) {
          VFindMode.updateQuery(query);
          return VVisualMode.find(count, dir);
        } else {
          return VVisualMode.prompt("No history queries", 1000);
        }
      });
      return;
    }
    const range = this.selection.getRangeAt(0);
    VFindMode.execute(null, { noColor: true, dir, count });
    if (VFindMode.hasResults) {
      return this.mode === "caret" && this.selection.toString().length > 0 ? this.activate() : undefined;
    }
    this.selection.removeAllRanges();
    this.selection.addRange(range);
    return this.prompt("No matches for " + VFindMode.query, 1000);
  },
  yank (action?: true | ReuseType.current | ReuseType.newFg | null): void {
    const str = this.selection.toString();
    if (action === true) {
      this.prompt(VHUD.showCopied(str, "", true), 2000);
      action = null;
    } else {
      this.deactivate();
      action != null || VHUD.showCopied(str);
    }
    VPort.post(action != null ? { handler: "openUrl", url: str, reuse: action }
        : { handler: "copyToClipboard", data: str });
  },

movement: {
  D: ["backward", "forward"] as ["backward", "forward"],
  G: ["character", "line", "lineboundary", /*3*/ "paragraph", "sentence", "vimword", /*6*/ "word",
      "documentboundary"] as
     ["character", "line", "lineboundary", /*3*/ "paragraph", "sentence", "vimword", /*6*/ "word",
      "documentboundary"],
  alterMethod: "" as "move" | "extend",
  diOld: 0 as VisualModeNS.ForwardDir,
  diNew: 0 as VisualModeNS.ForwardDir,
  noExtend: false,
  selection: null as never as Selection,
  wordRe: null as never as RegExpOne,
  extend (d: VisualModeNS.ForwardDir): void | 1 {
    return this.selection.modify("extend", this.D[d], "character");
  },
  modify (d: VisualModeNS.ForwardDir, g: VisualModeNS.G): void | 1 {
    return this.selection.modify(this.alterMethod, this.D[d], this.G[g as 0 | 1 | 2]);
  },
  setDi (): VisualModeNS.ForwardDir { return this.diNew = this.getDirection(); },
  getNextForwardCharacter (isMove: boolean): string | null {
    const beforeText = this.selection.toString();
    if (beforeText.length > 0 && !this.getDirection(true)) {
      this.noExtend = true;
      return beforeText[0];
    }
    this.extend(1);
    const afterText = this.selection.toString();
    if (afterText.length !== beforeText.length || beforeText !== afterText) {
      this.noExtend = isMove;
      isMove && this.extend(0);
      return afterText[afterText.length - 1];
    }
    this.noExtend = false;
    return null;
  },
  runMovements (direction: VisualModeNS.ForwardDir, granularity: VisualModeNS.G | VisualModeNS.VimG, count: number): void {
    if (granularity === VisualModeNS.VimG.vimword || granularity === VisualModeNS.G.word) {
      if (direction) { return this.moveForwardByWord(granularity === VisualModeNS.VimG.vimword, count); }
      granularity = VisualModeNS.G.word;
    }
    let sel = this.selection, m = this.alterMethod, d = this.D[direction], g = this.G[granularity as 0 | 1 | 2];
    while (0 < count--) { sel.modify(m, d, g); }
  },
  moveForwardByWord (vimLike: boolean, count: number): void {
    let ch: string | null = null, isMove = this.alterMethod !== "extend";
    this.getDirection(); this.diNew = 1; this.noExtend = false;
    while (0 < count--) {
      do {
        if (this.noExtend && this.moveByChar(isMove)) { return; }
      } while ((ch = this.getNextForwardCharacter(isMove)) && vimLike === this.wordRe.test(ch));
      do {
        if (this.noExtend && this.moveByChar(isMove)) { return; }
      } while ((ch = this.getNextForwardCharacter(isMove)) && vimLike !== this.wordRe.test(ch));
    }
    // `ch &&` is needed according to tests for command `w`
    ch && !this.noExtend && this.extend(0);
  },
  hashSelection (): string {
    const range = this.selection.getRangeAt(0);
    return [this.selection.toString().length,
      range.anchorOffset, range.focusOffset,
      this.selection.extentOffset, this.selection.baseOffset
    ].join("/");
  },
  moveByChar (isMove: boolean): boolean {
    const before = isMove || this.hashSelection();
    this.modify(1, VisualModeNS.G.character);
    return isMove ? false : this.hashSelection() === before;
  },
  reverseSelection (): void {
    const el = VEventMode.lock(), direction = this.getDirection(true);
    if (el && !(el instanceof HTMLFormElement)
        && (VDom.editableTypes[el.nodeName.toLowerCase()] as EditableType) > EditableType.Embed) {
      let length = this.selection.toString().length;
      this.collapseSelectionTo(1);
      this.diNew = this.diOld = (1 - direction) as VisualModeNS.ForwardDir;
      while (0 < length--) { this.modify(this.diOld, 0); }
      return;
    }
    const original = this.selection.getRangeAt(0),
    str = direction ? "start" : "end";
    this.diNew = this.diOld = (1 - direction) as VisualModeNS.ForwardDir;
    this.collapse(this.diNew);
    this.selection.extend(original[(str + "Container") as "endContainer"], original[(str + "Offset") as "endOffset"]);
  },
  extendByOneCharacter (direction: VisualModeNS.ForwardDir): number {
    const length = this.selection.toString().length;
    this.extend(direction);
    return this.selection.toString().length - length;
  },
  getDirection (cache?: boolean): VisualModeNS.ForwardDir {
    let di: VisualModeNS.ForwardDir = 1, change: number;
    if (cache && this.diOld === this.diNew) { return this.diOld; }
    if (change = this.extendByOneCharacter(di) || this.extendByOneCharacter(di = 0)) {
      this.extend((1 - di) as VisualModeNS.ForwardDir);
    }
    return this.diOld = change > 0 ? di : change < 0 ? (1 - di) as VisualModeNS.ForwardDir : 1;
  },
  collapseSelectionTo (direction: VisualModeNS.ForwardDir) {
    this.selection.toString().length > 0 && this.collapse(this.getDirection() - direction);
  },
  collapse (toStart: number): void | 1 {
    return toStart ? this.selection.collapseToStart() : this.selection.collapseToEnd();
  },
  selectLexicalEntity (entity: VisualModeNS.G, count: number): void {
    this.collapseSelectionTo(1);
    entity === VisualModeNS.G.word && this.modify(1, VisualModeNS.G.character);
    this.modify(0, entity);
    this.collapseSelectionTo(1);
    return this.runMovements(1, entity, count);
  },
  selectLine (count: number): void | 1 {
    this.alterMethod = "extend";
    this.setDi() && this.reverseSelection();
    this.modify(0, VisualModeNS.G.lineboundary);
    this.reverseSelection();
    while (0 < --count) { this.modify(1, VisualModeNS.G.line); }
    this.modify(1, VisualModeNS.G.lineboundary);
    const ch = this.getNextForwardCharacter(false);
    if (ch && !this.noExtend && ch !== "\n") {
      return this.extend(0);
    }
  },
  extendToLine (): void {
    this.setDi();
    for (let i = 2; 0 < i--; ) {
      this.modify(this.diOld, VisualModeNS.G.lineboundary);
      this.reverseSelection();
    }
  },
  scrollIntoView (): void {
    if (VVisualMode.type() === "None") { return; }
    const focused = VDom.getElementWithFocus(this.selection, this.getDirection());
    if (focused) { return VScroller.scrollIntoView(focused); }
  },
},

keyMap: {
  l: 1, h: 0, j: 3, k: 2, e: 13, b: 12, w: 11, ")": 9, "(": 8, "}": 7, "{": 6,
  0: 4, $: 5, G: 15, g: { g: 14 }, B: 12, W: 11,
  v: 51, V: 52, c: 53,
  a: {
    w (count): void {
      return (this as typeof VVisualMode).movement.selectLexicalEntity(VisualModeNS.G.word, count);
    },
    s (count): void {
      return (this as typeof VVisualMode).movement.selectLexicalEntity(VisualModeNS.G.sentence, count);
    }
  },
  n (count): void { return (this as typeof VVisualMode).find(count, 1); },
  N (count): void { return (this as typeof VVisualMode).find(count, 0); },
  "/": function(): void | boolean {
    clearTimeout((this as typeof VVisualMode).hudTimer);
    VHUD.hide();
    return VFindMode.activate(1, { returnToViewport: true } as object as FgOptions);
  },
  y (): void { return (this as typeof VVisualMode).yank(); },
  Y (count): void { (this as typeof VVisualMode).movement.selectLine(count); return (this as typeof VVisualMode).yank(); },
  C (): void { return (this as typeof VVisualMode).yank(true); },
  p (): void { return (this as typeof VVisualMode).yank(0); },
  P (): void { return (this as typeof VVisualMode).yank(-1); },
  o (): void {
    (this as typeof VVisualMode).movement.setDi();
    return (this as typeof VVisualMode).movement.reverseSelection();
  },
  "<c-e>": 61, "<c-y>": 62, "<c-down>": 61, "<c-up>": 62
} as {
  [key: string]: VisualModeNS.ValidActions | {
    [key: string]: VisualModeNS.ValidActions;
  };
} as SafeDict<VisualModeNS.ValidActions | SafeDict<VisualModeNS.ValidActions>>,

init: function() {
  this.init = null as never;
  var map = this.keyMap, func = Object.setPrototypeOf, str =
"[_0-9A-Za-z\\xAA\\xB5\\xBA\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\
\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u0\
3F7-\\u0481\\u048A-\\u0527\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0620-\\u064A\\u066\
E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u0\
7A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0800-\\u0815\\u081A\\u0824\\u0828\\u0840-\\u0858\\u08A0\\u08A2-\\\
u08AC\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971-\\u0977\\u0979-\\u097F\\u0985-\\u098C\\u098F\\u0990\\u099\
3-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u\
0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\\
u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0A\
D0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u\
0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\\
u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C\
33\\u0C35-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\\
u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0CF1\\u0CF2\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D\\u0D4\
E\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\\
u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\
\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC-\\u0EDF\\u0F0\
0\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8C\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\\
u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10C7\\u10CD\\u10D0-\\u10FA\\u10FC-\\u1248\\u124A-\\u12\
4D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\
\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\\
u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u\
1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u18B0-\\u18F\
5\\u1900-\\u191C\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1A20-\\u1A54\\u1AA7\\\
u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1BBA-\\u1BE5\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u\
1C7D\\u1CE9-\\u1CEC\\u1CEE-\\u1CF1\\u1CF5\\u1CF6\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F4\
8-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\\
u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u20\
9C\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\\
u213F\\u2145-\\u2149\\u214E\\u2183\\u2184\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CEE\\u2CF2\\u2CF3\
\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\\
\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005\\u3006\\u3031-\\u3035\\u3\
03B\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31B\
A\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\\
uA62B\\uA640-\\uA66E\\uA67F-\\uA697\\uA6A0-\\uA6E5\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA793\\u\
A7A0-\\uA7AA\\uA7F8-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA\
8F7\\uA8FB\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9CF\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44\
-\\uAA4B\\uAA60-\\uAA76\\uAA7A\\uAA80-\\uAAAF\\uAAB1\\uAAB5\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADD\\uA\
AE0-\\uAAEA\\uAAF2-\\uAAF4\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uABC0-\\uAB\
E2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\
\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uF\
D50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFF\
BE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]";
  this.movement.wordRe = new RegExp(str);
  func(map, null); func(map.a, null); func(map.g, null);
}
};
