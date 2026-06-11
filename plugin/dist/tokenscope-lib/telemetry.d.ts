import type { ModelTokenUsage, TokenUsage } from "./types.js";
export interface TelemetryCall {
    providerID?: string;
    modelID?: string;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    cost: number;
    providerTotalTokens?: number;
}
export interface TelemetrySummary {
    assistantMessageCount: number;
    apiCallCount: number;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    callsWithCacheRead: number;
    callsWithCacheWrite: number;
    sessionCost: number;
    mostRecentInput: number;
    mostRecentOutput: number;
    mostRecentReasoning: number;
    mostRecentCacheRead: number;
    mostRecentCacheWrite: number;
    mostRecentCost: number;
    mostRecentProviderTotalTokens?: number;
    perModelUsage: ModelTokenUsage[];
}
type ModelRefLike = {
    providerID?: string;
    modelID?: string;
    id?: string;
};
type TelemetryPartLike = {
    type?: string;
    tokens?: TokenUsage;
    cost?: number;
    model?: ModelRefLike;
};
type TelemetryMessageLike = {
    info?: {
        role?: string;
        tokens?: TokenUsage;
        cost?: number;
        providerID?: string;
        modelID?: string;
        model?: ModelRefLike;
    };
    data?: {
        role?: string;
        tokens?: TokenUsage;
        cost?: number;
        providerID?: string;
        modelID?: string;
        model?: ModelRefLike;
    };
    role?: string;
    type?: string;
    providerID?: string;
    modelID?: string;
    tokens?: TokenUsage;
    cost?: number;
    model?: ModelRefLike;
    parts?: TelemetryPartLike[];
};
export declare function collectTelemetryCalls(messages: TelemetryMessageLike[]): TelemetryCall[];
export declare function summarizeTelemetry(messages: TelemetryMessageLike[]): TelemetrySummary;
export declare function firstCacheWriteTokens(messages: TelemetryMessageLike[]): number;
export {};
//# sourceMappingURL=telemetry.d.ts.map