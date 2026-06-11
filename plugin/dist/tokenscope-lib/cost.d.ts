import type { TokenAnalysis, CostEstimate, ModelPricing, ModelTokenUsage, ModelTokenUsageSegment, TokenCostBreakdown } from "./types.js";
type PriceableTokenUsage = Pick<ModelTokenUsage | ModelTokenUsageSegment, "inputTokens" | "outputTokens" | "reasoningTokens" | "cacheReadTokens" | "cacheWriteTokens">;
export declare class CostCalculator {
    private pricingData;
    constructor(pricingData: Record<string, ModelPricing>);
    calculateCost(analysis: TokenAnalysis): CostEstimate;
    private calculatePerModelCosts;
    calculateUsageCost(modelUsage: PriceableTokenUsage, pricing: ModelPricing): TokenCostBreakdown;
    calculateModelUsageCost(modelUsage: ModelTokenUsage, pricing: ModelPricing): TokenCostBreakdown;
    private sumCostBreakdowns;
    private calculateUsageCostForRate;
    private calculateUncachedInputCost;
    private selectPricingRate;
    resolvePricingModelName(modelUsage: ModelTokenUsage, fallbackPricingModelName: string): string;
    private buildFallbackUsage;
    buildLookupKey(providerID?: string, modelID?: string): string;
    getPricing(modelName: string): ModelPricing;
    hasPricing(modelName: string): boolean;
    private findPricing;
    private findLongestPrefixMatch;
    private normalizeModelName;
}
export {};
//# sourceMappingURL=cost.d.ts.map