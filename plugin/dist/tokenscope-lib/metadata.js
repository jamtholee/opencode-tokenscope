import { fetchProviderList, unwrapResponseData } from "./opencode.js";
import { formatErrorMessage } from "./warnings.js";
export class ModelMetadataResolver {
    client;
    routing;
    warnings;
    pricingCache;
    constructor(client, routing = {}, warnings) {
        this.client = client;
        this.routing = routing;
        this.warnings = warnings;
    }
    async mergePricingData(basePricing) {
        const livePricing = await this.loadLivePricing();
        if (Object.keys(livePricing).length === 0)
            return basePricing;
        const merged = { ...basePricing };
        const liveBareKeyCounts = this.countBareModelKeys(livePricing);
        for (const [modelKey, pricing] of Object.entries(livePricing)) {
            const bareModelKey = this.extractBareModelKey(modelKey);
            const bundledPricing = basePricing[modelKey] ?? (bareModelKey ? basePricing[bareModelKey] : undefined);
            if (!this.canMergeLivePricing(bundledPricing, pricing))
                continue;
            merged[modelKey] = this.mergeModelPricing(basePricing[modelKey], pricing);
            if (bareModelKey &&
                liveBareKeyCounts.get(bareModelKey) === 1 &&
                this.canMergeLivePricing(basePricing[bareModelKey] ?? bundledPricing, pricing)) {
                merged[bareModelKey] = this.mergeModelPricing(basePricing[bareModelKey], pricing);
            }
        }
        return merged;
    }
    async loadLivePricing() {
        if (this.pricingCache)
            return this.pricingCache;
        try {
            const response = await fetchProviderList(this.client, this.routing);
            const data = unwrapResponseData(response ?? {});
            this.pricingCache = this.extractPricing(data);
        }
        catch (error) {
            this.warnings?.add(`Could not fetch live OpenCode provider metadata. Cost estimates will use bundled pricing: ${formatErrorMessage(error)}`, "provider-metadata");
            this.pricingCache = {};
        }
        return this.pricingCache;
    }
    extractPricing(data) {
        const pricing = {};
        for (const provider of data.all ?? []) {
            if (!provider.id || !provider.models)
                continue;
            for (const [modelKey, model] of Object.entries(provider.models)) {
                if (!model.cost)
                    continue;
                const modelPricing = this.toModelPricing(model);
                if (!modelPricing)
                    continue;
                for (const modelID of new Set([model.id, modelKey].filter(Boolean))) {
                    pricing[this.buildPricingKey(provider.id, modelID)] = modelPricing;
                }
            }
        }
        return pricing;
    }
    toModelPricing(model) {
        if (!model.cost)
            return undefined;
        const input = this.safeNumber(model.cost.input);
        const output = this.safeNumber(model.cost.output);
        const cacheRead = this.safeNumber(model.cost.cache?.read) ?? this.safeNumber(model.cost.cache_read);
        const cacheWrite = this.safeNumber(model.cost.cache?.write) ?? this.safeNumber(model.cost.cache_write);
        const contextWindow = this.safeNumber(model.limit?.context);
        const contextOver200k = this.extractContextOver200k(model.cost);
        return {
            input,
            output,
            cacheRead,
            cacheWrite,
            contextWindow,
            contextOver200k: contextOver200k ? this.toContextPricing(contextOver200k, input, output, cacheRead, cacheWrite) : undefined,
        };
    }
    extractContextOver200k(cost) {
        if (cost.experimentalOver200K)
            return { ...cost.experimentalOver200K };
        if (cost.context_over_200k)
            return { ...cost.context_over_200k };
        const tier = cost.tiers
            ?.filter((tier) => tier.tier?.type === "context" && this.safeNumber(tier.tier.size) !== undefined)
            .sort((a, b) => this.safeNumber(a.tier?.size) - this.safeNumber(b.tier?.size))
            .find((tier) => this.safeNumber(tier.tier?.size) >= 200_000);
        if (!tier)
            return undefined;
        return { ...tier, threshold: this.safeNumber(tier.tier?.size) };
    }
    toContextPricing(contextCost, input, output, cacheRead, cacheWrite) {
        const pricing = {
            input: this.safeNumber(contextCost.input) ?? input,
            output: this.safeNumber(contextCost.output) ?? output,
            cacheRead: this.safeNumber(contextCost.cache?.read) ?? this.safeNumber(contextCost.cache_read) ?? cacheRead,
            cacheWrite: this.safeNumber(contextCost.cache?.write) ?? this.safeNumber(contextCost.cache_write) ?? cacheWrite,
        };
        const threshold = this.safeNumber(contextCost.threshold);
        if (threshold !== undefined && threshold !== 200_000)
            pricing.threshold = threshold;
        return pricing;
    }
    mergeModelPricing(base, live) {
        const input = live.input ?? base?.input ?? 1;
        const output = live.output ?? base?.output ?? 3;
        const cacheRead = live.cacheRead ?? base?.cacheRead ?? 0;
        const cacheWrite = live.cacheWrite ?? base?.cacheWrite ?? 0;
        return {
            input,
            output,
            cacheRead,
            cacheWrite,
            contextWindow: live.contextWindow ?? base?.contextWindow,
            contextOver200k: this.mergeContextOver200k(base?.contextOver200k, live.contextOver200k, {
                input,
                output,
                cacheRead,
                cacheWrite,
            }),
        };
    }
    canMergeLivePricing(base, live) {
        if (base && this.hasAnyNonZeroPricing(base) && !this.hasAnyNonZeroPricing(live))
            return false;
        return !!base || (live.input !== undefined && live.output !== undefined);
    }
    hasAnyNonZeroPricing(pricing) {
        if (!pricing)
            return false;
        return [
            pricing.input,
            pricing.output,
            pricing.cacheRead,
            pricing.cacheWrite,
            pricing.contextOver200k?.input,
            pricing.contextOver200k?.output,
            pricing.contextOver200k?.cacheRead,
            pricing.contextOver200k?.cacheWrite,
        ].some((value) => value !== undefined && value !== 0);
    }
    mergeContextOver200k(base, live, normalPricing) {
        if (!base && !live)
            return undefined;
        const merged = {
            input: live?.input ?? base?.input ?? normalPricing.input,
            output: live?.output ?? base?.output ?? normalPricing.output,
            cacheRead: live?.cacheRead ?? base?.cacheRead ?? normalPricing.cacheRead,
            cacheWrite: live?.cacheWrite ?? base?.cacheWrite ?? normalPricing.cacheWrite,
        };
        const threshold = live?.threshold ?? base?.threshold;
        if (threshold !== undefined)
            merged.threshold = threshold;
        return merged;
    }
    safeNumber(value) {
        return typeof value === "number" && Number.isFinite(value) ? value : undefined;
    }
    buildPricingKey(providerID, modelID) {
        const normalizedProvider = providerID.trim().toLowerCase();
        const normalizedModel = modelID.trim().toLowerCase();
        if (normalizedModel.startsWith(`${normalizedProvider}/`))
            return normalizedModel;
        return `${normalizedProvider}/${normalizedModel}`;
    }
    countBareModelKeys(livePricing) {
        const counts = new Map();
        for (const modelKey of Object.keys(livePricing)) {
            const bareModelKey = this.extractBareModelKey(modelKey);
            if (!bareModelKey)
                continue;
            counts.set(bareModelKey, (counts.get(bareModelKey) ?? 0) + 1);
        }
        return counts;
    }
    extractBareModelKey(modelKey) {
        const slashIndex = modelKey.indexOf("/");
        const bareModelKey = (slashIndex === -1 ? modelKey : modelKey.slice(slashIndex + 1)).trim();
        return bareModelKey || undefined;
    }
}
//# sourceMappingURL=metadata.js.map