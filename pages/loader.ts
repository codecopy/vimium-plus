/// <reference path="../types/base/index.d.ts" />
/// <reference path="../types/lib/index.d.ts" />
chrome.runtime.getManifest && (function() {
  let loader = document.currentScript as HTMLScriptElement;
  const head = loader.parentElement as HTMLElement
    , prefix = chrome.runtime.getURL("")
    , arr = chrome.runtime.getManifest().content_scripts[0].js;
  arr.pop();
  for (const src of arr) {
    const scriptElement = document.createElement("script");
    scriptElement.async = false;
    scriptElement.defer = true;
    scriptElement.src = src[0] === "/" ? src : src.lastIndexOf(prefix, 0) === 0 ? src : "/" + src;
    head.replaceChild(scriptElement, loader);
    loader = scriptElement;
  }
  loader.remove();
})();
