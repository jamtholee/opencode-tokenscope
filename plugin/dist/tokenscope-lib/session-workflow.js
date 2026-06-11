function normalizeSessionID(sessionID) {
    const normalized = sessionID?.trim();
    return normalized ? normalized : undefined;
}
export function resolveSessionID(argSessionID, contextSessionID) {
    return normalizeSessionID(argSessionID) ?? normalizeSessionID(contextSessionID);
}
export function addModelSupportWarnings(warnings, costCalculator, tokenModel, providerID, modelID, pricingModelName) {
    if (tokenModel.spec.kind === "approx") {
        warnings.add(`Model '${providerID}/${modelID}' is not currently supported by a model-specific tokenizer. Token counts use an approximate character-based fallback.`, `unsupported-tokenizer:${providerID}:${modelID}`);
    }
    if (!costCalculator.hasPricing(pricingModelName)) {
        warnings.add(`Pricing for '${pricingModelName}' was not found in OpenCode metadata or models.json. Cost estimates use the default fallback rates ($1/M input, $3/M output, no cache pricing).`, `missing-pricing:${pricingModelName}`);
    }
}
export function addPerModelPricingWarnings(warnings, costCalculator, analysis, fallbackPricingModelName) {
    for (const modelUsage of analysis.perModelUsage) {
        const modelPricingName = costCalculator.resolvePricingModelName(modelUsage, fallbackPricingModelName);
        if (!costCalculator.hasPricing(modelPricingName)) {
            warnings.add(`Pricing for '${modelPricingName}' was not found in OpenCode metadata or models.json. Cost estimates for that model use the default fallback rates ($1/M input, $3/M output, no cache pricing).`, `missing-pricing:${modelPricingName}`);
        }
    }
}
function applyContextAnalysis(analysis, contextResult) {
    if (contextResult.contextBreakdown) {
        analysis.contextBreakdown = contextResult.contextBreakdown;
    }
    if (contextResult.toolEstimates) {
        analysis.toolEstimates = contextResult.toolEstimates;
    }
    if (contextResult.cacheEfficiency) {
        analysis.cacheEfficiency = contextResult.cacheEfficiency;
    }
}
export async function attachConfiguredAnalyses(input) {
    const shouldIncludeSubagents = input.includeSubagents !== false && input.config.enableSubagentAnalysis;
    if (shouldIncludeSubagents) {
        input.analysis.subagentAnalysis = await input.subagentAnalyzer.analyzeChildSessions(input.sessionID);
    }
    const pricing = input.costCalculator.getPricing(input.pricingModelName);
    const contextResult = await input.contextAnalyzer.analyze(input.sessionID, input.tokenModel, pricing, input.config, input.providerID, input.modelID);
    applyContextAnalysis(input.analysis, contextResult);
    if (input.config.enableSkillAnalysis) {
        input.analysis.skillAnalysis = await input.skillAnalyzer.analyze(input.messages, input.providerID, input.modelID, input.tokenModel, input.config);
    }
}
//# sourceMappingURL=session-workflow.js.map