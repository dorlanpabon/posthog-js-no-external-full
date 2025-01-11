var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import Config from './config';
import { _copyAndTruncateStrings, each, eachArray, extend, includes, registerEvent, safewrapClass, isCrossDomainCookie, isDistinctIdStringLike, } from './utils';
import { assignableWindow, document, location, navigator, userAgent, window } from './utils/globals';
import { PostHogFeatureFlags } from './posthog-featureflags';
import { PostHogPersistence } from './posthog-persistence';
import { ALIAS_ID_KEY, FLAG_CALL_REPORTED, PEOPLE_DISTINCT_ID_KEY, USER_STATE, ENABLE_PERSON_PROCESSING, } from './constants';
import { SessionRecording } from './extensions/replay/sessionrecording';
import { Decide } from './decide';
import { Toolbar } from './extensions/toolbar';
import { localStore } from './storage';
import { RequestQueue } from './request-queue';
import { RetryQueue } from './retry-queue';
import { SessionIdManager } from './sessionid';
import { RequestRouter, RequestRouterRegion } from './utils/request-router';
import { Compression, } from './types';
import { SentryIntegration, sentryIntegration } from './extensions/sentry-integration';
import { setupSegmentIntegration } from './extensions/segment-integration';
import { PageViewManager } from './page-view';
import { PostHogSurveys } from './posthog-surveys';
import { RateLimiter } from './rate-limiter';
import { uuidv7 } from './uuidv7';
import { isArray, isBoolean, isEmptyObject, isEmptyString, isFunction, isNumber, isObject, isString, isUndefined, } from './utils/type-utils';
import { Info } from './utils/event-utils';
import { logger } from './utils/logger';
import { SessionPropsManager } from './session-props';
import { isLikelyBot } from './utils/blocked-uas';
import { extendURLParams, request, SUPPORTS_REQUEST } from './request';
import { Heatmaps } from './heatmaps';
import { ScrollManager } from './scroll-manager';
import { SimpleEventEmitter } from './utils/simple-event-emitter';
import { Autocapture } from './autocapture';
import { TracingHeaders } from './extensions/tracing-headers';
import { ConsentManager } from './consent';
import { ExceptionObserver } from './extensions/exception-autocapture';
import { WebVitalsAutocapture } from './extensions/web-vitals';
import { WebExperiments } from './web-experiments';
import { PostHogExceptions } from './posthog-exceptions';
var instances = {};
// some globals for comparisons
var __NOOP = function () { };
var PRIMARY_INSTANCE_NAME = 'posthog';
/*
 * Dynamic... constants? Is that an oxymoron?
 */
// http://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/
// https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest#withCredentials
// IE<10 does not support cross-origin XHR's but script tags
// with defer won't block window.onload; ENQUEUE_REQUESTS
// should only be true for Opera<12
var ENQUEUE_REQUESTS = !SUPPORTS_REQUEST && (userAgent === null || userAgent === void 0 ? void 0 : userAgent.indexOf('MSIE')) === -1 && (userAgent === null || userAgent === void 0 ? void 0 : userAgent.indexOf('Mozilla')) === -1;
export var defaultConfig = function () {
    var _a;
    return ({
        api_host: 'https://us.i.posthog.com',
        ui_host: null,
        token: '',
        autocapture: true,
        rageclick: true,
        cross_subdomain_cookie: isCrossDomainCookie(document === null || document === void 0 ? void 0 : document.location),
        persistence: 'localStorage+cookie', // up to 1.92.0 this was 'cookie'. It's easy to migrate as 'localStorage+cookie' will migrate data from cookie storage
        persistence_name: '',
        loaded: __NOOP,
        store_google: true,
        custom_campaign_params: [],
        custom_blocked_useragents: [],
        save_referrer: true,
        capture_pageview: true,
        capture_pageleave: 'if_capture_pageview', // We'll only capture pageleave events if capture_pageview is also true
        debug: (location && isString(location === null || location === void 0 ? void 0 : location.search) && location.search.indexOf('__posthog_debug=true') !== -1) || false,
        verbose: false,
        cookie_expiration: 365,
        upgrade: false,
        disable_session_recording: false,
        disable_persistence: false,
        disable_web_experiments: true, // disabled in beta.
        disable_surveys: false,
        enable_recording_console_log: undefined, // When undefined, it falls back to the server-side setting
        secure_cookie: ((_a = window === null || window === void 0 ? void 0 : window.location) === null || _a === void 0 ? void 0 : _a.protocol) === 'https:',
        ip: true,
        opt_out_capturing_by_default: false,
        opt_out_persistence_by_default: false,
        opt_out_useragent_filter: false,
        opt_out_capturing_persistence_type: 'localStorage',
        opt_out_capturing_cookie_prefix: null,
        opt_in_site_apps: false,
        property_denylist: [],
        respect_dnt: false,
        sanitize_properties: null,
        request_headers: {}, // { header: value, header2: value }
        inapp_protocol: '//',
        inapp_link_new_window: false,
        request_batching: true,
        properties_string_max_length: 65535,
        session_recording: {},
        mask_all_element_attributes: false,
        mask_all_text: false,
        advanced_disable_decide: false,
        advanced_disable_feature_flags: false,
        advanced_disable_feature_flags_on_first_load: false,
        advanced_disable_toolbar_metrics: false,
        feature_flag_request_timeout_ms: 3000,
        on_request_error: function (res) {
            var error = 'Bad HTTP status: ' + res.statusCode + ' ' + res.text;
            logger.error(error);
        },
        get_device_id: function (uuid) { return uuid; },
        // Used for internal testing
        _onCapture: __NOOP,
        capture_performance: undefined,
        name: 'posthog',
        bootstrap: {},
        disable_compression: false,
        session_idle_timeout_seconds: 30 * 60, // 30 minutes
        person_profiles: 'always',
        __add_tracing_headers: false,
    });
};
export var configRenames = function (origConfig) {
    var renames = {};
    if (!isUndefined(origConfig.process_person)) {
        renames.person_profiles = origConfig.process_person;
    }
    if (!isUndefined(origConfig.xhr_headers)) {
        renames.request_headers = origConfig.xhr_headers;
    }
    if (!isUndefined(origConfig.cookie_name)) {
        renames.persistence_name = origConfig.cookie_name;
    }
    if (!isUndefined(origConfig.disable_cookie)) {
        renames.disable_persistence = origConfig.disable_cookie;
    }
    // on_xhr_error is not present, as the type is different to on_request_error
    // the original config takes priority over the renames
    var newConfig = extend({}, renames, origConfig);
    // merge property_blacklist into property_denylist
    if (isArray(origConfig.property_blacklist)) {
        if (isUndefined(origConfig.property_denylist)) {
            newConfig.property_denylist = origConfig.property_blacklist;
        }
        else if (isArray(origConfig.property_denylist)) {
            newConfig.property_denylist = __spreadArray(__spreadArray([], __read(origConfig.property_blacklist), false), __read(origConfig.property_denylist), false);
        }
        else {
            logger.error('Invalid value for property_denylist config: ' + origConfig.property_denylist);
        }
    }
    return newConfig;
};
var DeprecatedWebPerformanceObserver = /** @class */ (function () {
    function DeprecatedWebPerformanceObserver() {
        this.__forceAllowLocalhost = false;
    }
    Object.defineProperty(DeprecatedWebPerformanceObserver.prototype, "_forceAllowLocalhost", {
        get: function () {
            return this.__forceAllowLocalhost;
        },
        set: function (value) {
            logger.error('WebPerformanceObserver is deprecated and has no impact on network capture. Use `_forceAllowLocalhostNetworkCapture` on `posthog.sessionRecording`');
            this.__forceAllowLocalhost = value;
        },
        enumerable: false,
        configurable: true
    });
    return DeprecatedWebPerformanceObserver;
}());
/**
 * PostHog Library Object
 * @constructor
 */
