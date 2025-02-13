/*
 * Constants
 */
/* PROPERTY KEYS */
// This key is deprecated, but we want to check for it to see whether aliasing is allowed.
export var PEOPLE_DISTINCT_ID_KEY = '$people_distinct_id';
export var DISTINCT_ID = 'distinct_id';
export var ALIAS_ID_KEY = '__alias';
export var CAMPAIGN_IDS_KEY = '__cmpns';
export var EVENT_TIMERS_KEY = '__timers';
export var AUTOCAPTURE_DISABLED_SERVER_SIDE = '$autocapture_disabled_server_side';
export var HEATMAPS_ENABLED_SERVER_SIDE = '$heatmaps_enabled_server_side';
export var EXCEPTION_CAPTURE_ENABLED_SERVER_SIDE = '$exception_capture_enabled_server_side';
export var EXCEPTION_CAPTURE_ENDPOINT_SUFFIX = '$exception_capture_endpoint_suffix';
export var WEB_VITALS_ENABLED_SERVER_SIDE = '$web_vitals_enabled_server_side';
export var WEB_VITALS_ALLOWED_METRICS = '$web_vitals_allowed_metrics';
export var SESSION_RECORDING_ENABLED_SERVER_SIDE = '$session_recording_enabled_server_side';
export var CONSOLE_LOG_RECORDING_ENABLED_SERVER_SIDE = '$console_log_recording_enabled_server_side';
export var SESSION_RECORDING_NETWORK_PAYLOAD_CAPTURE = '$session_recording_network_payload_capture';
export var SESSION_RECORDING_CANVAS_RECORDING = '$session_recording_canvas_recording';
export var SESSION_RECORDING_SAMPLE_RATE = '$replay_sample_rate';
export var SESSION_RECORDING_MINIMUM_DURATION = '$replay_minimum_duration';
export var SESSION_ID = '$sesid';
export var SESSION_RECORDING_IS_SAMPLED = '$session_is_sampled';
export var SESSION_RECORDING_URL_TRIGGER_ACTIVATED_SESSION = '$session_recording_url_trigger_activated_session';
export var SESSION_RECORDING_URL_TRIGGER_STATUS = '$session_recording_url_trigger_status';
export var ENABLED_FEATURE_FLAGS = '$enabled_feature_flags';
export var PERSISTENCE_EARLY_ACCESS_FEATURES = '$early_access_features';
export var STORED_PERSON_PROPERTIES_KEY = '$stored_person_properties';
export var STORED_GROUP_PROPERTIES_KEY = '$stored_group_properties';
export var SURVEYS = '$surveys';
export var SURVEYS_ACTIVATED = '$surveys_activated';
export var FLAG_CALL_REPORTED = '$flag_call_reported';
export var USER_STATE = '$user_state';
export var CLIENT_SESSION_PROPS = '$client_session_props';
export var CAPTURE_RATE_LIMIT = '$capture_rate_limit';
/** @deprecated Delete this when INITIAL_PERSON_INFO has been around for long enough to ignore backwards compat */
export var INITIAL_CAMPAIGN_PARAMS = '$initial_campaign_params';
/** @deprecated Delete this when INITIAL_PERSON_INFO has been around for long enough to ignore backwards compat */
export var INITIAL_REFERRER_INFO = '$initial_referrer_info';
export var INITIAL_PERSON_INFO = '$initial_person_info';
export var ENABLE_PERSON_PROCESSING = '$epp';
export var TOOLBAR_ID = '__POSTHOG_TOOLBAR__';
export var WEB_EXPERIMENTS = '$web_experiments';
// These are properties that are reserved and will not be automatically included in events
export var PERSISTENCE_RESERVED_PROPERTIES = [
    PEOPLE_DISTINCT_ID_KEY,
    ALIAS_ID_KEY,
    CAMPAIGN_IDS_KEY,
    EVENT_TIMERS_KEY,
    SESSION_RECORDING_ENABLED_SERVER_SIDE,
    HEATMAPS_ENABLED_SERVER_SIDE,
    SESSION_ID,
    ENABLED_FEATURE_FLAGS,
    USER_STATE,
    PERSISTENCE_EARLY_ACCESS_FEATURES,
    STORED_GROUP_PROPERTIES_KEY,
    STORED_PERSON_PROPERTIES_KEY,
    SURVEYS,
    FLAG_CALL_REPORTED,
    CLIENT_SESSION_PROPS,
    CAPTURE_RATE_LIMIT,
    INITIAL_CAMPAIGN_PARAMS,
    INITIAL_REFERRER_INFO,
    ENABLE_PERSON_PROCESSING,
];
//# sourceMappingURL=constants.js.map