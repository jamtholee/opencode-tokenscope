export interface SessionMessage {
    info: SessionMessageInfo;
    parts: SessionMessagePart[];
    data?: {
        role?: string;
        model?: {
            providerID?: string;
            modelID?: string;
            id?: string;
        };
        providerID?: string;
        modelID?: string;
        tokens?: TokenUsage;
        cost?: number;
    };
    model?: {
        providerID?: string;
        modelID?: string;
        id?: string;
    };
    providerID?: string;
    modelID?: string;
}
export interface SessionMessageInfo {
    id: string;
    role: string;
    agent?: string;
    model?: {
        providerID?: string;
        modelID?: string;
        id?: string;
    };
    modelID?: string;
    providerID?: string;
    system?: string | string[];
    tokens?: TokenUsage;
    cost?: number;
}
export interface TokenUsage {
    total?: number;
    input?: number;
    output?: number;
    reasoning?: number;
    cache?: {
        read?: number;
        write?: number;
    };
}
export type SessionMessagePart = {
    type: "text";
    text: string;
    synthetic?: boolean;
} | {
    type: "reasoning";
    text: string;
} | {
    type: "tool";
    tool: string;
    state: ToolState;
} | {
    type: string;
    [key: string]: unknown;
};
export interface ToolState {
    status: "pending" | "running" | "completed" | "error";
    input?: Record<string, unknown>;
    output?: string;
    title?: string;
    metadata?: Record<string, unknown>;
    time?: {
        start?: number;
        end?: number;
        compacted?: number;
    };
}
export interface CategoryEntry {
    label: string;
    tokens: number;
}
export interface CategorySummary {
    label: string;
    totalTokens: number;
    entries: CategoryEntry[];
    allEntries: CategoryEntry[];
}
export interface TokenAnalysis {
    sessionID: string;
    model: TokenModel;
    pricingModelName?: string;
    categories: {
        system: CategorySummary;
        user: CategorySummary;
        assistant: CategorySummary;
        tools: CategorySummary;
        reasoning: CategorySummary;
    };
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    assistantMessageCount: number;
    apiCallCount: number;
    callsWithCacheRead: number;
    callsWithCacheWrite: number;
    mostRecentInput: number;
    mostRecentOutput: number;
    mostRecentReasoning: number;
    mostRecentCacheRead: number;
    mostRecentCacheWrite: number;
    mostRecentProviderTotalTokens?: number;
    sessionCost: number;
    mostRecentCost: number;
    allToolsCalled: string[];
    toolCallCounts: Map<string, number>;
    perModelUsage: ModelTokenUsage[];
    warnings: string[];
    subagentAnalysis?: SubagentAnalysis;
    contextBreakdown?: ContextBreakdown;
    toolEstimates?: ToolSchemaEstimate[];
    cacheEfficiency?: CacheEfficiency;
    skillAnalysis?: SkillAnalysis;
}
export interface TokenModel {
    name: string;
    spec: TokenizerSpec;
}
export type TokenizerSpec = {
    kind: "tiktoken";
    model: string;
} | {
    kind: "huggingface";
    hub: string;
} | {
    kind: "approx";
};
export interface CategoryEntrySource {
    label: string;
    content: string;
}
export interface CostEstimate {
    isSubscription: boolean;
    apiSessionCost: number;
    apiMostRecentCost: number;
    estimatedSessionCost: number;
    estimatedInputCost: number;
    estimatedOutputCost: number;
    estimatedCacheReadCost: number;
    estimatedCacheWriteCost: number;
    pricePerMillionInput: number;
    pricePerMillionOutput: number;
    pricePerMillionCacheRead: number;
    pricePerMillionCacheWrite: number;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    perModelCosts: ModelCostEstimate[];
    unknownPricingModels: string[];
}
export interface ModelTokenUsage {
    providerID?: string;
    modelID?: string;
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    apiCost: number;
    apiCallCount: number;
    callsWithCacheRead: number;
    callsWithCacheWrite: number;
    costSegments?: ModelTokenUsageSegment[];
}
export interface ModelTokenUsageSegment {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    apiCallCount: number;
}
export type PricingTier = "context_over_200k" | "mixed_context_tiers";
export interface TokenCostBreakdown {
    estimatedSessionCost: number;
    estimatedInputCost: number;
    estimatedOutputCost: number;
    estimatedCacheReadCost: number;
    estimatedCacheWriteCost: number;
    estimatedInputCostWithoutCaching: number;
    pricePerMillionInput: number;
    pricePerMillionOutput: number;
    pricePerMillionCacheRead: number;
    pricePerMillionCacheWrite: number;
    pricingTier?: PricingTier;
}
export interface ModelCostEstimate extends ModelTokenUsage, TokenCostBreakdown {
    pricingModelName: string;
    hasPricing: boolean;
}
export interface EstimatedCostComponents {
    estimatedInputCost: number;
    estimatedOutputCost: number;
    estimatedCacheReadCost: number;
    estimatedCacheWriteCost: number;
}
export interface SubagentSummary extends EstimatedCostComponents {
    sessionID: string;
    title: string;
    agentType: string;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    totalTokens: number;
    apiCost: number;
    estimatedCost: number;
    assistantMessageCount: number;
    apiCallCount: number;
}
export interface SubagentAnalysis extends EstimatedCostComponents {
    subagents: SubagentSummary[];
    totalInputTokens: number;
    totalOutputTokens: number;
    totalReasoningTokens: number;
    totalCacheReadTokens: number;
    totalCacheWriteTokens: number;
    totalTokens: number;
    totalApiCost: number;
    totalEstimatedCost: number;
    totalApiCalls: number;
}
export interface ContextComponent {
    tokens: number;
    identified: boolean;
}
export interface ContextBreakdown {
    baseSystemPrompt: ContextComponent;
    toolDefinitions: ContextComponent & {
        toolCount: number;
    };
    environmentContext: ContextComponent & {
        components: string[];
    };
    projectTree: ContextComponent & {
        fileCount: number;
    };
    customInstructions: ContextComponent & {
        sources: string[];
    };
    totalCachedContext: number;
}
export interface ToolSchemaEstimate {
    name: string;
    enabled: boolean;
    estimatedTokens: number;
    argumentCount: number;
    hasComplexArgs: boolean;
    source?: "opencode-api" | "transcript";
}
export interface AvailableSkill {
    name: string;
    description: string;
    tokens: number;
}
export interface LoadedSkill {
    name: string;
    callCount: number;
    firstMessageIndex: number;
    tokens: number;
    totalTokens: number;
    content: string;
}
export interface AvailableSubagent {
    name: string;
    description: string;
    tokens: number;
}
export interface SkillAnalysis {
    availableSkills: AvailableSkill[];
    availableSubagents: AvailableSubagent[];
    loadedSkills: LoadedSkill[];
    totalAvailableTokens: number;
    totalAvailableSubagentTokens: number;
    totalLoadedTokens: number;
    availableSkillsContextTokens: number;
    skillToolDescriptionTokens: number;
    taskToolDescriptionTokens: number;
}
export interface CacheEfficiency {
    cacheReadTokens: number;
    freshInputTokens: number;
    cacheWriteTokens: number;
    totalInputTokens: number;
    cacheHitRate: number;
    costWithoutCaching: number;
    costWithCaching: number;
    costSavings: number;
    savingsPercent: number;
    effectiveRate: number;
    standardRate: number;
}
export interface ExportedSession {
    info: ExportedSessionInfo;
    messages: ExportedMessage[];
}
export interface ExportedSessionInfo {
    id: string;
    title: string;
    parentID?: string;
}
export interface ExportedMessage {
    info: ExportedMessageInfo;
    parts: ExportedPart[];
}
export interface ExportedMessageInfo {
    id: string;
    role: "user" | "assistant";
    agent?: string;
    model?: {
        providerID?: string;
        modelID?: string;
    };
    system?: string | string[];
    tools?: Record<string, boolean>;
    tokens?: TokenUsage;
    cost?: number;
    modelID?: string;
    providerID?: string;
}
export interface ExportedPart {
    type: string;
    tool?: string;
    state?: {
        status: string;
        input?: Record<string, unknown>;
    };
}
export interface TokenscopeConfig {
    enableContextBreakdown: boolean;
    enableToolSchemaEstimation: boolean;
    enableCacheEfficiency: boolean;
    enableSubagentAnalysis: boolean;
    enableDetailedSubagentCostBreakdown: boolean;
    enableSkillAnalysis: boolean;
}
export interface ContextAnalysisResult {
    contextBreakdown?: ContextBreakdown;
    toolEstimates?: ToolSchemaEstimate[];
    cacheEfficiency?: CacheEfficiency;
}
export interface ModelPricing {
    input: number;
    output: number;
    cacheWrite: number;
    cacheRead: number;
    contextWindow?: number;
    contextOver200k?: {
        input: number;
        output: number;
        cacheWrite: number;
        cacheRead: number;
        threshold?: number;
    };
}
export interface ChildSession {
    id: string;
    title: string;
    parentID?: string;
}
export declare function isToolPart(part: SessionMessagePart): part is {
    type: "tool";
    tool: string;
    state: ToolState;
};
export declare function isReasoningPart(part: SessionMessagePart): part is {
    type: "reasoning";
    text: string;
};
export declare function isTextPart(part: SessionMessagePart): part is {
    type: "text";
    text: string;
    synthetic?: boolean;
};
//# sourceMappingURL=types.d.ts.map