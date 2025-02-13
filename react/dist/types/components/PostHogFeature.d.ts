import React from 'react';
export type PostHogFeatureProps = React.HTMLProps<HTMLDivElement> & {
    flag: string;
    children: React.ReactNode | ((payload: any) => React.ReactNode);
    fallback?: React.ReactNode;
    match?: string | boolean;
    visibilityObserverOptions?: IntersectionObserverInit;
    trackInteraction?: boolean;
    trackView?: boolean;
};
export declare function PostHogFeature({ flag, match, children, fallback, visibilityObserverOptions, trackInteraction, trackView, ...props }: PostHogFeatureProps): JSX.Element | null;
//# sourceMappingURL=PostHogFeature.d.ts.map