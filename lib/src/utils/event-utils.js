var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
import { getQueryParam, convertToURL } from './request-utils';
import { isNull } from './type-utils';
import Config from '../config';
import { each, extend, stripEmptyProperties, stripLeadingDollar } from './index';
import { document, location, userAgent, window } from './globals';
import { detectBrowser, detectBrowserVersion, detectDevice, detectDeviceType, detectOS } from './user-agent-utils';
var URL_REGEX_PREFIX = 'https?://(.*)';
// Should be kept in sync with https://github.com/PostHog/posthog/blob/master/plugin-server/src/utils/db/utils.ts#L60
export var CAMPAIGN_PARAMS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'gclid', // google ads
    'gad_source', // google ads
    'gclsrc', // google ads 360
    'dclid', // google display ads
    'gbraid', // google ads, web to app
    'wbraid', // google ads, app to web
    'fbclid', // facebook
    'msclkid', // microsoft
    'twclid', // twitter
    'li_fat_id', // linkedin
    'mc_cid', // mailchimp campaign id
    'igshid', // instagram
    'ttclid', // tiktok
    'rdt_cid', // reddit
];
export var Info = {
    campaignParams: function (customParams) {
        if (!document) {
            return {};
        }
        return this._campaignParamsFromUrl(document.URL, customParams);
    },
    _campaignParamsFromUrl: function (url, customParams) {
        var campaign_keywords = CAMPAIGN_PARAMS.concat(customParams || []);
        var params = {};
        each(campaign_keywords, function (kwkey) {
            var kw = getQueryParam(url, kwkey);
            params[kwkey] = kw ? kw : null;
        });
        return params;
    },
    _searchEngine: function (referrer) {
        if (!referrer) {
            return null;
        }
        else {
            if (referrer.search(URL_REGEX_PREFIX + 'google.([^/?]*)') === 0) {
                return 'google';
            }
            else if (referrer.search(URL_REGEX_PREFIX + 'bing.com') === 0) {
                return 'bing';
            }
            else if (referrer.search(URL_REGEX_PREFIX + 'yahoo.com') === 0) {
                return 'yahoo';
            }
            else if (referrer.search(URL_REGEX_PREFIX + 'duckduckgo.com') === 0) {
                return 'duckduckgo';
            }
            else {
                return null;
            }
        }
    },
    _searchInfoFromReferrer: function (referrer) {
        var search = Info._searchEngine(referrer);
        var param = search != 'yahoo' ? 'q' : 'p';
        var ret = {};
        if (!isNull(search)) {
            ret['$search_engine'] = search;
            var keyword = document ? getQueryParam(document.referrer, param) : '';
            if (keyword.length) {
                ret['ph_keyword'] = keyword;
            }
        }
        return ret;
    },
    searchInfo: function () {
        var referrer = document === null || document === void 0 ? void 0 : document.referrer;
        if (!referrer) {
            return {};
        }
        return this._searchInfoFromReferrer(referrer);
    },
    /**
     * This function detects which browser is running this script.
     * The order of the checks are important since many user agents
     * include keywords used in later checks.
     */
    browser: detectBrowser,
    /**
     * This function detects which browser version is running this script,
     * parsing major and minor version (e.g., 42.1). User agent strings from:
     * http://www.useragentstring.com/pages/useragentstring.php
     *
     * `navigator.vendor` is passed in and used to help with detecting certain browsers
     * NB `navigator.vendor` is deprecated and not present in every browser
     */
    browserVersion: detectBrowserVersion,
    browserLanguage: function () {
        return (navigator.language || // Any modern browser
            navigator.userLanguage // IE11
        );
    },
    os: detectOS,
    device: detectDevice,
    deviceType: detectDeviceType,
    referrer: function () {
        return (document === null || document === void 0 ? void 0 : document.referrer) || '$direct';
    },
    referringDomain: function () {
        var _a;
        if (!(document === null || document === void 0 ? void 0 : document.referrer)) {
            return '$direct';
        }
        return ((_a = convertToURL(document.referrer)) === null || _a === void 0 ? void 0 : _a.host) || '$direct';
    },
    referrerInfo: function () {
        return {
            $referrer: this.referrer(),
            $referring_domain: this.referringDomain(),
        };
    },
    initialPersonInfo: function () {
        // we're being a bit more economical with bytes here because this is stored in the cookie
        return {
            r: this.referrer(),
            u: location === null || location === void 0 ? void 0 : location.href,
        };
    },
    initialPersonPropsFromInfo: function (info) {
        var _a;
        var initial_referrer = info.r, initial_current_url = info.u;
        var referring_domain = initial_referrer == null
            ? undefined
            : initial_referrer == '$direct'
                ? '$direct'
                : (_a = convertToURL(initial_referrer)) === null || _a === void 0 ? void 0 : _a.host;
        var props = {
            $initial_referrer: initial_referrer,
            $initial_referring_domain: referring_domain,
        };
        if (initial_current_url) {
            props['$initial_current_url'] = initial_current_url;
            var location_1 = convertToURL(initial_current_url);
            props['$initial_host'] = location_1 === null || location_1 === void 0 ? void 0 : location_1.host;
            props['$initial_pathname'] = location_1 === null || location_1 === void 0 ? void 0 : location_1.pathname;
            var campaignParams = this._campaignParamsFromUrl(initial_current_url);
            each(campaignParams, function (v, k) {
                props['$initial_' + stripLeadingDollar(k)] = v;
            });
        }
        if (initial_referrer) {
            var searchInfo = this._searchInfoFromReferrer(initial_referrer);
            each(searchInfo, function (v, k) {
                props['$initial_' + stripLeadingDollar(k)] = v;
            });
        }
        return props;
    },
    properties: function () {
        if (!userAgent) {
            return {};
        }
        var _a = __read(Info.os(userAgent), 2), os_name = _a[0], os_version = _a[1];
        return extend(stripEmptyProperties({
            $os: os_name,
            $os_version: os_version,
            $browser: Info.browser(userAgent, navigator.vendor),
            $device: Info.device(userAgent),
            $device_type: Info.deviceType(userAgent),
        }), {
            $current_url: location === null || location === void 0 ? void 0 : location.href,
            $host: location === null || location === void 0 ? void 0 : location.host,
            $pathname: location === null || location === void 0 ? void 0 : location.pathname,
            $raw_user_agent: userAgent.length > 1000 ? userAgent.substring(0, 997) + '...' : userAgent,
            $browser_version: Info.browserVersion(userAgent, navigator.vendor),
            $browser_language: Info.browserLanguage(),
            $screen_height: window === null || window === void 0 ? void 0 : window.screen.height,
            $screen_width: window === null || window === void 0 ? void 0 : window.screen.width,
            $viewport_height: window === null || window === void 0 ? void 0 : window.innerHeight,
            $viewport_width: window === null || window === void 0 ? void 0 : window.innerWidth,
            $lib: 'web',
            $lib_version: Config.LIB_VERSION,
            $insert_id: Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10),
            $time: Date.now() / 1000, // epoch time in seconds
        });
    },
    people_properties: function () {
        if (!userAgent) {
            return {};
        }
        var _a = __read(Info.os(userAgent), 2), os_name = _a[0], os_version = _a[1];
        return extend(stripEmptyProperties({
            $os: os_name,
            $os_version: os_version,
            $browser: Info.browser(userAgent, navigator.vendor),
        }), {
            $browser_version: Info.browserVersion(userAgent, navigator.vendor),
        });
    },
};
//# sourceMappingURL=event-utils.js.map