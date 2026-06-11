import type { CacheEfficiency, CategoryEntry, TokenAnalysis } from "./types.js";
export declare const BAR_WIDTH = 30;
export declare const TOKEN_SPACING = 11;
export declare const CATEGORY_LABEL_WIDTH = 9;
export declare const TOOL_LABEL_WIDTH = 20;
export declare const TOP_CONTRIBUTOR_LABEL_WIDTH = 30;
export declare const CONTEXT_LABEL_WIDTH = 22;
export declare const TOOL_ESTIMATE_LABEL_WIDTH = 18;
export declare const SKILL_NAME_WIDTH = 22;
export declare const SKILL_DESC_WIDTH = 45;
export declare const SUBAGENT_NAME_WIDTH = 22;
export declare const SUBAGENT_DESC_WIDTH = 50;
export declare function formatNumber(value: number): string;
export declare function formatCategoryBar(label: string, tokens: number, total: number, labelWidth?: number): string;
export declare function formatContextBar(label: string, tokens: number, total: number): string;
export declare function formatEfficiencyBar(value: number, total: number): string;
export declare function collectTopEntries(analysis: TokenAnalysis, limit: number): CategoryEntry[];
export declare function calculateModelAwareCacheEfficiency(efficiency: CacheEfficiency, cost: {
    perModelCosts: Array<{
        inputTokens: number;
        cacheReadTokens: number;
        cacheWriteTokens: number;
        pricePerMillionInput: number;
        estimatedInputCost: number;
        estimatedInputCostWithoutCaching?: number;
        estimatedCacheReadCost: number;
        estimatedCacheWriteCost: number;
    }>;
}): CacheEfficiency;
//# sourceMappingURL=formatter-helpers.d.ts.map