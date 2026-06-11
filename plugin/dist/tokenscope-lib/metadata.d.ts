import type { ModelPricing } from "./types.js";
import { type RoutingParams } from "./opencode.js";
import { WarningCollector } from "./warnings.js";
export declare class ModelMetadataResolver {
    private client;
    private routing;
    private warnings?;
    private pricingCache?;
    constructor(client: any, routing?: RoutingParams, warnings?: WarningCollector | undefined);
    mergePricingData(basePricing: Record<string, ModelPricing>): Promise<Record<string, ModelPricing>>;
    private loadLivePricing;
    private extractPricing;
    private toModelPricing;
    private extractContextOver200k;
    private toContextPricing;
    private mergeModelPricing;
    private canMergeLivePricing;
    private hasAnyNonZeroPricing;
    private mergeContextOver200k;
    private safeNumber;
    private buildPricingKey;
    private countBareModelKeys;
    private extractBareModelKey;
}
//# sourceMappingURL=metadata.d.ts.map