// Telemetry helpers - extracts per-API-call token and cost data from stored session messages
function safeNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function hasExplicitNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
function normalizeString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function getMessageRole(message) {
    return message.info?.role ?? message.data?.role ?? message.role ?? message.type;
}
function getModelRef(message, part) {
    const partModel = part?.model;
    const dataModel = message.data?.model;
    const infoModel = message.info?.model;
    const topLevelModel = message.model;
    return {
        providerID: normalizeString(partModel?.providerID ??
            dataModel?.providerID ??
            message.data?.providerID ??
            infoModel?.providerID ??
            message.info?.providerID ??
            topLevelModel?.providerID ??
            message.providerID),
        modelID: normalizeString(partModel?.modelID ??
            partModel?.id ??
            dataModel?.modelID ??
            dataModel?.id ??
            message.data?.modelID ??
            infoModel?.modelID ??
            infoModel?.id ??
            message.info?.modelID ??
            topLevelModel?.modelID ??
            topLevelModel?.id ??
            message.modelID),
    };
}
function getMessageTokens(message) {
    return message.info?.tokens ?? message.data?.tokens ?? message.tokens;
}
function getMessageCost(message) {
    return message.info?.cost ?? message.data?.cost ?? message.cost;
}
function buildTelemetryCall(tokens, cost, force, model) {
    const inputTokens = safeNumber(tokens?.input);
    const outputTokens = safeNumber(tokens?.output);
    const reasoningTokens = safeNumber(tokens?.reasoning);
    const cacheReadTokens = safeNumber(tokens?.cache?.read);
    const cacheWriteTokens = safeNumber(tokens?.cache?.write);
    const providerTotalTokens = hasExplicitNumber(tokens?.total) ? safeNumber(tokens?.total) : undefined;
    const normalizedCost = safeNumber(cost);
    const hasActivity = inputTokens + outputTokens + reasoningTokens + cacheReadTokens + cacheWriteTokens > 0 ||
        normalizedCost > 0 ||
        providerTotalTokens !== undefined;
    if (!force && !hasActivity)
        return null;
    return {
        providerID: model.providerID,
        modelID: model.modelID,
        inputTokens,
        outputTokens,
        reasoningTokens,
        cacheReadTokens,
        cacheWriteTokens,
        cost: normalizedCost,
        providerTotalTokens,
    };
}
function isStepFinishPart(part) {
    return part.type === "step-finish";
}
function modelDisplayName(providerID, modelID) {
    if (providerID && modelID)
        return `${providerID}/${modelID}`;
    return modelID ?? providerID ?? "unknown model";
}
function modelGroupingKey(providerID, modelID) {
    return `${providerID ?? ""}\u0000${modelID ?? ""}`;
}
function summarizeCallsByModel(calls) {
    const byModel = new Map();
    for (const call of calls) {
        const key = modelGroupingKey(call.providerID, call.modelID);
        const existing = byModel.get(key) ?? {
            providerID: call.providerID,
            modelID: call.modelID,
            modelName: modelDisplayName(call.providerID, call.modelID),
            inputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            apiCost: 0,
            apiCallCount: 0,
            callsWithCacheRead: 0,
            callsWithCacheWrite: 0,
            costSegments: [],
        };
        existing.inputTokens += call.inputTokens;
        existing.outputTokens += call.outputTokens;
        existing.reasoningTokens += call.reasoningTokens;
        existing.cacheReadTokens += call.cacheReadTokens;
        existing.cacheWriteTokens += call.cacheWriteTokens;
        existing.apiCost += call.cost;
        existing.apiCallCount += 1;
        if (call.cacheReadTokens > 0)
            existing.callsWithCacheRead += 1;
        if (call.cacheWriteTokens > 0)
            existing.callsWithCacheWrite += 1;
        existing.costSegments?.push({
            inputTokens: call.inputTokens,
            outputTokens: call.outputTokens,
            reasoningTokens: call.reasoningTokens,
            cacheReadTokens: call.cacheReadTokens,
            cacheWriteTokens: call.cacheWriteTokens,
            apiCallCount: 1,
        });
        byModel.set(key, existing);
    }
    return Array.from(byModel.values()).sort((a, b) => b.apiCallCount - a.apiCallCount || a.modelName.localeCompare(b.modelName));
}
export function collectTelemetryCalls(messages) {
    const calls = [];
    for (const message of messages) {
        if (getMessageRole(message) !== "assistant")
            continue;
        const stepFinishParts = (message.parts ?? []).filter(isStepFinishPart);
        if (stepFinishParts.length > 0) {
            for (const part of stepFinishParts) {
                const call = buildTelemetryCall(part.tokens, part.cost, true, getModelRef(message, part));
                if (call)
                    calls.push(call);
            }
            continue;
        }
        const fallback = buildTelemetryCall(getMessageTokens(message), getMessageCost(message), false, getModelRef(message));
        if (fallback)
            calls.push(fallback);
    }
    return calls;
}
export function summarizeTelemetry(messages) {
    const assistantMessageCount = messages.reduce((count, message) => count + (getMessageRole(message) === "assistant" ? 1 : 0), 0);
    const calls = collectTelemetryCalls(messages);
    let inputTokens = 0;
    let outputTokens = 0;
    let reasoningTokens = 0;
    let cacheReadTokens = 0;
    let cacheWriteTokens = 0;
    let callsWithCacheRead = 0;
    let callsWithCacheWrite = 0;
    let sessionCost = 0;
    for (const call of calls) {
        inputTokens += call.inputTokens;
        outputTokens += call.outputTokens;
        reasoningTokens += call.reasoningTokens;
        cacheReadTokens += call.cacheReadTokens;
        cacheWriteTokens += call.cacheWriteTokens;
        sessionCost += call.cost;
        if (call.cacheReadTokens > 0)
            callsWithCacheRead += 1;
        if (call.cacheWriteTokens > 0)
            callsWithCacheWrite += 1;
    }
    const mostRecent = calls[calls.length - 1];
    return {
        assistantMessageCount,
        apiCallCount: calls.length,
        inputTokens,
        outputTokens,
        reasoningTokens,
        cacheReadTokens,
        cacheWriteTokens,
        callsWithCacheRead,
        callsWithCacheWrite,
        sessionCost,
        mostRecentInput: mostRecent?.inputTokens ?? 0,
        mostRecentOutput: mostRecent?.outputTokens ?? 0,
        mostRecentReasoning: mostRecent?.reasoningTokens ?? 0,
        mostRecentCacheRead: mostRecent?.cacheReadTokens ?? 0,
        mostRecentCacheWrite: mostRecent?.cacheWriteTokens ?? 0,
        mostRecentCost: mostRecent?.cost ?? 0,
        mostRecentProviderTotalTokens: mostRecent?.providerTotalTokens,
        perModelUsage: summarizeCallsByModel(calls),
    };
}
export function firstCacheWriteTokens(messages) {
    for (const call of collectTelemetryCalls(messages)) {
        if (call.cacheWriteTokens > 0)
            return call.cacheWriteTokens;
    }
    return 0;
}
//# sourceMappingURL=telemetry.js.map