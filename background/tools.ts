const Clipboard = {
  getTextArea (): HTMLTextAreaElement {
    const el = document.createElement("textarea");
    el.style.position = "absolute";
    el.style.left = "-99px";
    el.style.width = "0";
    this.getTextArea = function() { return el; };
    return el;
  },
  tailSpacesRe: <RegExpG & RegExpSearchable<0>> /[ \t]+\n/g,
  format (data: string): string {
    data = data.replace(Utils.A0Re, " ").replace(this.tailSpacesRe, "\n");
    let i = data.charCodeAt(data.length - 1);
    if (i !== 32 && i !== 9) {
    } else if (i = data.lastIndexOf('\n') + 1) {
      data = data.substring(0, i) + data.substring(i).trimRight();
    } else if ((i = data.charCodeAt(0)) !== 32 && i !== 9) {
      data = data.trimRight();
    }
    return data;
  },
  copy (data: string): void {
    data = this.format(data);
    const textArea = this.getTextArea();
    textArea.value = data;
    (document.documentElement as HTMLHtmlElement).appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
    textArea.value = "";
    Utils.resetRe();
  },
  paste (): string | null {
    if (!Settings.CONST.AllowClipboardRead) { return null; }
    const textArea = this.getTextArea();
    (document.documentElement as HTMLHtmlElement).appendChild(textArea);
    textArea.focus();
    document.execCommand("paste");
    let value = textArea.value;
    textArea.remove();
    textArea.value = "";
    value = value.replace(Utils.A0Re, " ");
    Utils.resetRe();
    return value;
  }
},
Marks = { // NOTE: all members should be static
  createMark (this: void, request: MarksNS.BaseMark | MarksNS.Mark, port: Port): void {
    let tabId = port.sender.tabId;
    if ((request as MarksNS.Mark).scroll) {
      localStorage.setItem(Marks.getLocationKey(request.markName), JSON.stringify({
        tabId,
        url: (request as MarksNS.Mark).url,
        scroll: (request as MarksNS.Mark).scroll
      } as MarksNS.StoredMark));
      return;
    }
    (port = Settings.indexPorts(tabId, 0) || port) && port.postMessage({
      name: "createMark",
      markName: request.markName,
    });
  },
  gotoMark (this: void, request: MarksNS.FgQuery): boolean {
    const str = localStorage.getItem(Marks.getLocationKey(request.markName));
    if (!str) {
      return false;
    }
    const markInfo: MarksNS.MarkToGo & MarksNS.StoredMark = JSON.parse(str) as MarksNS.StoredMark;
    markInfo.markName = request.markName;
    markInfo.prefix = request.prefix !== false && markInfo.scroll[1] === 0 && markInfo.scroll[0] === 0 &&
        !!Utils.IsURLHttp(markInfo.url);
    if (Settings.indexPorts(markInfo.tabId)) {
      chrome.tabs.get(markInfo.tabId, Marks.checkTab.bind(markInfo));
    } else {
      g_requestHandlers.focusOrLaunch(markInfo);
    }
    return true;
  },
  checkTab (this: MarksNS.MarkToGo, tab: chrome.tabs.Tab): void {
    const url = tab.url.split("#", 1)[0];
    if (url === this.url || this.prefix && this.url.startsWith(url)) {
      g_requestHandlers.gotoSession({ sessionId: tab.id });
      return Marks.scrollTab(this, tab);
    } else {
      return g_requestHandlers.focusOrLaunch(this);
    }
  },
  getLocationKey (this: void, keyChar: string): string {
    return "vimiumGlobalMark|" + keyChar;
  },
  scrollTab (this: void, markInfo: MarksNS.MarkToGo, tab: chrome.tabs.Tab): void {
    const tabId = tab.id, port = Settings.indexPorts(tabId, 0);
    port && port.postMessage({
      name: "scroll",
      scroll: markInfo.scroll,
      markName: markInfo.markName
    });
    if (markInfo.tabId !== tabId && markInfo.markName) {
      localStorage.setItem(Marks.getLocationKey(markInfo.markName), JSON.stringify({
        tabId,
        url: markInfo.url,
        scroll: markInfo.scroll
      } as MarksNS.StoredMark));
    }
  },
  clearGlobal (this: void): void {
    const key_start = Marks.getLocationKey(""), storage = localStorage;
    let key: string, i: number;
    for (i = storage.length; 0 <= --i; ) {
      key = storage.key(i) as string;
      if (key.startsWith(key_start)) {
        storage.removeItem(key);
      }
    }
    return g_requestHandlers.ShowHUD("Global marks have been cleared.");
  }
},
FindModeHistory = {
  key: "findModeRawQueryList" as "findModeRawQueryList",
  max: 50,
  list: null as string[] | null,
  listI: null as string[] | null,
  timer: 0,
  init (): void {
    const str: string = Settings.get(this.key);
    this.list = str ? str.split("\n") : [];
    this.init = null as never;
  },
  initI (): string[] {
    const list = this.listI = (this.list as string[]).slice(0);
    chrome.windows.onRemoved.addListener(this.OnWndRemvoed);
    return list;
  },
  query (incognito: boolean, query?: string, index?: number): string | void {
    this.init && this.init();
    const list = incognito ? this.listI || this.initI() : (this.list as string[]);
    if (!query) {
      return list[list.length - (index || 1)] || "";
    }
    if (incognito) {
      return this.refreshIn(query, list, true);
    }
    const str = this.refreshIn(query, list);
    str && Settings.set(this.key, str);
    if (this.listI) { return this.refreshIn(query, this.listI, true); }
  },
  refreshIn: function (this: any, query: string, list: string[], skipResult?: boolean): string | void {
    const ind = list.lastIndexOf(query);
    if (ind >= 0) {
      if (ind === list.length - 1) { return; }
      list.splice(ind, 1);
    }
    else if (list.length >= (this as typeof FindModeHistory).max) { list.shift(); }
    list.push(query);
    if (!skipResult) {
      return list.join("\n");
    }
  } as {
    (query: string, list: string[], skipResult?: false): string | void;
    (query: string, list: string[], skipResult: true): void;
  },
  removeAll (incognito: boolean): void {
    if (incognito) {
      this.listI && (this.listI = []);
      return;
    }
    this.init = null as never;
    this.list = [];
    Settings.set(this.key, "");
  },
  OnWndRemvoed (this: void): void {
    const _this = FindModeHistory;
    if (!_this.listI) { return; }
    _this.timer = _this.timer || setTimeout(_this.TestIncognitoWnd, 34);
  },
  TestIncognitoWnd (this: void): void {
    FindModeHistory.timer = 0;
    let left = false, arr = Settings.indexPorts();
    for (let i in arr) {
      let port = (arr[i] as Frames.Frames)[0];
      if (port.sender.incognito) { left = true; break; }
    }
    if (!left) { return FindModeHistory.cleanI(); }
    if (Settings.CONST.ChromeVersion >= BrowserVer.MinNoUnmatchedIncognito) { return; }
    chrome.windows.getAll(function(wnds): void {
      wnds.some(function(wnd) { return wnd.incognito; }) || FindModeHistory.cleanI();
    });
  },
  cleanI (): void {
    this.listI = null;
    chrome.windows.onRemoved.removeListener(this.OnWndRemvoed);
  }
},
TabRecency = {
  tabs: null as never as SafeDict<number>,
  last (this: void): number { return GlobalConsts.TabIdNone; },
  rCompare: null as never as (a: {id: number}, b: {id: number}) => number,
};

