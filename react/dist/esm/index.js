import posthogJs from 'posthog-js';
import React, { createContext, useMemo, useContext, useState, useEffect, useRef, useCallback } from 'react';

var PostHogContext = createContext({ client: posthogJs });

function PostHogProvider(_a) {
    var children = _a.children, client = _a.client, apiKey = _a.apiKey, options = _a.options;
    var posthog = useMemo(function () {
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
            if (posthogJs.__loaded) {
                console.warn('[PostHog.js] was already loaded elsewhere. This may cause issues.');
            }
            posthogJs.init(apiKey, options);
        }
        return posthogJs;
    }, [client, apiKey]);
    return React.createElement(PostHogContext.Provider, { value: { client: posthog } }, children);
}

var usePostHog = function () {
    var client = useContext(PostHogContext).client;
    return client;
};

function useFeatureFlagEnabled(flag) {
    var client = usePostHog();
    var _a = useState(), featureEnabled = _a[0], setFeatureEnabled = _a[1];
    useEffect(function () {
        return client.onFeatureFlags(function () {
            setFeatureEnabled(client.isFeatureEnabled(flag));
        });
    }, [client, flag]);
    return featureEnabled;
}

function useFeatureFlagPayload(flag) {
    var client = usePostHog();
    var _a = useState(), featureFlagPayload = _a[0], setFeatureFlagPayload = _a[1];
    useEffect(function () {
        return client.onFeatureFlags(function () {
            setFeatureFlagPayload(client.getFeatureFlagPayload(flag));
        });
    }, [client, flag]);
    return featureFlagPayload;
}

function useActiveFeatureFlags() {
    var client = usePostHog();
    var _a = useState(), featureFlags = _a[0], setFeatureFlags = _a[1];
    useEffect(function () {
        return client.onFeatureFlags(function (flags) {
            setFeatureFlags(flags);
        });
    }, [client]);
    return featureFlags;
}

function useFeatureFlagVariantKey(flag) {
    var client = usePostHog();
    var _a = useState(), featureFlagVariantKey = _a[0], setFeatureFlagVariantKey = _a[1];
    useEffect(function () {
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
        return (React.createElement(VisibilityAndClickTracker, __assign({ flag: flag, options: visibilityObserverOptions, trackInteraction: shouldTrackInteraction, trackView: shouldTrackView }, props), childNode));
    }
    return React.createElement(React.Fragment, null, fallback);
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
    var ref = useRef(null);
    var posthog = usePostHog();
    var visibilityTrackedRef = useRef(false);
    var clickTrackedRef = useRef(false);
    var cachedOnClick = useCallback(function () {
        if (!clickTrackedRef.current && trackInteraction) {
            captureFeatureInteraction(flag, posthog);
            clickTrackedRef.current = true;
        }
    }, [flag, posthog, trackInteraction]);
    useEffect(function () {
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
    return (React.createElement("div", __assign({ ref: ref }, props, { onClick: cachedOnClick }), children));
}

export { PostHogContext, PostHogFeature, PostHogProvider, useActiveFeatureFlags, useFeatureFlagEnabled, useFeatureFlagPayload, useFeatureFlagVariantKey, usePostHog };
