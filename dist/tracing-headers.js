!function(){"use strict";function t(t,e,n){try{if(!(e in t))return()=>{};const o=t[e],s=n(o);return"function"==typeof s&&(s.prototype=s.prototype||{},Object.defineProperties(s,{__posthog_wrapped__:{enumerable:!1,value:!0}})),t[e]=s,()=>{t[e]=o}}catch{return()=>{}}}const e="undefined"!=typeof window?window:void 0,n="undefined"!=typeof globalThis?globalThis:e,o=null==n?void 0:n.navigator;null==n||n.document,null==n||n.location,null==n||n.fetch,null!=n&&n.XMLHttpRequest&&"withCredentials"in new n.XMLHttpRequest&&n.XMLHttpRequest,null==n||n.AbortController,null==o||o.userAgent;const s=null!=e?e:{},i=(t,e)=>{const{sessionId:n,windowId:o}=t.checkAndGetSessionAndWindowId(!0);e.headers.set("X-POSTHOG-SESSION-ID",n),e.headers.set("X-POSTHOG-WINDOW-ID",o)};s.__PosthogExtensions__=s.__PosthogExtensions__||{};const l={_patchFetch:n=>t(e,"fetch",(t=>async function(e,o){const s=new Request(e,o);return i(n,s),t(s)})),_patchXHR:n=>t(e.XMLHttpRequest.prototype,"open",(t=>function(e,o){let s=!(arguments.length>2&&void 0!==arguments[2])||arguments[2],l=arguments.length>3?arguments[3]:void 0,r=arguments.length>4?arguments[4]:void 0;const u=new Request(o);return i(n,u),t.call(this,e,u.url,s,l,r)}))};s.__PosthogExtensions__.tracingHeadersPatchFns=l,s.postHogTracingHeadersPatchFns=l}();
//# sourceMappingURL=tracing-headers.js.map
