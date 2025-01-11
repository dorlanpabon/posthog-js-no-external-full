import { assignableWindow } from '../utils/globals';
import { logger } from '../utils/logger';
assignableWindow.__PosthogExtensions__ = assignableWindow.__PosthogExtensions__ || {};
assignableWindow.__PosthogExtensions__.loadExternalDependency = function (posthog, kind, callback) {
    logger.warn('loadExternalDependency is not supported in this environment for kind: ' + kind);
    return false;
};
assignableWindow.__PosthogExtensions__.loadSiteApp = function (posthog, url, callback) {
    logger.warn('loadSiteApp is not supported in this environment for url: ' + url);
    return false;
};
//# sourceMappingURL=external-scripts-loader.js.map