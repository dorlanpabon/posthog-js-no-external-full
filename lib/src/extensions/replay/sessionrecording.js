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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
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
import { CONSOLE_LOG_RECORDING_ENABLED_SERVER_SIDE, SESSION_RECORDING_CANVAS_RECORDING, SESSION_RECORDING_ENABLED_SERVER_SIDE, SESSION_RECORDING_IS_SAMPLED, SESSION_RECORDING_MINIMUM_DURATION, SESSION_RECORDING_NETWORK_PAYLOAD_CAPTURE, SESSION_RECORDING_SAMPLE_RATE, SESSION_RECORDING_URL_TRIGGER_ACTIVATED_SESSION, SESSION_RECORDING_URL_TRIGGER_STATUS, } from '../../constants';
import { estimateSize, INCREMENTAL_SNAPSHOT_EVENT_TYPE, splitBuffer, truncateLargeConsoleLogs, } from './sessionrecording-utils';
import { EventType, IncrementalSource, } from '@rrweb/types';
import { isBoolean, isFunction, isNullish, isNumber, isObject, isString, isUndefined } from '../../utils/type-utils';
import { logger } from '../../utils/logger';
import { assignableWindow, document, window } from '../../utils/globals';
import { buildNetworkRequestOptions } from './config';
import { isLocalhost } from '../../utils/request-utils';
import { MutationRateLimiter } from './mutation-rate-limiter';
import { gzipSync, strFromU8, strToU8 } from 'fflate';
var BASE_ENDPOINT = '/s/';
var ONE_MINUTE = 1000 * 60;
var FIVE_MINUTES = ONE_MINUTE * 5;
var TWO_SECONDS = 2000;
export var RECORDING_IDLE_THRESHOLD_MS = FIVE_MINUTES;
var ONE_KB = 1024;
var PARTIAL_COMPRESSION_THRESHOLD = ONE_KB;
export var RECORDING_MAX_EVENT_SIZE = ONE_KB * ONE_KB * 0.9; // ~1mb (with some wiggle room)
export var RECORDING_BUFFER_TIMEOUT = 2000; // 2 seconds
export var SESSION_RECORDING_BATCH_KEY = 'recordings';
// NOTE: Importing this type is problematic as we can't safely bundle it to a TS definition so, instead we redefine.
// import type { record } from 'rrweb2/typings'
// import type { recordOptions } from 'rrweb/typings/types'
var ACTIVE_SOURCES = [
    IncrementalSource.MouseMove,
    IncrementalSource.MouseInteraction,
    IncrementalSource.Scroll,
    IncrementalSource.ViewportResize,
    IncrementalSource.Input,
    IncrementalSource.TouchMove,
    IncrementalSource.MediaInteraction,
    IncrementalSource.Drag,
];
var TRIGGER_STATUSES = ['trigger_activated', 'trigger_pending', 'trigger_disabled'];
var newQueuedEvent = function (rrwebMethod) { return ({
    rrwebMethod: rrwebMethod,
    enqueuedAt: Date.now(),
    attempt: 1,
}); };
var LOGGER_PREFIX = '[SessionRecording]';
function gzipToString(data) {
    return strFromU8(gzipSync(strToU8(JSON.stringify(data))), true);
}
// rrweb's packer takes an event and returns a string or the reverse on unpact,
// but we want to be able to inspect metadata during ingestion, and don't want to compress the entire event
// so we have a custom packer that only compresses part of some events
function compressEvent(event) {
    var originalSize = estimateSize(event);
    if (originalSize < PARTIAL_COMPRESSION_THRESHOLD) {
        return event;
    }
    try {
        if (event.type === EventType.FullSnapshot) {
            return __assign(__assign({}, event), { data: gzipToString(event.data), cv: '2024-10' });
        }
        if (event.type === EventType.IncrementalSnapshot && event.data.source === IncrementalSource.Mutation) {
            return __assign(__assign({}, event), { cv: '2024-10', data: __assign(__assign({}, event.data), { texts: gzipToString(event.data.texts), attributes: gzipToString(event.data.attributes), removes: gzipToString(event.data.removes), adds: gzipToString(event.data.adds) }) });
        }
        if (event.type === EventType.IncrementalSnapshot && event.data.source === IncrementalSource.StyleSheetRule) {
            return __assign(__assign({}, event), { cv: '2024-10', data: __assign(__assign({}, event.data), { adds: gzipToString(event.data.adds), removes: gzipToString(event.data.removes) }) });
        }
    }
    catch (e) {
        logger.error(LOGGER_PREFIX + ' could not compress event - will use uncompressed event', e);
    }
    return event;
}
function isSessionIdleEvent(e) {
    return e.type === EventType.Custom && e.data.tag === 'sessionIdle';
}
var SessionRecording = /** @class */ (function () {
    function SessionRecording(instance) {
        var _this = this;
        this.instance = instance;
        // and a queue - that contains rrweb events that we want to send to rrweb, but rrweb wasn't able to accept them yet
        this.queuedRRWebEvents = [];
        this.isIdle = false;
        this._linkedFlagSeen = false;
        this._lastActivityTimestamp = Date.now();
        this._linkedFlag = null;
        this._removePageViewCaptureHook = undefined;
        this._onSessionIdListener = undefined;
        this._persistDecideOnSessionListener = undefined;
        this._samplingSessionListener = undefined;
        this._urlTriggers = [];
        // Util to help developers working on this feature manually override
        this._forceAllowLocalhostNetworkCapture = false;
        this._onBeforeUnload = function () {
            _this._flushBuffer();
        };
        this._onOffline = function () {
            _this._tryAddCustomEvent('browser offline', {});
        };
        this._onOnline = function () {
            _this._tryAddCustomEvent('browser online', {});
        };
        this._onVisibilityChange = function () {
            if (document === null || document === void 0 ? void 0 : document.visibilityState) {
                var label = 'window ' + document.visibilityState;
                _this._tryAddCustomEvent(label, {});
            }
        };
        this._captureStarted = false;
        this._endpoint = BASE_ENDPOINT;
        this.stopRrweb = undefined;
        this.receivedDecide = false;
        if (!this.instance.sessionManager) {
            logger.error(LOGGER_PREFIX + ' started without valid sessionManager');
            throw new Error(LOGGER_PREFIX + ' started without valid sessionManager. This is a bug.');
        }
        // we know there's a sessionManager, so don't need to start without a session id
        var _a = this.sessionManager.checkAndGetSessionAndWindowId(), sessionId = _a.sessionId, windowId = _a.windowId;
        this.sessionId = sessionId;
        this.windowId = windowId;
        this.buffer = this.clearBuffer();
        if (this.sessionIdleThresholdMilliseconds >= this.sessionManager.sessionTimeoutMs) {
            logger.warn(LOGGER_PREFIX +
                " session_idle_threshold_ms (".concat(this.sessionIdleThresholdMilliseconds, ") is greater than the session timeout (").concat(this.sessionManager.sessionTimeoutMs, "). Session will never be detected as idle"));
        }
    }
    Object.defineProperty(SessionRecording.prototype, "sessionIdleThresholdMilliseconds", {
        get: function () {
            return this.instance.config.session_recording.session_idle_threshold_ms || RECORDING_IDLE_THRESHOLD_MS;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "rrwebRecord", {
        get: function () {
            var _a, _b;
            return (_b = (_a = assignableWindow === null || assignableWindow === void 0 ? void 0 : assignableWindow.__PosthogExtensions__) === null || _a === void 0 ? void 0 : _a.rrweb) === null || _b === void 0 ? void 0 : _b.record;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "started", {
        get: function () {
            // TODO could we use status instead of _captureStarted?
            return this._captureStarted;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "sessionManager", {
        get: function () {
            if (!this.instance.sessionManager) {
                throw new Error(LOGGER_PREFIX + ' must be started with a valid sessionManager.');
            }
            return this.instance.sessionManager;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "fullSnapshotIntervalMillis", {
        get: function () {
            var _a, _b;
            if (this.urlTriggerStatus === 'trigger_pending') {
                return ONE_MINUTE;
            }
            return (_b = (_a = this.instance.config.session_recording) === null || _a === void 0 ? void 0 : _a.full_snapshot_interval_millis) !== null && _b !== void 0 ? _b : FIVE_MINUTES;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "isSampled", {
        get: function () {
            var currentValue = this.instance.get_property(SESSION_RECORDING_IS_SAMPLED);
            return isBoolean(currentValue) ? currentValue : null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "sessionDuration", {
        get: function () {
            var _a, _b;
            var mostRecentSnapshot = (_a = this.buffer) === null || _a === void 0 ? void 0 : _a.data[((_b = this.buffer) === null || _b === void 0 ? void 0 : _b.data.length) - 1];
            var sessionStartTimestamp = this.sessionManager.checkAndGetSessionAndWindowId(true).sessionStartTimestamp;
            return mostRecentSnapshot ? mostRecentSnapshot.timestamp - sessionStartTimestamp : null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "isRecordingEnabled", {
        get: function () {
            var enabled_server_side = !!this.instance.get_property(SESSION_RECORDING_ENABLED_SERVER_SIDE);
            var enabled_client_side = !this.instance.config.disable_session_recording;
            return window && enabled_server_side && enabled_client_side;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "isConsoleLogCaptureEnabled", {
        get: function () {
            var enabled_server_side = !!this.instance.get_property(CONSOLE_LOG_RECORDING_ENABLED_SERVER_SIDE);
            var enabled_client_side = this.instance.config.enable_recording_console_log;
            return enabled_client_side !== null && enabled_client_side !== void 0 ? enabled_client_side : enabled_server_side;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "canvasRecording", {
        get: function () {
            var canvasRecording_server_side = this.instance.get_property(SESSION_RECORDING_CANVAS_RECORDING);
            return canvasRecording_server_side && canvasRecording_server_side.fps && canvasRecording_server_side.quality
                ? {
                    enabled: canvasRecording_server_side.enabled,
                    fps: canvasRecording_server_side.fps,
                    quality: canvasRecording_server_side.quality,
                }
                : undefined;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "networkPayloadCapture", {
        // network payload capture config has three parts
        // each can be configured server side or client side
        get: function () {
            var _a, _b;
            var networkPayloadCapture_server_side = this.instance.get_property(SESSION_RECORDING_NETWORK_PAYLOAD_CAPTURE);
            var networkPayloadCapture_client_side = {
                recordHeaders: (_a = this.instance.config.session_recording) === null || _a === void 0 ? void 0 : _a.recordHeaders,
                recordBody: (_b = this.instance.config.session_recording) === null || _b === void 0 ? void 0 : _b.recordBody,
            };
            var headersEnabled = (networkPayloadCapture_client_side === null || networkPayloadCapture_client_side === void 0 ? void 0 : networkPayloadCapture_client_side.recordHeaders) || (networkPayloadCapture_server_side === null || networkPayloadCapture_server_side === void 0 ? void 0 : networkPayloadCapture_server_side.recordHeaders);
            var bodyEnabled = (networkPayloadCapture_client_side === null || networkPayloadCapture_client_side === void 0 ? void 0 : networkPayloadCapture_client_side.recordBody) || (networkPayloadCapture_server_side === null || networkPayloadCapture_server_side === void 0 ? void 0 : networkPayloadCapture_server_side.recordBody);
            var clientConfigForPerformanceCapture = isObject(this.instance.config.capture_performance)
                ? this.instance.config.capture_performance.network_timing
                : this.instance.config.capture_performance;
            var networkTimingEnabled = !!(isBoolean(clientConfigForPerformanceCapture)
                ? clientConfigForPerformanceCapture
                : networkPayloadCapture_server_side === null || networkPayloadCapture_server_side === void 0 ? void 0 : networkPayloadCapture_server_side.capturePerformance);
            return headersEnabled || bodyEnabled || networkTimingEnabled
                ? { recordHeaders: headersEnabled, recordBody: bodyEnabled, recordPerformance: networkTimingEnabled }
                : undefined;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "sampleRate", {
        get: function () {
            var rate = this.instance.get_property(SESSION_RECORDING_SAMPLE_RATE);
            return isNumber(rate) ? rate : null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "minimumDuration", {
        get: function () {
            var duration = this.instance.get_property(SESSION_RECORDING_MINIMUM_DURATION);
            return isNumber(duration) ? duration : null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "status", {
        /**
         * defaults to buffering mode until a decide response is received
         * once a decide response is received status can be disabled, active or sampled
         */
        get: function () {
            if (!this.receivedDecide) {
                return 'buffering';
            }
            if (!this.isRecordingEnabled) {
                return 'disabled';
            }
            if (!isNullish(this._linkedFlag) && !this._linkedFlagSeen) {
                return 'buffering';
            }
            if (this.urlTriggerStatus === 'trigger_pending') {
                return 'buffering';
            }
            if (isBoolean(this.isSampled)) {
                return this.isSampled ? 'sampled' : 'disabled';
            }
            else {
                return 'active';
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SessionRecording.prototype, "urlTriggerStatus", {
        get: function () {
            var _a, _b, _c, _d, _e, _f;
            if (this.receivedDecide && this._urlTriggers.length === 0) {
                return 'trigger_disabled';
            }
            var currentStatus = (_a = this.instance) === null || _a === void 0 ? void 0 : _a.get_property(SESSION_RECORDING_URL_TRIGGER_STATUS);
            var currentTriggerSession = (_b = this.instance) === null || _b === void 0 ? void 0 : _b.get_property(SESSION_RECORDING_URL_TRIGGER_ACTIVATED_SESSION);
            if (currentTriggerSession !== this.sessionId) {
                (_d = (_c = this.instance) === null || _c === void 0 ? void 0 : _c.persistence) === null || _d === void 0 ? void 0 : _d.unregister(SESSION_RECORDING_URL_TRIGGER_ACTIVATED_SESSION);
                (_f = (_e = this.instance) === null || _e === void 0 ? void 0 : _e.persistence) === null || _f === void 0 ? void 0 : _f.unregister(SESSION_RECORDING_URL_TRIGGER_STATUS);
                return 'trigger_pending';
            }
            if (TRIGGER_STATUSES.includes(currentStatus)) {
                return currentStatus;
            }
            return 'trigger_pending';
        },
        set: function (status) {
            var _a;
            var _b, _c;
            (_c = (_b = this.instance) === null || _b === void 0 ? void 0 : _b.persistence) === null || _c === void 0 ? void 0 : _c.register((_a = {},
                _a[SESSION_RECORDING_URL_TRIGGER_ACTIVATED_SESSION] = this.sessionId,
                _a[SESSION_RECORDING_URL_TRIGGER_STATUS] = status,
                _a));
        },
        enumerable: false,
        configurable: true
    });
    SessionRecording.prototype.startIfEnabledOrStop = function (startReason) {
        var _this = this;
        if (this.isRecordingEnabled) {
            this._startCapture(startReason);
            // calling addEventListener multiple times is safe and will not add duplicates
            window === null || window === void 0 ? void 0 : window.addEventListener('beforeunload', this._onBeforeUnload);
            window === null || window === void 0 ? void 0 : window.addEventListener('offline', this._onOffline);
            window === null || window === void 0 ? void 0 : window.addEventListener('online', this._onOnline);
            window === null || window === void 0 ? void 0 : window.addEventListener('visibilitychange', this._onVisibilityChange);
            // on reload there might be an already sampled session that should be continued before decide response,
            // so we call this here _and_ in the decide response
            this._setupSampling();
            if (isNullish(this._removePageViewCaptureHook)) {
                // :TRICKY: rrweb does not capture navigation within SPA-s, so hook into our $pageview events to get access to all events.
                //   Dropping the initial event is fine (it's always captured by rrweb).
                this._removePageViewCaptureHook = this.instance._addCaptureHook(function (eventName) {
                    // If anything could go wrong here it has the potential to block the main loop,
                    // so we catch all errors.
                    try {
                        if (eventName === '$pageview') {
                            var href = window ? _this._maskUrl(window.location.href) : '';
                            if (!href) {
                                return;
                            }
                            _this._tryAddCustomEvent('$pageview', { href: href });
                        }
                    }
                    catch (e) {
                        logger.error('Could not add $pageview to rrweb session', e);
                    }
                });
            }
            if (!this._onSessionIdListener) {
                this._onSessionIdListener = this.sessionManager.onSessionId(function (sessionId, windowId, changeReason) {
                    var _a, _b, _c, _d;
                    if (changeReason) {
                        _this._tryAddCustomEvent('$session_id_change', { sessionId: sessionId, windowId: windowId, changeReason: changeReason });
                        (_b = (_a = _this.instance) === null || _a === void 0 ? void 0 : _a.persistence) === null || _b === void 0 ? void 0 : _b.unregister(SESSION_RECORDING_URL_TRIGGER_ACTIVATED_SESSION);
                        (_d = (_c = _this.instance) === null || _c === void 0 ? void 0 : _c.persistence) === null || _d === void 0 ? void 0 : _d.unregister(SESSION_RECORDING_URL_TRIGGER_STATUS);
                    }
                });
            }
        }
        else {
            this.stopRecording();
        }
    };
    SessionRecording.prototype.stopRecording = function () {
        var _a, _b, _c;
        if (this._captureStarted && this.stopRrweb) {
            this.stopRrweb();
            this.stopRrweb = undefined;
            this._captureStarted = false;
            window === null || window === void 0 ? void 0 : window.removeEventListener('beforeunload', this._onBeforeUnload);
            window === null || window === void 0 ? void 0 : window.removeEventListener('offline', this._onOffline);
            window === null || window === void 0 ? void 0 : window.removeEventListener('online', this._onOnline);
            window === null || window === void 0 ? void 0 : window.removeEventListener('visibilitychange', this._onVisibilityChange);
            this.clearBuffer();
            clearInterval(this._fullSnapshotTimer);
            (_a = this._removePageViewCaptureHook) === null || _a === void 0 ? void 0 : _a.call(this);
            this._removePageViewCaptureHook = undefined;
            (_b = this._onSessionIdListener) === null || _b === void 0 ? void 0 : _b.call(this);
            this._onSessionIdListener = undefined;
            (_c = this._samplingSessionListener) === null || _c === void 0 ? void 0 : _c.call(this);
            this._samplingSessionListener = undefined;
            logger.info(LOGGER_PREFIX + ' stopped');
        }
    };
    SessionRecording.prototype.makeSamplingDecision = function (sessionId) {
        var _a, _b;
        var _c, _d;
        var sessionIdChanged = this.sessionId !== sessionId;
        // capture the current sample rate,
        // because it is re-used multiple times
        // and the bundler won't minimise any of the references
        var currentSampleRate = this.sampleRate;
        if (!isNumber(currentSampleRate)) {
            (_c = this.instance.persistence) === null || _c === void 0 ? void 0 : _c.register((_a = {},
                _a[SESSION_RECORDING_IS_SAMPLED] = null,
                _a));
            return;
        }
        var storedIsSampled = this.isSampled;
        /**
         * if we get this far then we should make a sampling decision.
         * When the session id changes or there is no stored sampling decision for this session id
         * then we should make a new decision.
         *
         * Otherwise, we should use the stored decision.
         */
        var shouldSample;
        var makeDecision = sessionIdChanged || !isBoolean(storedIsSampled);
        if (makeDecision) {
            var randomNumber = Math.random();
            shouldSample = randomNumber < currentSampleRate;
        }
        else {
            shouldSample = storedIsSampled;
        }
        if (makeDecision) {
            if (shouldSample) {
                this._reportStarted('sampling');
            }
            else {
                logger.warn(LOGGER_PREFIX +
                    " Sample rate (".concat(currentSampleRate, ") has determined that this sessionId (").concat(sessionId, ") will not be sent to the server."));
            }
            this._tryAddCustomEvent('samplingDecisionMade', {
                sampleRate: currentSampleRate,
                isSampled: shouldSample,
            });
        }
        (_d = this.instance.persistence) === null || _d === void 0 ? void 0 : _d.register((_b = {},
            _b[SESSION_RECORDING_IS_SAMPLED] = shouldSample,
            _b));
    };
    SessionRecording.prototype.afterDecideResponse = function (response) {
        var _this = this;
        var _a, _b, _c, _d;
        this._persistDecideResponse(response);
        this._linkedFlag = ((_a = response.sessionRecording) === null || _a === void 0 ? void 0 : _a.linkedFlag) || null;
        if ((_b = response.sessionRecording) === null || _b === void 0 ? void 0 : _b.endpoint) {
            this._endpoint = (_c = response.sessionRecording) === null || _c === void 0 ? void 0 : _c.endpoint;
        }
        this._setupSampling();
        if (!isNullish(this._linkedFlag) && !this._linkedFlagSeen) {
            var linkedFlag_1 = isString(this._linkedFlag) ? this._linkedFlag : this._linkedFlag.flag;
            var linkedVariant_1 = isString(this._linkedFlag) ? null : this._linkedFlag.variant;
            this.instance.onFeatureFlags(function (_flags, variants) {
                var flagIsPresent = isObject(variants) && linkedFlag_1 in variants;
                var linkedFlagMatches = linkedVariant_1 ? variants[linkedFlag_1] === linkedVariant_1 : flagIsPresent;
                if (linkedFlagMatches) {
                    var payload = {
                        linkedFlag: linkedFlag_1,
                        linkedVariant: linkedVariant_1,
                    };
                    var tag = 'linked flag matched';
                    logger.info(LOGGER_PREFIX + ' ' + tag, payload);
                    _this._tryAddCustomEvent(tag, payload);
                    _this._reportStarted('linked_flag_match');
                }
                _this._linkedFlagSeen = linkedFlagMatches;
            });
        }
        if ((_d = response.sessionRecording) === null || _d === void 0 ? void 0 : _d.urlTriggers) {
            this._urlTriggers = response.sessionRecording.urlTriggers;
        }
        this.receivedDecide = true;
        this.startIfEnabledOrStop();
    };
    /**
     * This might be called more than once so needs to be idempotent
     */
    SessionRecording.prototype._setupSampling = function () {
        var _this = this;
        if (isNumber(this.sampleRate) && isNullish(this._samplingSessionListener)) {
            this._samplingSessionListener = this.sessionManager.onSessionId(function (sessionId) {
                _this.makeSamplingDecision(sessionId);
            });
        }
    };
    SessionRecording.prototype._persistDecideResponse = function (response) {
        var _a;
        if (this.instance.persistence) {
            var persistence_1 = this.instance.persistence;
            var persistResponse = function () {
                var _a;
                var _b, _c, _d, _e, _f, _g, _h;
                var receivedSampleRate = (_b = response.sessionRecording) === null || _b === void 0 ? void 0 : _b.sampleRate;
                var parsedSampleRate = isNullish(receivedSampleRate) ? null : parseFloat(receivedSampleRate);
                var receivedMinimumDuration = (_c = response.sessionRecording) === null || _c === void 0 ? void 0 : _c.minimumDurationMilliseconds;
                persistence_1.register((_a = {},
                    _a[SESSION_RECORDING_ENABLED_SERVER_SIDE] = !!response['sessionRecording'],
                    _a[CONSOLE_LOG_RECORDING_ENABLED_SERVER_SIDE] = (_d = response.sessionRecording) === null || _d === void 0 ? void 0 : _d.consoleLogRecordingEnabled,
                    _a[SESSION_RECORDING_NETWORK_PAYLOAD_CAPTURE] = __assign({ capturePerformance: response.capturePerformance }, (_e = response.sessionRecording) === null || _e === void 0 ? void 0 : _e.networkPayloadCapture),
                    _a[SESSION_RECORDING_CANVAS_RECORDING] = {
                        enabled: (_f = response.sessionRecording) === null || _f === void 0 ? void 0 : _f.recordCanvas,
                        fps: (_g = response.sessionRecording) === null || _g === void 0 ? void 0 : _g.canvasFps,
                        quality: (_h = response.sessionRecording) === null || _h === void 0 ? void 0 : _h.canvasQuality,
                    },
                    _a[SESSION_RECORDING_SAMPLE_RATE] = parsedSampleRate,
                    _a[SESSION_RECORDING_MINIMUM_DURATION] = isUndefined(receivedMinimumDuration)
                        ? null
                        : receivedMinimumDuration,
                    _a));
            };
            persistResponse();
            // in case we see multiple decide responses, we should only listen with the response from the most recent one
            (_a = this._persistDecideOnSessionListener) === null || _a === void 0 ? void 0 : _a.call(this);
            this._persistDecideOnSessionListener = this.sessionManager.onSessionId(persistResponse);
        }
    };
    SessionRecording.prototype.log = function (message, level) {
        var _a;
        if (level === void 0) { level = 'log'; }
        (_a = this.instance.sessionRecording) === null || _a === void 0 ? void 0 : _a.onRRwebEmit({
            type: 6,
            data: {
                plugin: 'rrweb/console@1',
                payload: {
                    level: level,
                    trace: [],
                    // Even though it is a string we stringify it as that's what rrweb expects
                    payload: [JSON.stringify(message)],
                },
            },
            timestamp: Date.now(),
        });
    };
    SessionRecording.prototype._startCapture = function (startReason) {
        var _this = this;
        var _a, _b;
        if (isUndefined(Object.assign) || isUndefined(Array.from)) {
            // According to the rrweb docs, rrweb is not supported on IE11 and below:
            // "rrweb does not support IE11 and below because it uses the MutationObserver API which was supported by these browsers."
            // https://github.com/rrweb-io/rrweb/blob/master/guide.md#compatibility-note
            //
            // However, MutationObserver does exist on IE11, it just doesn't work well and does not detect all changes.
            // Instead, when we load "recorder.js", the first JS error is about "Object.assign" and "Array.from" being undefined.
            // Thus instead of MutationObserver, we look for this function and block recording if it's undefined.
            return;
        }
        // We do not switch recorder versions midway through a recording.
        // do not start if explicitly disabled or if the user has opted out
        if (this._captureStarted ||
            this.instance.config.disable_session_recording ||
            this.instance.consent.isOptedOut()) {
            return;
        }
        this._captureStarted = true;
        // We want to ensure the sessionManager is reset if necessary on load of the recorder
        this.sessionManager.checkAndGetSessionAndWindowId();
        // If recorder.js is already loaded (if array.full.js snippet is used or posthog-js/dist/recorder is
        // imported), don't load script. Otherwise, remotely import recorder.js from cdn since it hasn't been loaded.
        if (!this.rrwebRecord) {
            (_b = (_a = assignableWindow.__PosthogExtensions__) === null || _a === void 0 ? void 0 : _a.loadExternalDependency) === null || _b === void 0 ? void 0 : _b.call(_a, this.instance, 'recorder', function (err) {
                if (err) {
                    return logger.error(LOGGER_PREFIX + " could not load recorder", err);
                }
                _this._onScriptLoaded();
            });
        }
        else {
            this._onScriptLoaded();
        }
        logger.info(LOGGER_PREFIX + ' starting');
        if (this.status === 'active') {
            this._reportStarted(startReason || 'recording_initialized');
        }
    };
    SessionRecording.prototype.isInteractiveEvent = function (event) {
        var _a;
        return (event.type === INCREMENTAL_SNAPSHOT_EVENT_TYPE &&
            ACTIVE_SOURCES.indexOf((_a = event.data) === null || _a === void 0 ? void 0 : _a.source) !== -1);
    };
    SessionRecording.prototype._updateWindowAndSessionIds = function (event) {
        // Some recording events are triggered by non-user events (e.g. "X minutes ago" text updating on the screen).
        // We don't want to extend the session or trigger a new session in these cases. These events are designated by event
        // type -> incremental update, and source -> mutation.
        var isUserInteraction = this.isInteractiveEvent(event);
        if (!isUserInteraction && !this.isIdle) {
            // We check if the lastActivityTimestamp is old enough to go idle
            var timeSinceLastActivity = event.timestamp - this._lastActivityTimestamp;
            if (timeSinceLastActivity > this.sessionIdleThresholdMilliseconds) {
                // we mark as idle right away,
                // or else we get multiple idle events
                // if there are lots of non-user activity events being emitted
                this.isIdle = true;
                // don't take full snapshots while idle
                clearInterval(this._fullSnapshotTimer);
                this._tryAddCustomEvent('sessionIdle', {
                    eventTimestamp: event.timestamp,
                    lastActivityTimestamp: this._lastActivityTimestamp,
                    threshold: this.sessionIdleThresholdMilliseconds,
                    bufferLength: this.buffer.data.length,
                    bufferSize: this.buffer.size,
                });
                // proactively flush the buffer in case the session is idle for a long time
                this._flushBuffer();
            }
        }
        var returningFromIdle = false;
        if (isUserInteraction) {
            this._lastActivityTimestamp = event.timestamp;
            if (this.isIdle) {
                // Remove the idle state
                this.isIdle = false;
                this._tryAddCustomEvent('sessionNoLongerIdle', {
                    reason: 'user activity',
                    type: event.type,
                });
                returningFromIdle = true;
            }
        }
        if (this.isIdle) {
            return;
        }
        // We only want to extend the session if it is an interactive event.
        var _a = this.sessionManager.checkAndGetSessionAndWindowId(!isUserInteraction, event.timestamp), windowId = _a.windowId, sessionId = _a.sessionId;
        var sessionIdChanged = this.sessionId !== sessionId;
        var windowIdChanged = this.windowId !== windowId;
        this.windowId = windowId;
        this.sessionId = sessionId;
        if (sessionIdChanged || windowIdChanged) {
            this.stopRecording();
            this.startIfEnabledOrStop('session_id_changed');
        }
        else if (returningFromIdle) {
            this._scheduleFullSnapshot();
        }
    };
    SessionRecording.prototype._tryRRWebMethod = function (queuedRRWebEvent) {
        try {
            queuedRRWebEvent.rrwebMethod();
            return true;
        }
        catch (e) {
            // Sometimes a race can occur where the recorder is not fully started yet
            if (this.queuedRRWebEvents.length < 10) {
                this.queuedRRWebEvents.push({
                    enqueuedAt: queuedRRWebEvent.enqueuedAt || Date.now(),
                    attempt: queuedRRWebEvent.attempt++,
                    rrwebMethod: queuedRRWebEvent.rrwebMethod,
                });
            }
            else {
                logger.warn(LOGGER_PREFIX + ' could not emit queued rrweb event.', e, queuedRRWebEvent);
            }
            return false;
        }
    };
    SessionRecording.prototype._tryAddCustomEvent = function (tag, payload) {
        var _this = this;
        return this._tryRRWebMethod(newQueuedEvent(function () { return _this.rrwebRecord.addCustomEvent(tag, payload); }));
    };
    SessionRecording.prototype._tryTakeFullSnapshot = function () {
        var _this = this;
        return this._tryRRWebMethod(newQueuedEvent(function () { return _this.rrwebRecord.takeFullSnapshot(); }));
    };
    SessionRecording.prototype._onScriptLoaded = function () {
        var e_1, _a;
        var _this = this;
        var _b;
        // rrweb config info: https://github.com/rrweb-io/rrweb/blob/7d5d0033258d6c29599fb08412202d9a2c7b9413/src/record/index.ts#L28
        var sessionRecordingOptions = {
            // select set of rrweb config options we expose to our users
            // see https://github.com/rrweb-io/rrweb/blob/master/guide.md
            blockClass: 'ph-no-capture',
            blockSelector: undefined,
            ignoreClass: 'ph-ignore-input',
            maskTextClass: 'ph-mask',
            maskTextSelector: undefined,
            maskTextFn: undefined,
            maskAllInputs: true,
            maskInputOptions: { password: true },
            maskInputFn: undefined,
            slimDOMOptions: {},
            collectFonts: false,
            inlineStylesheet: true,
            recordCrossOriginIframes: false,
        };
        // only allows user to set our allow-listed options
        var userSessionRecordingOptions = this.instance.config.session_recording;
        try {
            for (var _c = __values(Object.entries(userSessionRecordingOptions || {})), _d = _c.next(); !_d.done; _d = _c.next()) {
                var _e = __read(_d.value, 2), key = _e[0], value = _e[1];
                if (key in sessionRecordingOptions) {
                    if (key === 'maskInputOptions') {
                        // ensure password is set if not included
                        sessionRecordingOptions.maskInputOptions = __assign({ password: true }, value);
                    }
                    else {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        sessionRecordingOptions[key] = value;
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (this.canvasRecording && this.canvasRecording.enabled) {
            sessionRecordingOptions.recordCanvas = true;
            sessionRecordingOptions.sampling = { canvas: this.canvasRecording.fps };
            sessionRecordingOptions.dataURLOptions = { type: 'image/webp', quality: this.canvasRecording.quality };
        }
        if (!this.rrwebRecord) {
            logger.error(LOGGER_PREFIX +
                'onScriptLoaded was called but rrwebRecord is not available. This indicates something has gone wrong.');
            return;
        }
        this.mutationRateLimiter =
            (_b = this.mutationRateLimiter) !== null && _b !== void 0 ? _b : new MutationRateLimiter(this.rrwebRecord, {
                onBlockedNode: function (id, node) {
                    var message = "Too many mutations on node '".concat(id, "'. Rate limiting. This could be due to SVG animations or something similar");
                    logger.info(message, {
                        node: node,
                    });
                    _this.log(LOGGER_PREFIX + ' ' + message, 'warn');
                },
            });
        var activePlugins = this._gatherRRWebPlugins();
        this.stopRrweb = this.rrwebRecord(__assign({ emit: function (event) {
                _this.onRRwebEmit(event);
            }, plugins: activePlugins }, sessionRecordingOptions));
        // We reset the last activity timestamp, resetting the idle timer
        this._lastActivityTimestamp = Date.now();
        this.isIdle = false;
        this._tryAddCustomEvent('$session_options', {
            sessionRecordingOptions: sessionRecordingOptions,
            activePlugins: activePlugins.map(function (p) { return p === null || p === void 0 ? void 0 : p.name; }),
        });
        this._tryAddCustomEvent('$posthog_config', {
            config: this.instance.config,
        });
    };
    SessionRecording.prototype._scheduleFullSnapshot = function () {
        var _this = this;
        if (this._fullSnapshotTimer) {
            clearInterval(this._fullSnapshotTimer);
        }
        // we don't schedule snapshots while idle
        if (this.isIdle) {
            return;
        }
        var interval = this.fullSnapshotIntervalMillis;
        if (!interval) {
            return;
        }
        this._fullSnapshotTimer = setInterval(function () {
            _this._tryTakeFullSnapshot();
        }, interval);
    };
    SessionRecording.prototype._gatherRRWebPlugins = function () {
        var _a, _b, _c, _d;
        var plugins = [];
        var recordConsolePlugin = (_b = (_a = assignableWindow.__PosthogExtensions__) === null || _a === void 0 ? void 0 : _a.rrwebPlugins) === null || _b === void 0 ? void 0 : _b.getRecordConsolePlugin;
        if (recordConsolePlugin && this.isConsoleLogCaptureEnabled) {
            plugins.push(recordConsolePlugin());
        }
        var networkPlugin = (_d = (_c = assignableWindow.__PosthogExtensions__) === null || _c === void 0 ? void 0 : _c.rrwebPlugins) === null || _d === void 0 ? void 0 : _d.getRecordNetworkPlugin;
        if (this.networkPayloadCapture && isFunction(networkPlugin)) {
            var canRecordNetwork = !isLocalhost() || this._forceAllowLocalhostNetworkCapture;
            if (canRecordNetwork) {
                plugins.push(networkPlugin(buildNetworkRequestOptions(this.instance.config, this.networkPayloadCapture)));
            }
            else {
                logger.info(LOGGER_PREFIX + ' NetworkCapture not started because we are on localhost.');
            }
        }
        return plugins;
    };
    SessionRecording.prototype.onRRwebEmit = function (rawEvent) {
        var _a;
        this._processQueuedEvents();
        if (!rawEvent || !isObject(rawEvent)) {
            return;
        }
        if (rawEvent.type === EventType.Meta) {
            var href = this._maskUrl(rawEvent.data.href);
            this._lastHref = href;
            if (!href) {
                return;
            }
            rawEvent.data.href = href;
        }
        else {
            this._pageViewFallBack();
        }
        // Check if the URL matches any trigger patterns
        this._checkUrlTrigger();
        // we're processing a full snapshot, so we should reset the timer
        if (rawEvent.type === EventType.FullSnapshot) {
            this._scheduleFullSnapshot();
        }
        // Clear the buffer if waiting for a trigger, and only keep data from after the current full snapshot
        if (rawEvent.type === EventType.FullSnapshot && this.urlTriggerStatus === 'trigger_pending') {
            this.clearBuffer();
        }
        var throttledEvent = this.mutationRateLimiter
            ? this.mutationRateLimiter.throttleMutations(rawEvent)
            : rawEvent;
        if (!throttledEvent) {
            return;
        }
        // TODO: Re-add ensureMaxMessageSize once we are confident in it
        var event = truncateLargeConsoleLogs(throttledEvent);
        this._updateWindowAndSessionIds(event);
        // When in an idle state we keep recording, but don't capture the events,
        if (this.isIdle && !isSessionIdleEvent(event)) {
            return;
        }
        if (isSessionIdleEvent(event)) {
            // session idle events have a timestamp when rrweb sees them
            // which can artificially lengthen a session
            // we know when we detected it based on the payload and can correct the timestamp
            var payload = event.data.payload;
            if (payload) {
                var lastActivity = payload.lastActivityTimestamp;
                var threshold = payload.threshold;
                event.timestamp = lastActivity + threshold;
            }
        }
        var eventToSend = ((_a = this.instance.config.session_recording.compress_events) !== null && _a !== void 0 ? _a : true) ? compressEvent(event) : event;
        var size = estimateSize(eventToSend);
        var properties = {
            $snapshot_bytes: size,
            $snapshot_data: eventToSend,
            $session_id: this.sessionId,
            $window_id: this.windowId,
        };
        if (this.status !== 'disabled') {
            this._captureSnapshotBuffered(properties);
        }
        else {
            this.clearBuffer();
        }
    };
    SessionRecording.prototype._pageViewFallBack = function () {
        if (this.instance.config.capture_pageview || !window) {
            return;
        }
        var currentUrl = this._maskUrl(window.location.href);
        if (this._lastHref !== currentUrl) {
            this._tryAddCustomEvent('$url_changed', { href: currentUrl });
            this._lastHref = currentUrl;
        }
    };
    SessionRecording.prototype._processQueuedEvents = function () {
        var _this = this;
        if (this.queuedRRWebEvents.length) {
            // if rrweb isn't ready to accept events earlier then we queued them up
            // now that emit has been called rrweb should be ready to accept them
            // so, before we process this event, we try our queued events _once_ each
            // we don't want to risk queuing more things and never exiting this loop!
            // if they fail here, they'll be pushed into a new queue,
            // and tried on the next loop.
            // there is a risk of this queue growing in an uncontrolled manner,
            // so its length is limited elsewhere
            // for now this is to help us ensure we can capture events that happen
            // and try to identify more about when it is failing
            var itemsToProcess = __spreadArray([], __read(this.queuedRRWebEvents), false);
            this.queuedRRWebEvents = [];
            itemsToProcess.forEach(function (queuedRRWebEvent) {
                if (Date.now() - queuedRRWebEvent.enqueuedAt <= TWO_SECONDS) {
                    _this._tryRRWebMethod(queuedRRWebEvent);
                }
            });
        }
    };
    SessionRecording.prototype._maskUrl = function (url) {
        var userSessionRecordingOptions = this.instance.config.session_recording;
        if (userSessionRecordingOptions.maskNetworkRequestFn) {
            var networkRequest = {
                url: url,
            };
            // TODO we should deprecate this and use the same function for this masking and the rrweb/network plugin
            // TODO or deprecate this and provide a new clearer name so this would be `maskURLPerformanceFn` or similar
            networkRequest = userSessionRecordingOptions.maskNetworkRequestFn(networkRequest);
            return networkRequest === null || networkRequest === void 0 ? void 0 : networkRequest.url;
        }
        return url;
    };
    SessionRecording.prototype.clearBuffer = function () {
        this.buffer = {
            size: 0,
            data: [],
            sessionId: this.sessionId,
            windowId: this.windowId,
        };
        return this.buffer;
    };
    SessionRecording.prototype._flushBuffer = function () {
        var _this = this;
        if (this.flushBufferTimer) {
            clearTimeout(this.flushBufferTimer);
            this.flushBufferTimer = undefined;
        }
        var minimumDuration = this.minimumDuration;
        var sessionDuration = this.sessionDuration;
        // if we have old data in the buffer but the session has rotated then the
        // session duration might be negative, in that case we want to flush the buffer
        var isPositiveSessionDuration = isNumber(sessionDuration) && sessionDuration >= 0;
        var isBelowMinimumDuration = isNumber(minimumDuration) && isPositiveSessionDuration && sessionDuration < minimumDuration;
        if (this.status === 'buffering' || isBelowMinimumDuration) {
            this.flushBufferTimer = setTimeout(function () {
                _this._flushBuffer();
            }, RECORDING_BUFFER_TIMEOUT);
            return this.buffer;
        }
        if (this.buffer.data.length > 0) {
            var snapshotEvents = splitBuffer(this.buffer);
            snapshotEvents.forEach(function (snapshotBuffer) {
                _this._captureSnapshot({
                    $snapshot_bytes: snapshotBuffer.size,
                    $snapshot_data: snapshotBuffer.data,
                    $session_id: snapshotBuffer.sessionId,
                    $window_id: snapshotBuffer.windowId,
                });
            });
        }
        // buffer is empty, we clear it in case the session id has changed
        return this.clearBuffer();
    };
    SessionRecording.prototype._captureSnapshotBuffered = function (properties) {
        var _this = this;
        var _a;
        var additionalBytes = 2 + (((_a = this.buffer) === null || _a === void 0 ? void 0 : _a.data.length) || 0); // 2 bytes for the array brackets and 1 byte for each comma
        if (!this.isIdle && // we never want to flush when idle
            (this.buffer.size + properties.$snapshot_bytes + additionalBytes > RECORDING_MAX_EVENT_SIZE ||
                this.buffer.sessionId !== this.sessionId)) {
            this.buffer = this._flushBuffer();
        }
        this.buffer.size += properties.$snapshot_bytes;
        this.buffer.data.push(properties.$snapshot_data);
        if (!this.flushBufferTimer && !this.isIdle) {
            this.flushBufferTimer = setTimeout(function () {
                _this._flushBuffer();
            }, RECORDING_BUFFER_TIMEOUT);
        }
    };
    SessionRecording.prototype._captureSnapshot = function (properties) {
        // :TRICKY: Make sure we batch these requests, use a custom endpoint and don't truncate the strings.
        this.instance.capture('$snapshot', properties, {
            _url: this.instance.requestRouter.endpointFor('api', this._endpoint),
            _noTruncate: true,
            _batchKey: SESSION_RECORDING_BATCH_KEY,
            skip_client_rate_limiting: true,
        });
    };
    SessionRecording.prototype._checkUrlTrigger = function () {
        if (typeof window === 'undefined' || !window.location.href) {
            return;
        }
        var url = window.location.href;
        if (this._urlTriggers.some(function (trigger) {
            switch (trigger.matching) {
                case 'regex':
                    return new RegExp(trigger.url).test(url);
                default:
                    return false;
            }
        })) {
            this._activateUrlTrigger();
        }
    };
    SessionRecording.prototype._activateUrlTrigger = function () {
        if (this.urlTriggerStatus === 'trigger_pending') {
            this.urlTriggerStatus = 'trigger_activated';
            this._tryAddCustomEvent('url trigger activated', {});
            this._flushBuffer();
            logger.info(LOGGER_PREFIX + ' recording triggered by URL pattern match');
        }
    };
    /**
     * this ignores the linked flag config and causes capture to start
     * (if recording would have started had the flag been received i.e. it does not override other config).
     *
     * It is not usual to call this directly,
     * instead call `posthog.startSessionRecording({linked_flag: true})`
     * */
    SessionRecording.prototype.overrideLinkedFlag = function () {
        this._linkedFlagSeen = true;
        this._reportStarted('linked_flag_override');
    };
    /**
     * this ignores the sampling config and causes capture to start
     * (if recording would have started had the flag been received i.e. it does not override other config).
     *
     * It is not usual to call this directly,
     * instead call `posthog.startSessionRecording({sampling: true})`
     * */
    SessionRecording.prototype.overrideSampling = function () {
        var _a;
        var _b;
        (_b = this.instance.persistence) === null || _b === void 0 ? void 0 : _b.register((_a = {},
            // short-circuits the `makeSamplingDecision` function in the session recording module
            _a[SESSION_RECORDING_IS_SAMPLED] = true,
            _a));
        this._reportStarted('sampling_override');
    };
    SessionRecording.prototype._reportStarted = function (startReason, shouldReport) {
        if (shouldReport === void 0) { shouldReport = function () { return true; }; }
        if (shouldReport()) {
            this.instance.register_for_session({
                $session_recording_start_reason: startReason,
            });
        }
    };
    return SessionRecording;
}());
export { SessionRecording };
//# sourceMappingURL=sessionrecording.js.map