var PostHog = /** @class */ (function () {
    function PostHog() {
        var _this = this;
        this.webPerformance = new DeprecatedWebPerformanceObserver();
        this.version = Config.LIB_VERSION;
        this._internalEventEmitter = new SimpleEventEmitter();
        this.config = defaultConfig();
        this.decideEndpointWasHit = false;
        this.SentryIntegration = SentryIntegration;
        this.sentryIntegration = function (options) { return sentryIntegration(_this, options); };
        this.__request_queue = [];
        this.__loaded = false;
        this.analyticsDefaultEndpoint = '/e/';
        this._initialPageviewCaptured = false;
        this.featureFlags = new PostHogFeatureFlags(this);
        this.toolbar = new Toolbar(this);
        this.scrollManager = new ScrollManager(this);
        this.pageViewManager = new PageViewManager(this);
        this.surveys = new PostHogSurveys(this);
        this.experiments = new WebExperiments(this);
        this.exceptions = new PostHogExceptions(this);
        this.rateLimiter = new RateLimiter(this);
        this.requestRouter = new RequestRouter(this);
        this.consent = new ConsentManager(this);
        // NOTE: See the property definition for deprecation notice
        this.people = {
            set: function (prop, to, callback) {
                var _a;
                var setProps = isString(prop) ? (_a = {}, _a[prop] = to, _a) : prop;
                _this.setPersonProperties(setProps);
                callback === null || callback === void 0 ? void 0 : callback({});
            },
            set_once: function (prop, to, callback) {
                var _a;
                var setProps = isString(prop) ? (_a = {}, _a[prop] = to, _a) : prop;
                _this.setPersonProperties(undefined, setProps);
                callback === null || callback === void 0 ? void 0 : callback({});
            },
        };
        this.on('eventCaptured', function (data) { return logger.info("send \"".concat(data === null || data === void 0 ? void 0 : data.event, "\""), data); });
    }
    // Initialization methods
    /**
     * This function initializes a new instance of the PostHog capturing object.
     * All new instances are added to the main posthog object as sub properties (such as
     * posthog.library_name) and also returned by this function. To define a
     * second instance on the page, you would call:
     *
     *     posthog.init('new token', { your: 'config' }, 'library_name');
     *
     * and use it like so:
     *
     *     posthog.library_name.capture(...);
     *
     * @param {String} token   Your PostHog API token
     * @param {Object} [config]  A dictionary of config options to override. <a href="https://github.com/posthog/posthog-js/blob/6e0e873/src/posthog-core.js#L57-L91">See a list of default config options</a>.
     * @param {String} [name]    The name for the new posthog instance that you want created
     */
    PostHog.prototype.init = function (token, config, name) {
        var _a;
        if (!name || name === PRIMARY_INSTANCE_NAME) {
            // This means we are initializing the primary instance (i.e. this)
            return this._init(token, config, name);
        }
        else {
            var namedPosthog = (_a = instances[name]) !== null && _a !== void 0 ? _a : new PostHog();
            namedPosthog._init(token, config, name);
            instances[name] = namedPosthog;
            instances[PRIMARY_INSTANCE_NAME][name] = namedPosthog;
            return namedPosthog;
        }
    };
    // posthog._init(token:string, config:object, name:string)
    //
    // This function sets up the current instance of the posthog
    // library.  The difference between this method and the init(...)
    // method is this one initializes the actual instance, whereas the
    // init(...) method sets up a new library and calls _init on it.
    //
    // Note that there are operations that can be asynchronous, so we
    // accept a callback that is called when all the asynchronous work
    // is done. Note that we do not use promises because we want to be
    // IE11 compatible. We could use polyfills, which would make the
    // code a bit cleaner, but will add some overhead.
    //
    PostHog.prototype._init = function (token, config, name) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f;
        if (config === void 0) { config = {}; }
        if (isUndefined(token) || isEmptyString(token)) {
            logger.critical('PostHog was initialized without a token. This likely indicates a misconfiguration. Please check the first argument passed to posthog.init()');
            return this;
        }
        if (this.__loaded) {
            logger.warn('You have already initialized PostHog! Re-initializing is a no-op');
            return this;
        }
        this.__loaded = true;
        this.config = {}; // will be set right below
        this._triggered_notifs = [];
        this.set_config(extend({}, defaultConfig(), configRenames(config), {
            name: name,
            token: token,
        }));
        if (this.config.on_xhr_error) {
            logger.error('[posthog] on_xhr_error is deprecated. Use on_request_error instead');
        }
        this.compression = config.disable_compression ? undefined : Compression.GZipJS;
        this.persistence = new PostHogPersistence(this.config);
        this.sessionPersistence =
            this.config.persistence === 'sessionStorage'
                ? this.persistence
                : new PostHogPersistence(__assign(__assign({}, this.config), { persistence: 'sessionStorage' }));
        var initialPersistenceProps = __assign({}, this.persistence.props);
        var initialSessionProps = __assign({}, this.sessionPersistence.props);
        this._requestQueue = new RequestQueue(function (req) { return _this._send_retriable_request(req); });
        this._retryQueue = new RetryQueue(this);
        this.__request_queue = [];
        this.sessionManager = new SessionIdManager(this.config, this.persistence);
        this.sessionPropsManager = new SessionPropsManager(this.sessionManager, this.persistence);
        new TracingHeaders(this).startIfEnabledOrStop();
        this.sessionRecording = new SessionRecording(this);
        this.sessionRecording.startIfEnabledOrStop();
        if (!this.config.disable_scroll_properties) {
            this.scrollManager.startMeasuringScrollPosition();
        }
        this.autocapture = new Autocapture(this);
        this.autocapture.startIfEnabled();
        this.surveys.loadIfEnabled();
        this.heatmaps = new Heatmaps(this);
        this.heatmaps.startIfEnabled();
        this.webVitalsAutocapture = new WebVitalsAutocapture(this);
        this.exceptionObserver = new ExceptionObserver(this);
        this.exceptionObserver.startIfEnabled();
        // if any instance on the page has debug = true, we set the
        // global debug to be true
        Config.DEBUG = Config.DEBUG || this.config.debug;
        if (Config.DEBUG) {
            logger.info('Starting in debug mode', {
                this: this,
                config: config,
                thisC: __assign({}, this.config),
                p: initialPersistenceProps,
                s: initialSessionProps,
            });
        }
        this._sync_opt_out_with_persistence();
        // isUndefined doesn't provide typehint here so wouldn't reduce bundle as we'd need to assign
        // eslint-disable-next-line posthog-js/no-direct-undefined-check
        if (((_a = config.bootstrap) === null || _a === void 0 ? void 0 : _a.distinctID) !== undefined) {
            var uuid = this.config.get_device_id(uuidv7());
            var deviceID = ((_b = config.bootstrap) === null || _b === void 0 ? void 0 : _b.isIdentifiedID) ? uuid : config.bootstrap.distinctID;
            this.persistence.set_property(USER_STATE, ((_c = config.bootstrap) === null || _c === void 0 ? void 0 : _c.isIdentifiedID) ? 'identified' : 'anonymous');
            this.register({
                distinct_id: config.bootstrap.distinctID,
                $device_id: deviceID,
            });
        }
        if (this._hasBootstrappedFeatureFlags()) {
            var activeFlags_1 = Object.keys(((_d = config.bootstrap) === null || _d === void 0 ? void 0 : _d.featureFlags) || {})
                .filter(function (flag) { var _a, _b; return !!((_b = (_a = config.bootstrap) === null || _a === void 0 ? void 0 : _a.featureFlags) === null || _b === void 0 ? void 0 : _b[flag]); })
                .reduce(function (res, key) {
                var _a, _b;
                return ((res[key] = ((_b = (_a = config.bootstrap) === null || _a === void 0 ? void 0 : _a.featureFlags) === null || _b === void 0 ? void 0 : _b[key]) || false), res);
            }, {});
            var featureFlagPayloads = Object.keys(((_e = config.bootstrap) === null || _e === void 0 ? void 0 : _e.featureFlagPayloads) || {})
                .filter(function (key) { return activeFlags_1[key]; })
                .reduce(function (res, key) {
                var _a, _b, _c, _d;
                if ((_b = (_a = config.bootstrap) === null || _a === void 0 ? void 0 : _a.featureFlagPayloads) === null || _b === void 0 ? void 0 : _b[key]) {
                    res[key] = (_d = (_c = config.bootstrap) === null || _c === void 0 ? void 0 : _c.featureFlagPayloads) === null || _d === void 0 ? void 0 : _d[key];
                }
                return res;
            }, {});
            this.featureFlags.receivedFeatureFlags({ featureFlags: activeFlags_1, featureFlagPayloads: featureFlagPayloads });
        }
        if (!this.get_distinct_id()) {
            // There is no need to set the distinct id
            // or the device id if something was already stored
            // in the persitence
            var uuid = this.config.get_device_id(uuidv7());
            this.register_once({
                distinct_id: uuid,
                $device_id: uuid,
            }, '');
            // distinct id == $device_id is a proxy for anonymous user
            this.persistence.set_property(USER_STATE, 'anonymous');
        }
        // Set up event handler for pageleave
        // Use `onpagehide` if available, see https://calendar.perfplanet.com/2020/beaconing-in-practice/#beaconing-reliability-avoiding-abandons
        (_f = window === null || window === void 0 ? void 0 : window.addEventListener) === null || _f === void 0 ? void 0 : _f.call(window, 'onpagehide' in self ? 'pagehide' : 'unload', this._handle_unload.bind(this));
        this.toolbar.maybeLoadToolbar();
        // We wan't to avoid promises for IE11 compatibility, so we use callbacks here
        if (config.segment) {
            setupSegmentIntegration(this, function () { return _this._loaded(); });
        }
        else {
            this._loaded();
        }
        if (isFunction(this.config._onCapture)) {
            this.on('eventCaptured', function (data) { return _this.config._onCapture(data.event, data); });
        }
        return this;
    };
    // Private methods
    PostHog.prototype._afterDecideResponse = function (response) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        this.compression = undefined;
        if (response.supportedCompression && !this.config.disable_compression) {
            this.compression = includes(response['supportedCompression'], Compression.GZipJS)
                ? Compression.GZipJS
                : includes(response['supportedCompression'], Compression.Base64)
                    ? Compression.Base64
                    : undefined;
        }
        if ((_a = response.analytics) === null || _a === void 0 ? void 0 : _a.endpoint) {
            this.analyticsDefaultEndpoint = response.analytics.endpoint;
        }
        (_b = this.sessionRecording) === null || _b === void 0 ? void 0 : _b.afterDecideResponse(response);
        (_c = this.autocapture) === null || _c === void 0 ? void 0 : _c.afterDecideResponse(response);
        (_d = this.heatmaps) === null || _d === void 0 ? void 0 : _d.afterDecideResponse(response);
        (_e = this.experiments) === null || _e === void 0 ? void 0 : _e.afterDecideResponse(response);
        (_f = this.surveys) === null || _f === void 0 ? void 0 : _f.afterDecideResponse(response);
        (_g = this.webVitalsAutocapture) === null || _g === void 0 ? void 0 : _g.afterDecideResponse(response);
        (_h = this.exceptions) === null || _h === void 0 ? void 0 : _h.afterDecideResponse(response);
        (_j = this.exceptionObserver) === null || _j === void 0 ? void 0 : _j.afterDecideResponse(response);
    };
    PostHog.prototype._loaded = function () {
        var _this = this;
        // Pause `reloadFeatureFlags` calls in config.loaded callback.
        // These feature flags are loaded in the decide call made right
        // afterwards
        var disableDecide = this.config.advanced_disable_decide;
        if (!disableDecide) {
            this.featureFlags.setReloadingPaused(true);
        }
        try {
            this.config.loaded(this);
        }
        catch (err) {
            logger.critical('`loaded` function failed', err);
        }
        this._start_queue_if_opted_in();
        // this happens after "loaded" so a user can call identify or any other things before the pageview fires
        if (this.config.capture_pageview) {
            // NOTE: We want to fire this on the next tick as the previous implementation had this side effect
            // and some clients may rely on it
            setTimeout(function () {
                if (_this.consent.isOptedIn()) {
                    _this._captureInitialPageview();
                }
            }, 1);
        }
        // Call decide to get what features are enabled and other settings.
        // As a reminder, if the /decide endpoint is disabled, feature flags, toolbar, session recording, autocapture,
        // and compression will not be available.
        if (!disableDecide) {
            new Decide(this).call();
            // TRICKY: Reset any decide reloads queued during config.loaded because they'll be
            // covered by the decide call right above.
            this.featureFlags.resetRequestQueue();
        }
    };
    PostHog.prototype._start_queue_if_opted_in = function () {
        var _a;
        if (!this.has_opted_out_capturing()) {
            if (this.config.request_batching) {
                (_a = this._requestQueue) === null || _a === void 0 ? void 0 : _a.enable();
            }
        }
    };
    PostHog.prototype._dom_loaded = function () {
        var _this = this;
        if (!this.has_opted_out_capturing()) {
            eachArray(this.__request_queue, function (item) { return _this._send_retriable_request(item); });
        }
        this.__request_queue = [];
        this._start_queue_if_opted_in();
    };
    PostHog.prototype._handle_unload = function () {
        var _a, _b;
        if (!this.config.request_batching) {
            if (this._shouldCapturePageleave()) {
                this.capture('$pageleave', null, { transport: 'sendBeacon' });
            }
            return;
        }
        if (this._shouldCapturePageleave()) {
            this.capture('$pageleave');
        }
        (_a = this._requestQueue) === null || _a === void 0 ? void 0 : _a.unload();
        (_b = this._retryQueue) === null || _b === void 0 ? void 0 : _b.unload();
    };
    PostHog.prototype._send_request = function (options) {
        var _this = this;
        if (!this.__loaded) {
            return;
        }
        if (ENQUEUE_REQUESTS) {
            this.__request_queue.push(options);
            return;
        }
        if (this.rateLimiter.isServerRateLimited(options.batchKey)) {
            return;
        }
        options.transport = options.transport || this.config.api_transport;
        options.url = extendURLParams(options.url, {
            // Whether to detect ip info or not
            ip: this.config.ip ? 1 : 0,
        });
        options.headers = __assign({}, this.config.request_headers);
        options.compression = options.compression === 'best-available' ? this.compression : options.compression;
        request(__assign(__assign({}, options), { callback: function (response) {
                var _a, _b, _c;
                _this.rateLimiter.checkForLimiting(response);
                if (response.statusCode >= 400) {
                    (_b = (_a = _this.config).on_request_error) === null || _b === void 0 ? void 0 : _b.call(_a, response);
                }
                (_c = options.callback) === null || _c === void 0 ? void 0 : _c.call(options, response);
            } }));
    };
    PostHog.prototype._send_retriable_request = function (options) {
        if (this._retryQueue) {
            this._retryQueue.retriableRequest(options);
        }
        else {
            this._send_request(options);
        }
    };
    /**
     * _execute_array() deals with processing any posthog function
     * calls that were called before the PostHog library were loaded
     * (and are thus stored in an array so they can be called later)
     *
     * Note: we fire off all the posthog function calls && user defined
     * functions BEFORE we fire off posthog capturing calls. This is so
     * identify/register/set_config calls can properly modify early
     * capturing calls.
     *
     * @param {Array} array
     */
    PostHog.prototype._execute_array = function (array) {
        var _this = this;
        var fn_name;
        var alias_calls = [];
        var other_calls = [];
        var capturing_calls = [];
        eachArray(array, function (item) {
            if (item) {
                fn_name = item[0];
                if (isArray(fn_name)) {
                    capturing_calls.push(item); // chained call e.g. posthog.get_group().set()
                }
                else if (isFunction(item)) {
                    ;
                    item.call(_this);
                }
                else if (isArray(item) && fn_name === 'alias') {
                    alias_calls.push(item);
                }
                else if (isArray(item) && fn_name.indexOf('capture') !== -1 && isFunction(_this[fn_name])) {
                    capturing_calls.push(item);
                }
                else {
                    other_calls.push(item);
                }
            }
        });
        var execute = function (calls, thisArg) {
            eachArray(calls, function (item) {
                if (isArray(item[0])) {
                    // chained call
                    var caller_1 = thisArg;
                    each(item, function (call) {
                        caller_1 = caller_1[call[0]].apply(caller_1, call.slice(1));
                    });
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    this[item[0]].apply(this, item.slice(1));
                }
            }, thisArg);
        };
        execute(alias_calls, this);
        execute(other_calls, this);
        execute(capturing_calls, this);
    };
    PostHog.prototype._hasBootstrappedFeatureFlags = function () {
        var _a, _b;
        return ((((_a = this.config.bootstrap) === null || _a === void 0 ? void 0 : _a.featureFlags) && Object.keys((_b = this.config.bootstrap) === null || _b === void 0 ? void 0 : _b.featureFlags).length > 0) ||
            false);
    };
    /**
     * push() keeps the standard async-array-push
     * behavior around after the lib is loaded.
     * This is only useful for external integrations that
     * do not wish to rely on our convenience methods
     * (created in the snippet).
     *
     * ### Usage:
     *     posthog.push(['register', { a: 'b' }]);
     *
     * @param {Array} item A [function_name, args...] array to be executed
     */
    PostHog.prototype.push = function (item) {
        this._execute_array([item]);
    };
    /**
     * Capture an event. This is the most important and
     * frequently used PostHog function.
     *
     * ### Usage:
     *
     *     // capture an event named 'Registered'
     *     posthog.capture('Registered', {'Gender': 'Male', 'Age': 21});
     *
     *     // capture an event using navigator.sendBeacon
     *     posthog.capture('Left page', {'duration_seconds': 35}, {transport: 'sendBeacon'});
     *
     * @param {String} event_name The name of the event. This can be anything the user does - 'Button Click', 'Sign Up', 'Item Purchased', etc.
     * @param {Object} [properties] A set of properties to include with the event you're sending. These describe the user who did the event or details about the event itself.
     * @param {Object} [config] Optional configuration for this capture request.
     * @param {String} [config.transport] Transport method for network request ('XHR' or 'sendBeacon').
     * @param {Date} [config.timestamp] Timestamp is a Date object. If not set, it'll automatically be set to the current time.
     */
    PostHog.prototype.capture = function (event_name, properties, options) {
        var _a;
        // While developing, a developer might purposefully _not_ call init(),
        // in this case, we would like capture to be a noop.
        if (!this.__loaded || !this.persistence || !this.sessionPersistence || !this._requestQueue) {
            logger.uninitializedWarning('posthog.capture');
            return;
        }
        if (this.consent.isOptedOut()) {
            return;
        }
        // typing doesn't prevent interesting data
        if (isUndefined(event_name) || !isString(event_name)) {
            logger.error('No event name provided to posthog.capture');
            return;
        }
        if (!this.config.opt_out_useragent_filter && this._is_bot()) {
            return;
        }
        var clientRateLimitContext = !(options === null || options === void 0 ? void 0 : options.skip_client_rate_limiting)
            ? this.rateLimiter.clientRateLimitContext()
            : undefined;
        if (clientRateLimitContext === null || clientRateLimitContext === void 0 ? void 0 : clientRateLimitContext.isRateLimited) {
            logger.critical('This capture call is ignored due to client rate limiting.');
            return;
        }
        // update persistence
        this.sessionPersistence.update_search_keyword();
        // The initial campaign/referrer props need to be stored in the regular persistence, as they are there to mimic
        // the person-initial props. The non-initial versions are stored in the sessionPersistence, as they are sent
        // with every event and used by the session table to create session-initial props.
        if (this.config.store_google) {
            this.sessionPersistence.update_campaign_params();
        }
        if (this.config.save_referrer) {
            this.sessionPersistence.update_referrer_info();
        }
        if (this.config.store_google || this.config.save_referrer) {
            this.persistence.set_initial_person_info();
        }
        var systemTime = new Date();
        var timestamp = (options === null || options === void 0 ? void 0 : options.timestamp) || systemTime;
        var data = {
            uuid: uuidv7(),
            event: event_name,
            properties: this._calculate_event_properties(event_name, properties || {}, timestamp),
        };
        if (clientRateLimitContext) {
            data.properties['$lib_rate_limit_remaining_tokens'] = clientRateLimitContext.remainingTokens;
        }
        var setProperties = options === null || options === void 0 ? void 0 : options.$set;
        if (setProperties) {
            data.$set = options === null || options === void 0 ? void 0 : options.$set;
        }
        var setOnceProperties = this._calculate_set_once_properties(options === null || options === void 0 ? void 0 : options.$set_once);
        if (setOnceProperties) {
            data.$set_once = setOnceProperties;
        }
        data = _copyAndTruncateStrings(data, (options === null || options === void 0 ? void 0 : options._noTruncate) ? null : this.config.properties_string_max_length);
        data.timestamp = timestamp;
        if (!isUndefined(options === null || options === void 0 ? void 0 : options.timestamp)) {
            data.properties['$event_time_override_provided'] = true;
            data.properties['$event_time_override_system_time'] = systemTime;
        }
        // Top-level $set overriding values from the one from properties is taken from the plugin-server normalizeEvent
        // This doesn't handle $set_once, because posthog-people doesn't either
        var finalSet = __assign(__assign({}, data.properties['$set']), data['$set']);
        if (!isEmptyObject(finalSet)) {
            this.setPersonPropertiesForFlags(finalSet);
        }
        this._internalEventEmitter.emit('eventCaptured', data);
        var requestOptions = {
            method: 'POST',
            url: (_a = options === null || options === void 0 ? void 0 : options._url) !== null && _a !== void 0 ? _a : this.requestRouter.endpointFor('api', this.analyticsDefaultEndpoint),
            data: data,
            compression: 'best-available',
            batchKey: options === null || options === void 0 ? void 0 : options._batchKey,
        };
        if (this.config.request_batching && (!options || (options === null || options === void 0 ? void 0 : options._batchKey)) && !(options === null || options === void 0 ? void 0 : options.send_instantly)) {
            this._requestQueue.enqueue(requestOptions);
        }
        else {
            this._send_retriable_request(requestOptions);
        }
        return data;
    };
    PostHog.prototype._addCaptureHook = function (callback) {
        return this.on('eventCaptured', function (data) { return callback(data.event, data); });
    };
    PostHog.prototype._calculate_event_properties = function (event_name, event_properties, timestamp) {
        timestamp = timestamp || new Date();
        if (!this.persistence || !this.sessionPersistence) {
            return event_properties;
        }
        // set defaults
        var startTimestamp = this.persistence.remove_event_timer(event_name);
        var properties = __assign({}, event_properties);
        properties['token'] = this.config.token;
        if (event_name === '$snapshot') {
            var persistenceProps = __assign(__assign({}, this.persistence.properties()), this.sessionPersistence.properties());
            properties['distinct_id'] = persistenceProps.distinct_id;
            if (
            // we spotted one customer that was managing to send `false` for ~9k events a day
            !(isString(properties['distinct_id']) || isNumber(properties['distinct_id'])) ||
                isEmptyString(properties['distinct_id'])) {
                logger.error('Invalid distinct_id for replay event. This indicates a bug in your implementation');
            }
            return properties;
        }
        var infoProperties = Info.properties();
        if (this.sessionManager) {
            var _a = this.sessionManager.checkAndGetSessionAndWindowId(), sessionId = _a.sessionId, windowId = _a.windowId;
            properties['$session_id'] = sessionId;
            properties['$window_id'] = windowId;
        }
        if (this.requestRouter.region === RequestRouterRegion.CUSTOM) {
            properties['$lib_custom_api_host'] = this.config.api_host;
        }
        if (this.sessionPropsManager &&
            this.config.__preview_send_client_session_params &&
            (event_name === '$pageview' || event_name === '$pageleave' || event_name === '$autocapture')) {
            var sessionProps = this.sessionPropsManager.getSessionProps();
            properties = extend(properties, sessionProps);
        }
        if (!this.config.disable_scroll_properties) {
            var performanceProperties = {};
            if (event_name === '$pageview') {
                performanceProperties = this.pageViewManager.doPageView(timestamp);
            }
            else if (event_name === '$pageleave') {
                performanceProperties = this.pageViewManager.doPageLeave(timestamp);
            }
            properties = extend(properties, performanceProperties);
        }
        if (event_name === '$pageview' && document) {
            properties['title'] = document.title;
        }
        // set $duration if time_event was previously called for this event
        if (!isUndefined(startTimestamp)) {
            var duration_in_ms = timestamp.getTime() - startTimestamp;
            properties['$duration'] = parseFloat((duration_in_ms / 1000).toFixed(3));
        }
        // this is only added when this.config.opt_out_useragent_filter is true,
        // or it would always add "browser"
        if (userAgent && this.config.opt_out_useragent_filter) {
            properties['$browser_type'] = this._is_bot() ? 'bot' : 'browser';
        }
        // note: extend writes to the first object, so lets make sure we
        // don't write to the persistence properties object and info
        // properties object by passing in a new object
        // update properties with pageview info and super-properties
        properties = extend({}, infoProperties, this.persistence.properties(), this.sessionPersistence.properties(), properties);
        properties['$is_identified'] = this._isIdentified();
        if (isArray(this.config.property_denylist)) {
            each(this.config.property_denylist, function (denylisted_prop) {
                delete properties[denylisted_prop];
            });
        }
        else {
            logger.error('Invalid value for property_denylist config: ' +
                this.config.property_denylist +
                ' or property_blacklist config: ' +
                this.config.property_blacklist);
        }
        var sanitize_properties = this.config.sanitize_properties;
        if (sanitize_properties) {
            properties = sanitize_properties(properties, event_name);
        }
        // add person processing flag as very last step, so it cannot be overridden. process_person=true is default
        properties['$process_person_profile'] = this._hasPersonProcessing();
        return properties;
    };
    PostHog.prototype._calculate_set_once_properties = function (dataSetOnce) {
        if (!this.persistence || !this._hasPersonProcessing()) {
            return dataSetOnce;
        }
        // if we're an identified person, send initial params with every event
        var setOnceProperties = extend({}, this.persistence.get_initial_props(), dataSetOnce || {});
        var sanitize_properties = this.config.sanitize_properties;
        if (sanitize_properties) {
            setOnceProperties = sanitize_properties(setOnceProperties, '$set_once');
        }
        if (isEmptyObject(setOnceProperties)) {
            return undefined;
        }
        return setOnceProperties;
    };
    /**
     * Register a set of super properties, which are included with all
     * events. This will overwrite previous super property values, except
     * for session properties (see `register_for_session(properties)`).
     *
     * ### Usage:
     *
     *     // register 'Gender' as a super property
     *     posthog.register({'Gender': 'Female'});
     *
     *     // register several super properties when a user signs up
     *     posthog.register({
     *         'Email': 'jdoe@example.com',
     *         'Account Type': 'Free'
     *     });
     *
     *     // Display the properties
     *     console.log(posthog.persistence.properties())
     *
     * @param {Object} properties An associative array of properties to store about the user
     * @param {Number} [days] How many days since the user's last visit to store the super properties
     */
    PostHog.prototype.register = function (properties, days) {
        var _a;
        (_a = this.persistence) === null || _a === void 0 ? void 0 : _a.register(properties, days);
    };
    /**
     * Register a set of super properties only once. These will not
     * overwrite previous super property values, unlike register().
     *
     * ### Usage:
     *
     *     // register a super property for the first time only
     *     posthog.register_once({
     *         'First Login Date': new Date().toISOString()
     *     });
     *
     *     // Display the properties
     *     console.log(posthog.persistence.properties())
     *
     * ### Notes:
     *
     * If default_value is specified, current super properties
     * with that value will be overwritten.
     *
     * @param {Object} properties An associative array of properties to store about the user
     * @param {*} [default_value] Value to override if already set in super properties (ex: 'False') Default: 'None'
     * @param {Number} [days] How many days since the users last visit to store the super properties
     */
    PostHog.prototype.register_once = function (properties, default_value, days) {
        var _a;
        (_a = this.persistence) === null || _a === void 0 ? void 0 : _a.register_once(properties, default_value, days);
    };
    /**
     * Register a set of super properties, which are included with all events, but only
     * for THIS SESSION. These will overwrite all other super property values.
     *
     * Unlike regular super properties, which last in LocalStorage for a long time,
     * session super properties get cleared after a session ends.
     *
     * ### Usage:
     *
     *     // register on all events this session
     *     posthog.register_for_session({'referer': customGetReferer()});
     *
     *     // register several session super properties when a user signs up
     *     posthog.register_for_session({
     *         'selectedPlan': 'pro',
     *         'completedSteps': 4,
     *     });
     *
     *     // Display the properties
     *     console.log(posthog.sessionPersistence.properties())
     *
     * @param {Object} properties An associative array of properties to store about the user
     */
    PostHog.prototype.register_for_session = function (properties) {
        var _a;
        (_a = this.sessionPersistence) === null || _a === void 0 ? void 0 : _a.register(properties);
    };
    /**
     * Delete a super property stored with the current user.
     *
     * @param {String} property The name of the super property to remove
     */
    PostHog.prototype.unregister = function (property) {
        var _a;
        (_a = this.persistence) === null || _a === void 0 ? void 0 : _a.unregister(property);
    };
    /**
     * Delete a session super property stored with the current user.
     *
     * @param {String} property The name of the session super property to remove
     */
    PostHog.prototype.unregister_for_session = function (property) {
        var _a;
        (_a = this.sessionPersistence) === null || _a === void 0 ? void 0 : _a.unregister(property);
    };
    PostHog.prototype._register_single = function (prop, value) {
        var _a;
        this.register((_a = {}, _a[prop] = value, _a));
    };
    /*
     * Get feature flag value for user (supports multivariate flags).
     *
     * ### Usage:
     *
     *     if(posthog.getFeatureFlag('beta-feature') === 'some-value') { // do something }
     *
     * @param {Object|String} prop Key of the feature flag.
     * @param {Object|String} options (optional) If {send_event: false}, we won't send an $feature_flag_call event to PostHog.
     */
    PostHog.prototype.getFeatureFlag = function (key, options) {
        return this.featureFlags.getFeatureFlag(key, options);
    };
    /*
     * Get feature flag payload value matching key for user (supports multivariate flags).
     *
     * ### Usage:
     *
     *     if(posthog.getFeatureFlag('beta-feature') === 'some-value') {
     *          const someValue = posthog.getFeatureFlagPayload('beta-feature')
     *          // do something
     *     }
     *
     * @param {Object|String} prop Key of the feature flag.
     */
    PostHog.prototype.getFeatureFlagPayload = function (key) {
        var payload = this.featureFlags.getFeatureFlagPayload(key);
        try {
            return JSON.parse(payload);
        }
        catch (_a) {
            return payload;
        }
    };
    /*
     * See if feature flag is enabled for user.
     *
     * ### Usage:
     *
     *     if(posthog.isFeatureEnabled('beta-feature')) { // do something }
     *
     * @param {Object|String} prop Key of the feature flag.
     * @param {Object|String} options (optional) If {send_event: false}, we won't send an $feature_flag_call event to PostHog.
     */
    PostHog.prototype.isFeatureEnabled = function (key, options) {
        return this.featureFlags.isFeatureEnabled(key, options);
    };
    PostHog.prototype.reloadFeatureFlags = function () {
        this.featureFlags.reloadFeatureFlags();
    };
    /** Opt the user in or out of an early access feature. */
    PostHog.prototype.updateEarlyAccessFeatureEnrollment = function (key, isEnrolled) {
        this.featureFlags.updateEarlyAccessFeatureEnrollment(key, isEnrolled);
    };
    /** Get the list of early access features. To check enrollment status, use `isFeatureEnabled`. */
    PostHog.prototype.getEarlyAccessFeatures = function (callback, force_reload) {
        if (force_reload === void 0) { force_reload = false; }
        return this.featureFlags.getEarlyAccessFeatures(callback, force_reload);
    };
    /**
     * Exposes a set of events that PostHog will emit.
     * e.g. `eventCaptured` is emitted immediately before trying to send an event
     *
     * Unlike  `onFeatureFlags` and `onSessionId` these are not called when the
     * listener is registered, the first callback will be the next event
     * _after_ registering a listener
     */
    PostHog.prototype.on = function (event, cb) {
        return this._internalEventEmitter.on(event, cb);
    };
    /*
     * Register an event listener that runs when feature flags become available or when they change.
     * If there are flags, the listener is called immediately in addition to being called on future changes.
     *
     * ### Usage:
     *
     *     posthog.onFeatureFlags(function(featureFlags) { // do something })
     *
     * @param {Function} [callback] The callback function will be called once the feature flags are ready or when they are updated.
     *                              It'll return a list of feature flags enabled for the user.
     * @returns {Function} A function that can be called to unsubscribe the listener. Used by useEffect when the component unmounts.
     */
    PostHog.prototype.onFeatureFlags = function (callback) {
        return this.featureFlags.onFeatureFlags(callback);
    };
    /*
     * Register an event listener that runs whenever the session id or window id change.
     * If there is already a session id, the listener is called immediately in addition to being called on future changes.
     *
     * Can be used, for example, to sync the PostHog session id with a backend session.
     *
     * ### Usage:
     *
     *     posthog.onSessionId(function(sessionId, windowId) { // do something })
     *
     * @param {Function} [callback] The callback function will be called once a session id is present or when it or the window id are updated.
     * @returns {Function} A function that can be called to unsubscribe the listener. E.g. Used by useEffect when the component unmounts.
     */
    PostHog.prototype.onSessionId = function (callback) {
        var _a, _b;
        return (_b = (_a = this.sessionManager) === null || _a === void 0 ? void 0 : _a.onSessionId(callback)) !== null && _b !== void 0 ? _b : (function () { });
    };
    /** Get list of all surveys. */
    PostHog.prototype.getSurveys = function (callback, forceReload) {
        if (forceReload === void 0) { forceReload = false; }
        this.surveys.getSurveys(callback, forceReload);
    };
    /** Get surveys that should be enabled for the current user. */
    PostHog.prototype.getActiveMatchingSurveys = function (callback, forceReload) {
        if (forceReload === void 0) { forceReload = false; }
        this.surveys.getActiveMatchingSurveys(callback, forceReload);
    };
    /** Render a survey on a specific element. */
    PostHog.prototype.renderSurvey = function (surveyId, selector) {
        this.surveys.renderSurvey(surveyId, selector);
    };
    /** Checks the feature flags associated with this Survey to see if the survey can be rendered. */
    PostHog.prototype.canRenderSurvey = function (surveyId) {
        this.surveys.canRenderSurvey(surveyId);
    };
    /** Get the next step of the survey: a question index or `end` */
    PostHog.prototype.getNextSurveyStep = function (survey, currentQuestionIndex, response) {
        return this.surveys.getNextSurveyStep(survey, currentQuestionIndex, response);
    };
    /**
     * Identify a user with a unique ID instead of a PostHog
     * randomly generated distinct_id. If the method is never called,
     * then unique visitors will be identified by a UUID that is generated
     * the first time they visit the site.
     *
     * If user properties are passed, they are also sent to posthog.
     *
     * ### Usage:
     *
     *      posthog.identify('[user unique id]')
     *      posthog.identify('[user unique id]', { email: 'john@example.com' })
     *      posthog.identify('[user unique id]', {}, { referral_code: '12345' })
     *
     * ### Notes:
     *
     * You can call this function to overwrite a previously set
     * unique ID for the current user.
     *
     * If the user has been identified ($user_state in persistence is set to 'identified'),
     * then capture of $identify is skipped to avoid merging users. For example,
     * if your system allows an admin user to impersonate another user.
     *
     * Then a single browser instance can have:
     *
     *  `identify('a') -> capture(1) -> identify('b') -> capture(2)`
     *
     * and capture 1 and capture 2 will have the correct distinct_id.
     * but users a and b will NOT be merged in posthog.
     *
     * However, if reset is called then:
     *
     *  `identify('a') -> capture(1) -> reset() -> capture(2) -> identify('b') -> capture(3)`
     *
     * users a and b are not merged.
     * Capture 1 is associated with user a.
     * A new distinct id is generated for capture 2.
     * which is merged with user b.
     * So, capture 2 and 3 are associated with user b.
     *
     * If you want to merge two identified users, you can call posthog.alias
     *
     * @param {String} [new_distinct_id] A string that uniquely identifies a user. If not provided, the distinct_id currently in the persistent store (cookie or localStorage) will be used.
     * @param {Object} [userPropertiesToSet] Optional: An associative array of properties to store about the user
     * @param {Object} [userPropertiesToSetOnce] Optional: An associative array of properties to store about the user. If property is previously set, this does not override that value.
     */
    PostHog.prototype.identify = function (new_distinct_id, userPropertiesToSet, userPropertiesToSetOnce) {
        if (!this.__loaded || !this.persistence) {
            return logger.uninitializedWarning('posthog.identify');
        }
        if (isNumber(new_distinct_id)) {
            new_distinct_id = new_distinct_id.toString();
            logger.warn('The first argument to posthog.identify was a number, but it should be a string. It has been converted to a string.');
        }
        //if the new_distinct_id has not been set ignore the identify event
        if (!new_distinct_id) {
            logger.error('Unique user id has not been set in posthog.identify');
            return;
        }
        if (isDistinctIdStringLike(new_distinct_id)) {
            logger.critical("The string \"".concat(new_distinct_id, "\" was set in posthog.identify which indicates an error. This ID should be unique to the user and not a hardcoded string."));
            return;
        }
        if (!this._requirePersonProcessing('posthog.identify')) {
            return;
        }
        var previous_distinct_id = this.get_distinct_id();
        this.register({ $user_id: new_distinct_id });
        if (!this.get_property('$device_id')) {
            // The persisted distinct id might not actually be a device id at all
            // it might be a distinct id of the user from before
            var device_id = previous_distinct_id;
            this.register_once({
                $had_persisted_distinct_id: true,
                $device_id: device_id,
            }, '');
        }
        // if the previous distinct id had an alias stored, then we clear it
        if (new_distinct_id !== previous_distinct_id && new_distinct_id !== this.get_property(ALIAS_ID_KEY)) {
            this.unregister(ALIAS_ID_KEY);
            this.register({ distinct_id: new_distinct_id });
        }
        var isKnownAnonymous = (this.persistence.get_property(USER_STATE) || 'anonymous') === 'anonymous';
        // send an $identify event any time the distinct_id is changing and the old ID is an anonymous ID
        // - logic on the server will determine whether or not to do anything with it.
        if (new_distinct_id !== previous_distinct_id && isKnownAnonymous) {
            this.persistence.set_property(USER_STATE, 'identified');
            // Update current user properties
            this.setPersonPropertiesForFlags(userPropertiesToSet || {}, false);
            this.capture('$identify', {
                distinct_id: new_distinct_id,
                $anon_distinct_id: previous_distinct_id,
            }, { $set: userPropertiesToSet || {}, $set_once: userPropertiesToSetOnce || {} });
            // let the reload feature flag request know to send this previous distinct id
            // for flag consistency
            this.featureFlags.setAnonymousDistinctId(previous_distinct_id);
        }
        else if (userPropertiesToSet || userPropertiesToSetOnce) {
            // If the distinct_id is not changing, but we have user properties to set, we can go for a $set event
            this.setPersonProperties(userPropertiesToSet, userPropertiesToSetOnce);
        }
        // Reload active feature flags if the user identity changes.
        // Note we don't reload this on property changes as these get processed async
        if (new_distinct_id !== previous_distinct_id) {
            this.reloadFeatureFlags();
            // also clear any stored flag calls
            this.unregister(FLAG_CALL_REPORTED);
        }
    };
    /**
     * Sets properties for the Person associated with the current distinct_id. If config.person_profiles is set to
     * identified_only, and a Person profile has not been created yet, this will create one.
     *
     *
     * @param {Object} [userPropertiesToSet] Optional: An associative array of properties to store about the user
     * @param {Object} [userPropertiesToSetOnce] Optional: An associative array of properties to store about the user. If property is previously set, this does not override that value.
     */
    PostHog.prototype.setPersonProperties = function (userPropertiesToSet, userPropertiesToSetOnce) {
        if (!userPropertiesToSet && !userPropertiesToSetOnce) {
            return;
        }
        if (!this._requirePersonProcessing('posthog.setPersonProperties')) {
            return;
        }
        // Update current user properties
        this.setPersonPropertiesForFlags(userPropertiesToSet || {});
        this.capture('$set', { $set: userPropertiesToSet || {}, $set_once: userPropertiesToSetOnce || {} });
    };
    /**
     * Sets group analytics information for subsequent events and reloads feature flags.
     *
     * @param {String} groupType Group type (example: 'organization')
     * @param {String} groupKey Group key (example: 'org::5')
     * @param {Object} groupPropertiesToSet Optional properties to set for group
     */
    PostHog.prototype.group = function (groupType, groupKey, groupPropertiesToSet) {
        var _a, _b;
        if (!groupType || !groupKey) {
            logger.error('posthog.group requires a group type and group key');
            return;
        }
        if (!this._requirePersonProcessing('posthog.group')) {
            return;
        }
        var existingGroups = this.getGroups();
        // if group key changes, remove stored group properties
        if (existingGroups[groupType] !== groupKey) {
            this.resetGroupPropertiesForFlags(groupType);
        }
        this.register({ $groups: __assign(__assign({}, existingGroups), (_a = {}, _a[groupType] = groupKey, _a)) });
        if (groupPropertiesToSet) {
            this.capture('$groupidentify', {
                $group_type: groupType,
                $group_key: groupKey,
                $group_set: groupPropertiesToSet,
            });
            this.setGroupPropertiesForFlags((_b = {}, _b[groupType] = groupPropertiesToSet, _b));
        }
        // If groups change and no properties change, reload feature flags.
        // The property change reload case is handled in setGroupPropertiesForFlags.
        if (existingGroups[groupType] !== groupKey && !groupPropertiesToSet) {
            this.reloadFeatureFlags();
        }
    };
    /**
     * Resets only the group properties of the user currently logged in.
     */
    PostHog.prototype.resetGroups = function () {
        this.register({ $groups: {} });
        this.resetGroupPropertiesForFlags();
        // If groups changed, reload feature flags.
        this.reloadFeatureFlags();
    };
    /**
     * Set override person properties for feature flags.
     * This is used when dealing with new persons / where you don't want to wait for ingestion
     * to update user properties.
     */
    PostHog.prototype.setPersonPropertiesForFlags = function (properties, reloadFeatureFlags) {
        if (reloadFeatureFlags === void 0) { reloadFeatureFlags = true; }
        if (!this._requirePersonProcessing('posthog.setPersonPropertiesForFlags')) {
            return;
        }
        this.featureFlags.setPersonPropertiesForFlags(properties, reloadFeatureFlags);
    };
    PostHog.prototype.resetPersonPropertiesForFlags = function () {
        this.featureFlags.resetPersonPropertiesForFlags();
    };
    /**
     * Set override group properties for feature flags.
     * This is used when dealing with new groups / where you don't want to wait for ingestion
     * to update properties.
     * Takes in an object, the key of which is the group type.
     * For example:
     *     setGroupPropertiesForFlags({'organization': { name: 'CYZ', employees: '11' } })
     */
    PostHog.prototype.setGroupPropertiesForFlags = function (properties, reloadFeatureFlags) {
        if (reloadFeatureFlags === void 0) { reloadFeatureFlags = true; }
        if (!this._requirePersonProcessing('posthog.setGroupPropertiesForFlags')) {
            return;
        }
        this.featureFlags.setGroupPropertiesForFlags(properties, reloadFeatureFlags);
    };
    PostHog.prototype.resetGroupPropertiesForFlags = function (group_type) {
        this.featureFlags.resetGroupPropertiesForFlags(group_type);
    };
    /**
     * Clears super properties and generates a new random distinct_id for this instance.
     * Useful for clearing data when a user logs out.
     */
    PostHog.prototype.reset = function (reset_device_id) {
        var _a, _b, _c, _d;
        logger.info('reset');
        if (!this.__loaded) {
            return logger.uninitializedWarning('posthog.reset');
        }
        var device_id = this.get_property('$device_id');
        this.consent.reset();
        (_a = this.persistence) === null || _a === void 0 ? void 0 : _a.clear();
        (_b = this.sessionPersistence) === null || _b === void 0 ? void 0 : _b.clear();
        (_c = this.persistence) === null || _c === void 0 ? void 0 : _c.set_property(USER_STATE, 'anonymous');
        (_d = this.sessionManager) === null || _d === void 0 ? void 0 : _d.resetSessionId();
        var uuid = this.config.get_device_id(uuidv7());
        this.register_once({
            distinct_id: uuid,
            $device_id: reset_device_id ? uuid : device_id,
        }, '');
    };
    /**
     * Returns the current distinct id of the user. This is either the id automatically
     * generated by the library or the id that has been passed by a call to identify().
     *
     * ### Notes:
     *
     * get_distinct_id() can only be called after the PostHog library has finished loading.
     * init() has a loaded function available to handle this automatically. For example:
     *
     *     // set distinct_id after the posthog library has loaded
     *     posthog.init('YOUR PROJECT TOKEN', {
     *         loaded: function(posthog) {
     *             distinct_id = posthog.get_distinct_id();
     *         }
     *     });
     */
    PostHog.prototype.get_distinct_id = function () {
        return this.get_property('distinct_id');
    };
    PostHog.prototype.getGroups = function () {
        return this.get_property('$groups') || {};
    };
    /**
     * Returns the current session_id.
     *
     * NOTE: This should only be used for informative purposes.
     * Any actual internal use case for the session_id should be handled by the sessionManager.
     */
    PostHog.prototype.get_session_id = function () {
        var _a, _b;
        return (_b = (_a = this.sessionManager) === null || _a === void 0 ? void 0 : _a.checkAndGetSessionAndWindowId(true).sessionId) !== null && _b !== void 0 ? _b : '';
    };
    /**
     * Returns the Replay url for the current session.
     *
     * @param options Options for the url
     * @param options.withTimestamp Whether to include the timestamp in the url (defaults to false)
     * @param options.timestampLookBack How many seconds to look back for the timestamp (defaults to 10)
     */
    PostHog.prototype.get_session_replay_url = function (options) {
        var _a;
        if (!this.sessionManager) {
            return '';
        }
        var _b = this.sessionManager.checkAndGetSessionAndWindowId(true), sessionId = _b.sessionId, sessionStartTimestamp = _b.sessionStartTimestamp;
        var url = this.requestRouter.endpointFor('ui', "/project/".concat(this.config.token, "/replay/").concat(sessionId));
        if ((options === null || options === void 0 ? void 0 : options.withTimestamp) && sessionStartTimestamp) {
            var LOOK_BACK = (_a = options.timestampLookBack) !== null && _a !== void 0 ? _a : 10;
            if (!sessionStartTimestamp) {
                return url;
            }
            var recordingStartTime = Math.max(Math.floor((new Date().getTime() - sessionStartTimestamp) / 1000) - LOOK_BACK, 0);
            url += "?t=".concat(recordingStartTime);
        }
        return url;
    };
    /**
     * Create an alias, which PostHog will use to link two distinct_ids going forward (not retroactively).
     * Multiple aliases can map to the same original ID, but not vice-versa. Aliases can also be chained - the
     * following is a valid scenario:
     *
     *     posthog.alias('new_id', 'existing_id');
     *     ...
     *     posthog.alias('newer_id', 'new_id');
     *
     * If the original ID is not passed in, we will use the current distinct_id - probably the auto-generated GUID.
     *
     * ### Notes:
     *
     * The best practice is to call alias() when a unique ID is first created for a user
     * (e.g., when a user first registers for an account and provides an email address).
     * alias() should never be called more than once for a given user, except to
     * chain a newer ID to a previously new ID, as described above.
     *
     * @param {String} alias A unique identifier that you want to use for this user in the future.
     * @param {String} [original] The current identifier being used for this user.
     */
    PostHog.prototype.alias = function (alias, original) {
        // If the $people_distinct_id key exists in persistence, there has been a previous
        // posthog.people.identify() call made for this user. It is VERY BAD to make an alias with
        // this ID, as it will duplicate users.
        if (alias === this.get_property(PEOPLE_DISTINCT_ID_KEY)) {
            logger.critical('Attempting to create alias for existing People user - aborting.');
            return -2;
        }
        if (!this._requirePersonProcessing('posthog.alias')) {
            return;
        }
        if (isUndefined(original)) {
            original = this.get_distinct_id();
        }
        if (alias !== original) {
            this._register_single(ALIAS_ID_KEY, alias);
            return this.capture('$create_alias', { alias: alias, distinct_id: original });
        }
        else {
            logger.warn('alias matches current distinct_id - skipping api call.');
            this.identify(alias);
            return -1;
        }
    };
    /**
     * Update the configuration of a posthog library instance.
     *
     * The default config is:
     *
     *     {
     *       // PostHog API host
     *       api_host: 'https://us.i.posthog.com',
     *     *
     *       // PostHog web app host, currently only used by the Sentry integration.
     *       // This will only be different from api_host when using a reverse-proxied API host – in that case
     *       // the original web app host needs to be passed here so that links to the web app are still convenient.
     *       ui_host: 'https://us.posthog.com',
     *
     *       // Automatically capture clicks, form submissions and change events
     *       autocapture: true
     *
     *       // Capture rage clicks
     *       rageclick: true
     *
     *       // transport for sending requests ('XHR' or 'sendBeacon')
     *       // NB: sendBeacon should only be used for scenarios such as
     *       // page unload where a "best-effort" attempt to send is
     *       // acceptable; the sendBeacon API does not support callbacks
     *       // or any way to know the result of the request. PostHog
     *       // capturing via sendBeacon will not support any event-
     *       // batching or retry mechanisms.
     *       api_transport: 'XHR'
     *
     *       // super properties cookie expiration (in days)
     *       cookie_expiration: 365
     *
     *       // super properties span subdomains
     *       cross_subdomain_cookie: true
     *
     *       // debug mode
     *       debug: false
     *
     *       // if this is true, the posthog cookie or localStorage entry
     *       // will be deleted, and no user persistence will take place
     *       disable_persistence: false
     *
     *       // if this is true, PostHog will automatically determine
     *       // City, Region and Country data using the IP address of
     *       //the client
     *       ip: true
     *
     *       // opt users out of capturing by this PostHog instance by default
     *       opt_out_capturing_by_default: false
     *
     *       // opt users out of browser data storage by this PostHog instance by default
     *       opt_out_persistence_by_default: false
     *
     *       // opt out of user agent filtering such as googlebot or other bots
     *       opt_out_useragent_filter: false
     *
     *       // persistence mechanism used by opt-in/opt-out methods - cookie
     *       // or localStorage - falls back to cookie if localStorage is unavailable
     *       opt_out_capturing_persistence_type: 'localStorage'
     *
     *       // customize the name of cookie/localStorage set by opt-in/opt-out methods
     *       opt_out_capturing_cookie_prefix: null
     *
     *       // type of persistent store for super properties (cookie/
     *       // localStorage) if set to 'localStorage', any existing
     *       // posthog cookie value with the same persistence_name
     *       // will be transferred to localStorage and deleted
     *       persistence: 'cookie'
     *
     *       // name for super properties persistent store
     *       persistence_name: ''
     *
     *       // deprecated, use property_denylist instead.
     *       // names of properties/superproperties which should never
     *       // be sent with capture() calls.
     *       property_blacklist: []
     *
     *       // names of properties/superproperties which should never
     *       // be sent with capture() calls.
     *       property_denylist: []
     *
     *       // if this is true, posthog cookies will be marked as
     *       // secure, meaning they will only be transmitted over https
     *       secure_cookie: false
     *
     *       // should we capture a page view on page load
     *       capture_pageview: true
     *
     *       // if you set upgrade to be true, the library will check for
     *       // a cookie from our old js library and import super
     *       // properties from it, then the old cookie is deleted
     *       // The upgrade config option only works in the initialization,
     *       // so make sure you set it when you create the library.
     *       upgrade: false
     *
     *       // if this is true, session recording is always disabled.
     *       disable_session_recording: false,
     *
     *       // extra HTTP request headers to set for each API request, in
     *       // the format {'Header-Name': value}
     *       response_headers: {}
     *
     *       // protocol for fetching in-app message resources, e.g.
     *       // 'https://' or 'http://'; defaults to '//' (which defers to the
     *       // current page's protocol)
     *       inapp_protocol: '//'
     *
     *       // whether to open in-app message link in new tab/window
     *       inapp_link_new_window: false
     *
     *      // a set of rrweb config options that PostHog users can configure
     *      // see https://github.com/rrweb-io/rrweb/blob/master/guide.md
     *      session_recording: {
     *         blockClass: 'ph-no-capture',
     *         blockSelector: null,
     *         ignoreClass: 'ph-ignore-input',
     *         maskAllInputs: true,
     *         maskInputOptions: {password: true},
     *         maskInputFn: null,
     *         slimDOMOptions: {},
     *         collectFonts: false,
     *         inlineStylesheet: true,
     *      }
     *
     *      // prevent autocapture from capturing any attribute names on elements
     *      mask_all_element_attributes: false
     *
     *      // prevent autocapture from capturing textContent on all elements
     *      mask_all_text: false
     *
     *      // Anonymous users get a random UUID as their device by default.
     *      // This option allows overriding that option.
     *      get_device_id: (uuid) => uuid
     *     }
     *
     *
     * @param {Object} config A dictionary of new configuration values to update
     */
    PostHog.prototype.set_config = function (config) {
        var _a, _b, _c, _d;
        var oldConfig = __assign({}, this.config);
        if (isObject(config)) {
            extend(this.config, configRenames(config));
            (_a = this.persistence) === null || _a === void 0 ? void 0 : _a.update_config(this.config, oldConfig);
            this.sessionPersistence =
                this.config.persistence === 'sessionStorage'
                    ? this.persistence
                    : new PostHogPersistence(__assign(__assign({}, this.config), { persistence: 'sessionStorage' }));
            if (localStore.is_supported() && localStore.get('ph_debug') === 'true') {
                this.config.debug = true;
            }
            if (this.config.debug) {
                Config.DEBUG = true;
                logger.info('set_config', {
                    config: config,
                    oldConfig: oldConfig,
                    newConfig: __assign({}, this.config),
                });
            }
            (_b = this.sessionRecording) === null || _b === void 0 ? void 0 : _b.startIfEnabledOrStop();
            (_c = this.autocapture) === null || _c === void 0 ? void 0 : _c.startIfEnabled();
            (_d = this.heatmaps) === null || _d === void 0 ? void 0 : _d.startIfEnabled();
            this.surveys.loadIfEnabled();
            this._sync_opt_out_with_persistence();
        }
    };
    /**
     * turns session recording on, and updates the config option `disable_session_recording` to false
     * @param override.sampling - optional boolean to override the default sampling behavior - ensures the next session recording to start will not be skipped by sampling config.
     * @param override.linked_flag - optional boolean to override the default linked_flag behavior - ensures the next session recording to start will not be skipped by linked_flag config.
     * @param override - optional boolean to override the default sampling behavior - ensures the next session recording to start will not be skipped by sampling or linked_flag config. `true` is shorthand for { sampling: true, linked_flag: true }
     */
    PostHog.prototype.startSessionRecording = function (override) {
        var _a, _b, _c;
        var overrideAll = isBoolean(override) && override;
        if (overrideAll || (override === null || override === void 0 ? void 0 : override.sampling) || (override === null || override === void 0 ? void 0 : override.linked_flag)) {
            // allow the session id check to rotate session id if necessary
            var ids = (_a = this.sessionManager) === null || _a === void 0 ? void 0 : _a.checkAndGetSessionAndWindowId();
            if (overrideAll || (override === null || override === void 0 ? void 0 : override.sampling)) {
                (_b = this.sessionRecording) === null || _b === void 0 ? void 0 : _b.overrideSampling();
                logger.info('Session recording started with sampling override for session: ', ids === null || ids === void 0 ? void 0 : ids.sessionId);
            }
            if (overrideAll || (override === null || override === void 0 ? void 0 : override.linked_flag)) {
                (_c = this.sessionRecording) === null || _c === void 0 ? void 0 : _c.overrideLinkedFlag();
                logger.info('Session recording started with linked_flags override');
            }
        }
        this.set_config({ disable_session_recording: false });
    };
    /**
     * turns session recording off, and updates the config option
     * disable_session_recording to true
     */
    PostHog.prototype.stopSessionRecording = function () {
        this.set_config({ disable_session_recording: true });
    };
    /**
     * returns a boolean indicating whether session recording
     * is currently running
     */
    PostHog.prototype.sessionRecordingStarted = function () {
        var _a;
        return !!((_a = this.sessionRecording) === null || _a === void 0 ? void 0 : _a.started);
    };
    /** Capture a caught exception manually */
    PostHog.prototype.captureException = function (error, additionalProperties) {
        var _a;
        var syntheticException = new Error('PostHog syntheticException');
        var properties = isFunction((_a = assignableWindow.__PosthogExtensions__) === null || _a === void 0 ? void 0 : _a.parseErrorAsProperties)
            ? assignableWindow.__PosthogExtensions__.parseErrorAsProperties([error.message, undefined, undefined, undefined, error], 
            // create synthetic error to get stack in cases where user input does not contain one
            // creating the exceptionas soon into our code as possible means we should only have to
            // remove a single frame (this 'captureException' method) from the resultant stack
            { syntheticException: syntheticException })
            : __assign({ $exception_level: 'error', $exception_list: [
                    {
                        type: error.name,
                        value: error.message,
                        mechanism: {
                            handled: true,
                            synthetic: false,
                        },
                    },
                ] }, additionalProperties);
        this.exceptions.sendExceptionEvent(properties);
    };
    /**
     * returns a boolean indicating whether the toolbar loaded
     * @param toolbarParams
     */
    PostHog.prototype.loadToolbar = function (params) {
        return this.toolbar.loadToolbar(params);
    };
    /**
     * Returns the value of the super property named property_name. If no such
     * property is set, get_property() will return the undefined value.
     *
     * ### Notes:
     *
     * get_property() can only be called after the PostHog library has finished loading.
     * init() has a loaded function available to handle this automatically. For example:
     *
     *     // grab value for '$user_id' after the posthog library has loaded
     *     posthog.init('YOUR PROJECT TOKEN', {
     *         loaded: function(posthog) {
     *             user_id = posthog.get_property('$user_id');
     *         }
     *     });
     *
     * @param {String} property_name The name of the super property you want to retrieve
     */
    PostHog.prototype.get_property = function (property_name) {
        var _a;
        return (_a = this.persistence) === null || _a === void 0 ? void 0 : _a.props[property_name];
    };
    /**
     * Returns the value of the session super property named property_name. If no such
     * property is set, getSessionProperty() will return the undefined value.
     *
     * ### Notes:
     *
     * This is based on browser-level `sessionStorage`, NOT the PostHog session.
     * getSessionProperty() can only be called after the PostHog library has finished loading.
     * init() has a loaded function available to handle this automatically. For example:
     *
     *     // grab value for 'user_id' after the posthog library has loaded
     *     posthog.init('YOUR PROJECT TOKEN', {
     *         loaded: function(posthog) {
     *             user_id = posthog.getSessionProperty('user_id');
     *         }
     *     });
     *
     * @param {String} property_name The name of the session super property you want to retrieve
     */
    PostHog.prototype.getSessionProperty = function (property_name) {
        var _a;
        return (_a = this.sessionPersistence) === null || _a === void 0 ? void 0 : _a.props[property_name];
    };
    PostHog.prototype.toString = function () {
        var _a;
        var name = (_a = this.config.name) !== null && _a !== void 0 ? _a : PRIMARY_INSTANCE_NAME;
        if (name !== PRIMARY_INSTANCE_NAME) {
            name = PRIMARY_INSTANCE_NAME + '.' + name;
        }
        return name;
    };
    PostHog.prototype._isIdentified = function () {
        var _a, _b;
        return (((_a = this.persistence) === null || _a === void 0 ? void 0 : _a.get_property(USER_STATE)) === 'identified' ||
            ((_b = this.sessionPersistence) === null || _b === void 0 ? void 0 : _b.get_property(USER_STATE)) === 'identified');
    };
    PostHog.prototype._hasPersonProcessing = function () {
        var _a, _b, _c, _d;
        return !(this.config.person_profiles === 'never' ||
            (this.config.person_profiles === 'identified_only' &&
                !this._isIdentified() &&
                isEmptyObject(this.getGroups()) &&
                !((_b = (_a = this.persistence) === null || _a === void 0 ? void 0 : _a.props) === null || _b === void 0 ? void 0 : _b[ALIAS_ID_KEY]) &&
                !((_d = (_c = this.persistence) === null || _c === void 0 ? void 0 : _c.props) === null || _d === void 0 ? void 0 : _d[ENABLE_PERSON_PROCESSING])));
    };
    PostHog.prototype._shouldCapturePageleave = function () {
        return (this.config.capture_pageleave === true ||
            (this.config.capture_pageleave === 'if_capture_pageview' && this.config.capture_pageview));
    };
    /**
     *  Creates a person profile for the current user, if they don't already have one and config.person_profiles is set
     *  to 'identified_only'. Produces a warning and does not create a profile if config.person_profiles is set to
     *  'never'.
     */
    PostHog.prototype.createPersonProfile = function () {
        if (this._hasPersonProcessing()) {
            // if a person profile already exists, don't send an event when we don't need to
            return;
        }
        if (!this._requirePersonProcessing('posthog.createPersonProfile')) {
            return;
        }
        // sent a $set event. We don't set any properties here, but attribution props will be added later
        this.setPersonProperties({}, {});
    };
    /**
     * Enables person processing if possible, returns true if it does so or already enabled, false otherwise
     *
     * @param function_name
     */
    PostHog.prototype._requirePersonProcessing = function (function_name) {
        if (this.config.person_profiles === 'never') {
            logger.error(function_name + ' was called, but process_person is set to "never". This call will be ignored.');
            return false;
        }
        this._register_single(ENABLE_PERSON_PROCESSING, true);
        return true;
    };
    /**
     * Enable or disable persistence based on options
     * only enable/disable if persistence is not already in this state
     * @param {boolean} [disabled] If true, will re-enable sdk persistence
     */
    PostHog.prototype._sync_opt_out_with_persistence = function () {
        var _a, _b, _c, _d;
        var isOptedOut = this.consent.isOptedOut();
        var defaultPersistenceDisabled = this.config.opt_out_persistence_by_default;
        // TRICKY: We want a deterministic state for persistence so that a new pageload has the same persistence
        var persistenceDisabled = this.config.disable_persistence || (isOptedOut && !!defaultPersistenceDisabled);
        if (((_a = this.persistence) === null || _a === void 0 ? void 0 : _a.disabled) !== persistenceDisabled) {
            (_b = this.persistence) === null || _b === void 0 ? void 0 : _b.set_disabled(persistenceDisabled);
        }
        if (((_c = this.sessionPersistence) === null || _c === void 0 ? void 0 : _c.disabled) !== persistenceDisabled) {
            (_d = this.sessionPersistence) === null || _d === void 0 ? void 0 : _d.set_disabled(persistenceDisabled);
        }
    };
    /**
     * Opt the user in to data capturing and cookies/localstorage for this PostHog instance
     * If the config.opt_out_persistence_by_default is set to false, the SDK persistence will be enabled.
     *
     * ### Usage
     *
     *     // opt user in
     *     posthog.opt_in_capturing();
     *
     *     // opt user in with specific event name, properties, cookie configuration
     *     posthog.opt_in_capturing({
     *         capture_event_name: 'User opted in',
     *         capture_event_properties: {
     *             'email': 'jdoe@example.com'
     *         }
     *     });
     *
     * @param {Object} [config] A dictionary of config options to override
     * @param {string} [config.capture_event_name=$opt_in] Event name to be used for capturing the opt-in action. Set to `null` or `false` to skip capturing the optin event
     * @param {Object} [config.capture_properties] Set of properties to be captured along with the opt-in action
     */
    PostHog.prototype.opt_in_capturing = function (options) {
        var _a;
        this.consent.optInOut(true);
        this._sync_opt_out_with_persistence();
        // Don't capture if captureEventName is null or false
        if (isUndefined(options === null || options === void 0 ? void 0 : options.captureEventName) || (options === null || options === void 0 ? void 0 : options.captureEventName)) {
            this.capture((_a = options === null || options === void 0 ? void 0 : options.captureEventName) !== null && _a !== void 0 ? _a : '$opt_in', options === null || options === void 0 ? void 0 : options.captureProperties, { send_instantly: true });
        }
        if (this.config.capture_pageview) {
            this._captureInitialPageview();
        }
    };
    /**
     * Opt the user out of data capturing and cookies/localstorage for this PostHog instance.
     * If the config.opt_out_persistence_by_default is set to true, the SDK persistence will be disabled.
     *
     * ### Usage
     *
     *     // opt user out
     *     posthog.opt_out_capturing()
     */
    PostHog.prototype.opt_out_capturing = function () {
        this.consent.optInOut(false);
        this._sync_opt_out_with_persistence();
    };
    /**
     * Check whether the user has opted in to data capturing and cookies/localstorage for this PostHog instance
     *
     * ### Usage
     *
     *     const has_opted_in = posthog.has_opted_in_capturing();
     *     // use has_opted_in value
     *
     * @returns {boolean} current opt-in status
     */
    PostHog.prototype.has_opted_in_capturing = function () {
        return this.consent.isOptedIn();
    };
    /**
     * Check whether the user has opted out of data capturing and cookies/localstorage for this PostHog instance
     *
     * ### Usage
     *
     *     const has_opted_out = posthog.has_opted_out_capturing();
     *     // use has_opted_out value
     *
     * @returns {boolean} current opt-out status
     */
    PostHog.prototype.has_opted_out_capturing = function () {
        return this.consent.isOptedOut();
    };
    /**
     * Clear the user's opt in/out status of data capturing and cookies/localstorage for this PostHog instance
     *
     * ### Usage
     *
     *     // clear user's opt-in/out status
     *     posthog.clear_opt_in_out_capturing();
     *     *
     * @param {Object} [config] A dictionary of config options to override
     */
    PostHog.prototype.clear_opt_in_out_capturing = function () {
        this.consent.reset();
        this._sync_opt_out_with_persistence();
    };
    PostHog.prototype._is_bot = function () {
        if (navigator) {
            return isLikelyBot(navigator, this.config.custom_blocked_useragents);
        }
        else {
            return undefined;
        }
    };
    PostHog.prototype._captureInitialPageview = function () {
        if (document && !this._initialPageviewCaptured) {
            this._initialPageviewCaptured = true;
            this.capture('$pageview', { title: document.title }, { send_instantly: true });
        }
    };
    PostHog.prototype.debug = function (debug) {
        if (debug === false) {
            window === null || window === void 0 ? void 0 : window.console.log("You've disabled debug mode.");
            localStorage && localStorage.removeItem('ph_debug');
            this.set_config({ debug: false });
        }
        else {
            window === null || window === void 0 ? void 0 : window.console.log("You're now in debug mode. All calls to PostHog will be logged in your console.\nYou can disable this with `posthog.debug(false)`.");
            localStorage && localStorage.setItem('ph_debug', 'true');
            this.set_config({ debug: true });
        }
    };
    return PostHog;
}());
export { PostHog };
safewrapClass(PostHog, ['identify']);
var add_dom_loaded_handler = function () {
    // Cross browser DOM Loaded support
    function dom_loaded_handler() {
        // function flag since we only want to execute this once
        if (dom_loaded_handler.done) {
            return;
        }
        ;
        dom_loaded_handler.done = true;
        ENQUEUE_REQUESTS = false;
        each(instances, function (inst) {
            inst._dom_loaded();
        });
    }
    if (document === null || document === void 0 ? void 0 : document.addEventListener) {
        if (document.readyState === 'complete') {
            // safari 4 can fire the DOMContentLoaded event before loading all
            // external JS (including this file). you will see some copypasta
            // on the internet that checks for 'complete' and 'loaded', but
            // 'loaded' is an IE thing
            dom_loaded_handler();
        }
        else {
            document.addEventListener('DOMContentLoaded', dom_loaded_handler, false);
        }
    }
    // fallback handler, always will work
    if (window) {
        registerEvent(window, 'load', dom_loaded_handler, true);
    }
};
export function init_from_snippet() {
    var posthogMain = (instances[PRIMARY_INSTANCE_NAME] = new PostHog());
    var snippetPostHog = assignableWindow['posthog'];
    if (snippetPostHog) {
        /**
         * The snippet uses some clever tricks to allow deferred loading of array.js (this code)
         *
         * window.posthog is an array which the queue of calls made before the lib is loaded
         * It has methods attached to it to simulate the posthog object so for instance
         *
         * window.posthog.init("TOKEN", {api_host: "foo" })
         * window.posthog.capture("my-event", {foo: "bar" })
         *
         * ... will mean that window.posthog will look like this:
         * window.posthog == [
         *  ["my-event", {foo: "bar"}]
         * ]
         *
         * window.posthog[_i] == [
         *   ["TOKEN", {api_host: "foo" }, "posthog"]
         * ]
         *
         * If a name is given to the init function then the same as above is true but as a sub-property on the object:
         *
         * window.posthog.init("TOKEN", {}, "ph2")
         * window.posthog.ph2.people.set({foo: "bar"})
         *
         * window.posthog.ph2 == []
         * window.posthog.people == [
         *  ["set", {foo: "bar"}]
         * ]
         *
         */
        // Call all pre-loaded init calls properly
        each(snippetPostHog['_i'], function (item) {
            if (item && isArray(item)) {
                var instance = posthogMain.init(item[0], item[1], item[2]);
                var instanceSnippet = snippetPostHog[item[2]] || snippetPostHog;
                if (instance) {
                    // Crunch through the people queue first - we queue this data up &
                    // flush on identify, so it's better to do all these operations first
                    instance._execute_array.call(instance.people, instanceSnippet.people);
                    instance._execute_array(instanceSnippet);
                }
            }
        });
    }
    assignableWindow['posthog'] = posthogMain;
    add_dom_loaded_handler();
}
export function init_as_module() {
    var posthogMain = (instances[PRIMARY_INSTANCE_NAME] = new PostHog());
    add_dom_loaded_handler();
    return posthogMain;
}
//# sourceMappingURL=posthog-core.js.map