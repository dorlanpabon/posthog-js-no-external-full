(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('posthog-js'), require('react')) :
    typeof define === 'function' && define.amd ? define(['exports', 'posthog-js', 'react'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.PosthogReact = {}, global.posthogJs, global.React));
})(this, (function (exports, posthogJs, React) { 'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var posthogJs__default = /*#__PURE__*/_interopDefaultLegacy(posthogJs);
    var React__default = /*#__PURE__*/_interopDefaultLegacy(React);

    var PostHogContext = React.createContext({ client: posthogJs__default["default"] });

    function PostHogProvider(_a) {
        var children = _a.children, client = _a.client, apiKey = _a.apiKey, options = _a.options;
        var posthog = React.useMemo(function () {
            if (client && apiKey) {
                console.warn('[PostHog.js] You have provided both a client and an apiKey to PostHogProvider. The apiKey will be ignored in favour of the client.');
            }
            if (client && options) {
                console.warn('[PostHog.js] You have provided both a client and options to PostHogProvider. The options will be ignored in favour of the client.');
            }
            if (client) {
                return client;
            }
            if (apiKey) {
                if (posthogJs__default["default"].__loaded) {
                    console.warn('[PostHog.js] was already loaded elsewhere. This may cause issues.');
                }
                posthogJs__default["default"].init(apiKey, options);
            }
            return posthogJs__default["default"];
        }, [client, apiKey]);
        return React__default["default"].createElement(PostHogContext.Provider, { value: { client: posthog } }, children);
    }

    var usePostHog = function () {
        var client = React.useContext(PostHogContext).client;
        return client;
    };

    function useFeatureFlagEnabled(flag) {
        var client = usePostHog();
        var _a = React.useState(), featureEnabled = _a[0], setFeatureEnabled = _a[1];
        React.useEffect(function () {
            return client.onFeatureFlags(function () {
                setFeatureEnabled(client.isFeatureEnabled(flag));
            });
        }, [client, flag]);
        return featureEnabled;
    }

    function useFeatureFlagPayload(flag) {
        var client = usePostHog();
        var _a = React.useState(), featureFlagPayload = _a[0], setFeatureFlagPayload = _a[1];
        React.useEffect(function () {
            return client.onFeatureFlags(function () {
                setFeatureFlagPayload(client.getFeatureFlagPayload(flag));
            });
        }, [client, flag]);
        return featureFlagPayload;
    }

    function useActiveFeatureFlags() {
        var client = usePostHog();
        var _a = React.useState(), featureFlags = _a[0], setFeatureFlags = _a[1];
        React.useEffect(function () {
            return client.onFeatureFlags(function (flags) {
                setFeatureFlags(flags);
            });
        }, [client]);
        return featureFlags;
    }

    function useFeatureFlagVariantKey(flag) {
        var client = usePostHog();
        var _a = React.useState(), featureFlagVariantKey = _a[0], setFeatureFlagVariantKey = _a[1];
        React.useEffect(function () {
            return client.onFeatureFlags(function () {
                setFeatureFlagVariantKey(client.getFeatureFlag(flag));
            });
        }, [client, flag]);
        return featureFlagVariantKey;
    }

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }

    function PostHogFeature(_a) {
        var flag = _a.flag, match = _a.match, children = _a.children, fallback = _a.fallback, visibilityObserverOptions = _a.visibilityObserverOptions, trackInteraction = _a.trackInteraction, trackView = _a.trackView, props = __rest(_a, ["flag", "match", "children", "fallback", "visibilityObserverOptions", "trackInteraction", "trackView"]);
        var payload = useFeatureFlagPayload(flag);
        var variant = useFeatureFlagVariantKey(flag);
        var shouldTrackInteraction = trackInteraction !== null && trackInteraction !== void 0 ? trackInteraction : true;
        var shouldTrackView = trackView !== null && trackView !== void 0 ? trackView : true;
        if (match === undefined || variant === match) {
            var childNode = typeof children === 'function' ? children(payload) : children;
            return (React__default["default"].createElement(VisibilityAndClickTracker, __assign({ flag: flag, options: visibilityObserverOptions, trackInteraction: shouldTrackInteraction, trackView: shouldTrackView }, props), childNode));
        }
        return React__default["default"].createElement(React__default["default"].Fragment, null, fallback);
    }
    function captureFeatureInteraction(flag, posthog) {
        var _a;
        posthog.capture('$feature_interaction', { feature_flag: flag, $set: (_a = {}, _a["$feature_interaction/".concat(flag)] = true, _a) });
    }
    function captureFeatureView(flag, posthog) {
        posthog.capture('$feature_view', { feature_flag: flag });
    }
    function VisibilityAndClickTracker(_a) {
        var flag = _a.flag, children = _a.children, trackInteraction = _a.trackInteraction, trackView = _a.trackView, options = _a.options, props = __rest(_a, ["flag", "children", "trackInteraction", "trackView", "options"]);
        var ref = React.useRef(null);
        var posthog = usePostHog();
        var visibilityTrackedRef = React.useRef(false);
        var clickTrackedRef = React.useRef(false);
        var cachedOnClick = React.useCallback(function () {
            if (!clickTrackedRef.current && trackInteraction) {
                captureFeatureInteraction(flag, posthog);
                clickTrackedRef.current = true;
            }
        }, [flag, posthog, trackInteraction]);
        React.useEffect(function () {
            if (ref.current === null || !trackView)
                return;
            var onIntersect = function (entry) {
                if (!visibilityTrackedRef.current && entry.isIntersecting) {
                    captureFeatureView(flag, posthog);
                    visibilityTrackedRef.current = true;
                }
            };
            var observer = new IntersectionObserver(function (_a) {
                var entry = _a[0];
                return onIntersect(entry);
            }, __assign({ threshold: 0.1 }, options));
            observer.observe(ref.current);
            return function () { return observer.disconnect(); };
        }, [flag, options, posthog, ref, trackView]);
        return (React__default["default"].createElement("div", __assign({ ref: ref }, props, { onClick: cachedOnClick }), children));
    }

    exports.PostHogContext = PostHogContext;
    exports.PostHogFeature = PostHogFeature;
    exports.PostHogProvider = PostHogProvider;
    exports.useActiveFeatureFlags = useActiveFeatureFlags;
    exports.useFeatureFlagEnabled = useFeatureFlagEnabled;
    exports.useFeatureFlagPayload = useFeatureFlagPayload;
    exports.useFeatureFlagVariantKey = useFeatureFlagVariantKey;
    exports.usePostHog = usePostHog;

}));
