import { Properties } from '../types';
export declare const CAMPAIGN_PARAMS: string[];
export declare const Info: {
    campaignParams: (customParams?: string[]) => Record<string, string>;
    _campaignParamsFromUrl: (url: string, customParams?: string[]) => Record<string, string>;
    _searchEngine: (referrer: string) => string | null;
    _searchInfoFromReferrer: (referrer: string) => Record<string, any>;
    searchInfo: () => Record<string, any>;
    /**
     * This function detects which browser is running this script.
     * The order of the checks are important since many user agents
     * include keywords used in later checks.
     */
    browser: (user_agent: string, vendor: string | undefined) => string;
    /**
     * This function detects which browser version is running this script,
     * parsing major and minor version (e.g., 42.1). User agent strings from:
     * http://www.useragentstring.com/pages/useragentstring.php
     *
     * `navigator.vendor` is passed in and used to help with detecting certain browsers
     * NB `navigator.vendor` is deprecated and not present in every browser
     */
    browserVersion: (userAgent: string, vendor: string | undefined) => number | null;
    browserLanguage: () => string;
    os: (user_agent: string) => [string, string];
    device: (user_agent: string) => string;
    deviceType: (user_agent: string) => string;
    referrer: () => string;
    referringDomain: () => string;
    referrerInfo: () => Record<string, any>;
    initialPersonInfo: () => Record<string, any>;
    initialPersonPropsFromInfo: (info: Record<string, any>) => Record<string, any>;
    properties: () => Properties;
    people_properties: () => Properties;
};
