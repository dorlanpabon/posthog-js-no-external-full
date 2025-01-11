import { assignableWindow, document } from '../utils/globals';
import { logger } from '../utils/logger';
var loadScript = function (posthog, url, callback) {
    if (posthog.config.disable_external_dependency_loading) {
        logger.warn("".concat(url, " was requested but loading of external scripts is disabled."));
        return callback('Loading of external scripts is disabled');
    }
    var addScript = function () {
        var _a;
        if (!document) {
            return callback('document not found');
        }
        var scriptTag = document.createElement('script');
        scriptTag.type = 'text/javascript';
        scriptTag.crossOrigin = 'anonymous';
        scriptTag.src = url;
        scriptTag.onload = function (event) { return callback(undefined, event); };
        scriptTag.onerror = function (error) { return callback(error); };
        var scripts = document.querySelectorAll('body > script');
        if (scripts.length > 0) {
            (_a = scripts[0].parentNode) === null || _a === void 0 ? void 0 : _a.insertBefore(scriptTag, scripts[0]);
        }
        else {
            // In exceptional situations this call might load before the DOM is fully ready.
            document.body.appendChild(scriptTag);
        }
    };
    if (document === null || document === void 0 ? void 0 : document.body) {
        addScript();
    }
    else {
        document === null || document === void 0 ? void 0 : document.addEventListener('DOMContentLoaded', addScript);
    }
};
assignableWindow.__PosthogExtensions__ = assignableWindow.__PosthogExtensions__ || {};
assignableWindow.__PosthogExtensions__.loadExternalDependency = function (posthog, kind, callback) {
    var scriptUrlToLoad = "/static/".concat(kind, ".js") + "?v=".concat(posthog.version);
    if (kind === 'toolbar') {
        // toolbar.js is served from the PostHog CDN, this has a TTL of 24 hours.
        // the toolbar asset includes a rotating "token" that is valid for 5 minutes.
        var fiveMinutesInMillis = 5 * 60 * 1000;
        // this ensures that we bust the cache periodically
        var timestampToNearestFiveMinutes = Math.floor(Date.now() / fiveMinutesInMillis) * fiveMinutesInMillis;
        scriptUrlToLoad = "".concat(scriptUrlToLoad, "?&=").concat(timestampToNearestFiveMinutes);
    }
    var url = posthog.requestRouter.endpointFor('assets', scriptUrlToLoad);
    loadScript(posthog, url, callback);
};
assignableWindow.__PosthogExtensions__.loadSiteApp = function (posthog, url, callback) {
    var scriptUrl = posthog.requestRouter.endpointFor('api', url);
    loadScript(posthog, scriptUrl, callback);
};
//# sourceMappingURL=external-scripts-loader.js.map