setTimeout(function() {
  const cache = Object.create<number>(null);
  let last = GlobalConsts.TabIdNone, stamp = 1, time = 0;
  function clean(): void {
    const ref = cache;
    for (let i in ref) {
      if ((ref[i] as number) <= 896) { delete ref[i]; }
      else { (ref as EnsuredSafeDict<number>)[i] -= 895; }
    }
    stamp = 128;
  }
  function listener({ tabId }: { tabId: number }): void {
    const now = Date.now();
    if (now - time > 500) {
      cache[last] = ++stamp;
      if (stamp === 1023) { clean(); }
    }
    last = tabId; time = now;
  };
  chrome.tabs.onActivated.addListener(listener);
  chrome.windows.onFocusChanged.addListener(function(windowId): void {
    if (windowId === chrome.windows.WINDOW_ID_NONE) { return; }
    chrome.tabs.query({windowId, active: true}, function(tabs) {
      if (tabs[0]) { return listener({ tabId: tabs[0].id }); }
    });
  });
  chrome.tabs.query({currentWindow: true, active: true}, function(tabs: CurrentTabs): void {
    time = Date.now();
    if (chrome.runtime.lastError) { return chrome.runtime.lastError; }
    last = tabs[0] ? tabs[0].id : (chrome.tabs.TAB_ID_NONE || GlobalConsts.TabIdNone);
  });
  TabRecency.tabs = cache;
  TabRecency.last = function() { return last; };
  TabRecency.rCompare = function(a, b): number {
    return (cache[b.id] as number) - (cache[a.id] as number);
  };
}, 120);
