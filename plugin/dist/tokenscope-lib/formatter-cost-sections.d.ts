import type { CostEstimate } from "./types.js";
export interface DetailedSubagentBreakdown {
    freshInputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    estimatedInputCost: number;
    estimatedCacheReadCost: number;
    estimatedCacheWriteCost: number;
    estimatedOutputCost: number;
}
export declare function formatCostEstimateLines(cost: CostEstimate): string[];
export declare function formatDetailedSubagentBreakdownLines(breakdown: DetailedSubagentBreakdown, indent?: string): string[];
//# sourceMappingURL=formatter-cost-sections.d.ts.map