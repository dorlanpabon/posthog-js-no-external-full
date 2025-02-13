import { PostHogConfig } from 'posthog-js';
import React from 'react';
import { PostHog } from './PostHogContext';
export declare function PostHogProvider({ children, client, apiKey, options, }: {
    children?: React.ReactNode;
    client?: PostHog | undefined;
    apiKey?: string | undefined;
    options?: Partial<PostHogConfig> | undefined;
}): React.JSX.Element;
//# sourceMappingURL=PostHogProvider.d.ts.map