// Analysis classes - ModelResolver, ContentCollector, TokenAnalysisEngine
import { isToolPart as toolGuard, isReasoningPart as reasoningGuard, isTextPart as textGuard } from "./types.js";
import { OPENAI_MODEL_MAP, HUGGINGFACE_TOKENIZER_MODEL_MAP, PROVIDER_DEFAULTS } from "./config.js";
import { summarizeTelemetry } from "./telemetry.js";
export class ModelResolver {
    resolveModelAndProvider(messages) {
        let detectedProviderID = "anthropic";
        let detectedModelID = "claude-sonnet-4-20250514";
        for (const message of [...messages].reverse()) {
            const providerID = this.getProviderID(message);
            const modelID = this.getModelID(message);
            if (providerID) {
                detectedProviderID = this.canonicalize(providerID) || detectedProviderID;
            }
            if (modelID) {
                detectedModelID = modelID;
            }
            if (providerID && modelID) {
                break;
            }
        }
        const model = this.resolveTokenModel(messages);
        return {
            model,
            providerID: detectedProviderID,
            modelID: detectedModelID,
        };
    }
    resolveTokenModel(messages) {
        for (const message of [...messages].reverse()) {
            const modelID = this.canonicalize(this.getModelID(message));
            const providerID = this.canonicalize(this.getProviderID(message));
            const openaiModel = this.resolveOpenAIModel(modelID, providerID);
            if (openaiModel)
                return openaiModel;
            const huggingFaceTokenizerModel = this.resolveHuggingFaceTokenizerModel(modelID, providerID);
            if (huggingFaceTokenizerModel)
                return huggingFaceTokenizerModel;
        }
        return { name: "approx", spec: { kind: "approx" } };
    }
    resolveOpenAIModel(modelID, providerID) {
        if (providerID === "openai" || providerID === "opencode" || providerID === "azure") {
            const mapped = this.mapOpenAI(modelID);
            return { name: modelID ?? mapped, spec: { kind: "tiktoken", model: mapped } };
        }
        if (modelID && OPENAI_MODEL_MAP[modelID]) {
            return { name: modelID, spec: { kind: "tiktoken", model: OPENAI_MODEL_MAP[modelID] } };
        }
        return undefined;
    }
    resolveHuggingFaceTokenizerModel(modelID, providerID) {
        if (modelID && HUGGINGFACE_TOKENIZER_MODEL_MAP[modelID]) {
            return { name: modelID, spec: { kind: "huggingface", hub: HUGGINGFACE_TOKENIZER_MODEL_MAP[modelID] } };
        }
        if (providerID && PROVIDER_DEFAULTS[providerID]) {
            return { name: modelID ?? providerID, spec: PROVIDER_DEFAULTS[providerID] };
        }
        if (modelID?.startsWith("claude")) {
            return { name: modelID, spec: { kind: "huggingface", hub: "Xenova/claude-tokenizer" } };
        }
        if (modelID?.startsWith("llama")) {
            return {
                name: modelID,
                spec: {
                    kind: "huggingface",
                    hub: HUGGINGFACE_TOKENIZER_MODEL_MAP[modelID] ?? "Xenova/Meta-Llama-3.1-Tokenizer",
                },
            };
        }
        if (modelID?.startsWith("mistral")) {
            return { name: modelID, spec: { kind: "huggingface", hub: "Xenova/mistral-tokenizer-v3" } };
        }
        if (modelID?.startsWith("deepseek")) {
            return { name: modelID, spec: { kind: "huggingface", hub: "deepseek-ai/DeepSeek-V3" } };
        }
        return undefined;
    }
    mapOpenAI(modelID) {
        if (!modelID)
            return "cl100k_base";
        return OPENAI_MODEL_MAP[modelID] ?? modelID;
    }
    getProviderID(message) {
        return (message.data?.providerID ??
            message.data?.model?.providerID ??
            message.info.providerID ??
            message.info.model?.providerID ??
            message.providerID ??
            message.model?.providerID);
    }
    getModelID(message) {
        return (message.data?.modelID ??
            message.data?.model?.modelID ??
            message.data?.model?.id ??
            message.info.modelID ??
            message.info.model?.modelID ??
            message.info.model?.id ??
            message.modelID ??
            message.model?.modelID ??
            message.model?.id);
    }
    canonicalize(value) {
        return value?.split("/").pop()?.toLowerCase().trim();
    }
}
// Content Collection
export class ContentCollector {
    collectSystemPrompts(messages) {
        const prompts = new Map();
        const addPrompt = (value) => {
            if (Array.isArray(value)) {
                for (const item of value) {
                    const trimmed = (item ?? "").trim();
                    if (trimmed)
                        prompts.set(trimmed, trimmed);
                }
                return;
            }
            const trimmed = (value ?? "").trim();
            if (trimmed)
                prompts.set(trimmed, trimmed);
        };
        for (const message of messages) {
            // Current upstream model stores optional system override on user messages.
            // Keep broader compatibility by accepting either string or string[].
            if (message.info.role === "user" || message.info.role === "assistant") {
                addPrompt(message.info.system);
            }
            // Backward compatibility for older exports that had explicit system role content.
            if (message.info.role === "system") {
                const content = this.extractText(message.parts);
                if (content)
                    prompts.set(content, content);
            }
        }
        return Array.from(prompts.values()).map((content, index) => ({
            label: this.identifySystemPrompt(content, index + 1),
            content,
        }));
    }
    collectMessageTexts(messages, role) {
        const results = [];
        let index = 0;
        for (const message of messages) {
            if (message.info.role !== role)
                continue;
            const content = this.extractText(message.parts);
            if (!content)
                continue;
            index += 1;
            results.push({ label: `${this.capitalize(role)}#${index}`, content });
        }
        return results;
    }
    collectToolOutputs(messages) {
        const toolOutputs = new Map();
        const compactedPlaceholder = "[Old tool result content cleared]";
        for (const message of messages) {
            for (const part of message.parts) {
                if (!toolGuard(part))
                    continue;
                if (part.state.status !== "completed")
                    continue;
                const rawOutput = part.state.time?.compacted ? compactedPlaceholder : part.state.output;
                const output = (rawOutput ?? "").toString().trim();
                if (!output)
                    continue;
                const toolName = part.tool || "tool";
                const existing = toolOutputs.get(toolName) || "";
                toolOutputs.set(toolName, existing + (existing ? "\n\n" : "") + output);
            }
        }
        return Array.from(toolOutputs.entries()).map(([toolName, content]) => ({
            label: toolName,
            content,
        }));
    }
    collectToolCallCounts(messages) {
        const toolCounts = new Map();
        for (const message of messages) {
            for (const part of message.parts) {
                if (!toolGuard(part))
                    continue;
                const toolName = part.tool || "tool";
                if (toolName) {
                    toolCounts.set(toolName, (toolCounts.get(toolName) || 0) + 1);
                }
            }
        }
        return toolCounts;
    }
    collectAllToolsCalled(messages) {
        return Array.from(this.collectToolCallCounts(messages).keys()).sort();
    }
    collectReasoningTexts(messages) {
        const results = [];
        let index = 0;
        for (const message of messages) {
            for (const part of message.parts) {
                if (!reasoningGuard(part))
                    continue;
                const text = (part.text ?? "").toString().trim();
                if (!text)
                    continue;
                index += 1;
                results.push({ label: `Reasoning#${index}`, content: text });
            }
        }
        return results;
    }
    extractText(parts) {
        return parts
            .filter(textGuard)
            .map((part) => part.text ?? "")
            .map((text) => text.trim())
            .filter(Boolean)
            .join("\n\n");
    }
    identifySystemPrompt(content, index) {
        const lower = content.toLowerCase();
        if (lower.includes("opencode") && lower.includes("cli") && content.length > 500)
            return "System#MainPrompt";
        if (lower.includes("opencode") && lower.includes("cli") && content.length <= 500)
            return "System#ShortPrompt";
        if (lower.includes("agent") && lower.includes("mode"))
            return "System#AgentMode";
        if (lower.includes("permission") || lower.includes("allowed") || lower.includes("deny"))
            return "System#Permissions";
        if (lower.includes("tool") && (lower.includes("rule") || lower.includes("guideline")))
            return "System#ToolRules";
        if (lower.includes("format") || lower.includes("style") || lower.includes("concise"))
            return "System#Formatting";
        if (lower.includes("project") || lower.includes("repository") || lower.includes("codebase"))
            return "System#ProjectContext";
        if (lower.includes("session") || lower.includes("context") || lower.includes("memory"))
            return "System#SessionMgmt";
        if (content.includes("@") && (content.includes(".md") || content.includes(".txt")))
            return "System#FileRefs";
        if (content.includes("name:") && content.includes("description:"))
            return "System#AgentDef";
        if (lower.includes("code") && (lower.includes("convention") || lower.includes("standard")))
            return "System#CodeGuidelines";
        return `System#${index}`;
    }
    capitalize(value) {
        if (!value)
            return value;
        return value[0].toUpperCase() + value.slice(1);
    }
}
// Token Analysis Engine
export class TokenAnalysisEngine {
    tokenizerManager;
    contentCollector;
    constructor(tokenizerManager, contentCollector) {
        this.tokenizerManager = tokenizerManager;
        this.contentCollector = contentCollector;
    }
    async analyze(sessionID, messages, tokenModel, entryLimit) {
        const systemPrompts = this.contentCollector.collectSystemPrompts(messages);
        const userTexts = this.contentCollector.collectMessageTexts(messages, "user");
        const assistantTexts = this.contentCollector.collectMessageTexts(messages, "assistant");
        const toolOutputs = this.contentCollector.collectToolOutputs(messages);
        const reasoningTraces = this.contentCollector.collectReasoningTexts(messages);
        const allToolsCalled = this.contentCollector.collectAllToolsCalled(messages);
        const toolCallCounts = this.contentCollector.collectToolCallCounts(messages);
        const [system, user, assistant, tools, reasoning] = await Promise.all([
            this.buildCategory("system", systemPrompts, tokenModel, entryLimit),
            this.buildCategory("user", userTexts, tokenModel, entryLimit),
            this.buildCategory("assistant", assistantTexts, tokenModel, entryLimit),
            this.buildCategory("tools", toolOutputs, tokenModel, entryLimit),
            this.buildCategory("reasoning", reasoningTraces, tokenModel, entryLimit),
        ]);
        const analysis = {
            sessionID,
            model: tokenModel,
            categories: { system, user, assistant, tools, reasoning },
            totalTokens: system.totalTokens + user.totalTokens + assistant.totalTokens + tools.totalTokens + reasoning.totalTokens,
            inputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            assistantMessageCount: 0,
            apiCallCount: 0,
            callsWithCacheRead: 0,
            callsWithCacheWrite: 0,
            mostRecentInput: 0,
            mostRecentOutput: 0,
            mostRecentReasoning: 0,
            mostRecentCacheRead: 0,
            mostRecentCacheWrite: 0,
            mostRecentProviderTotalTokens: undefined,
            sessionCost: 0,
            mostRecentCost: 0,
            allToolsCalled,
            toolCallCounts,
            perModelUsage: [],
            warnings: [],
        };
        this.applyTelemetryAdjustments(analysis, messages);
        return analysis;
    }
    async buildCategory(label, sources, model, entryLimit) {
        const entries = [];
        for (const source of sources) {
            const tokens = await this.tokenizerManager.countTokens(source.content, model);
            if (tokens > 0) {
                entries.push({ label: source.label, tokens });
            }
        }
        entries.sort((a, b) => b.tokens - a.tokens);
        const limited = entries.slice(0, entryLimit);
        const totalTokens = entries.reduce((sum, entry) => sum + entry.tokens, 0);
        return { label, totalTokens, entries: limited, allEntries: entries };
    }
    applyTelemetryAdjustments(analysis, messages) {
        const telemetry = summarizeTelemetry(messages);
        analysis.inputTokens = telemetry.inputTokens;
        analysis.outputTokens = telemetry.outputTokens;
        analysis.reasoningTokens = telemetry.reasoningTokens;
        analysis.cacheReadTokens = telemetry.cacheReadTokens;
        analysis.cacheWriteTokens = telemetry.cacheWriteTokens;
        analysis.assistantMessageCount = telemetry.assistantMessageCount;
        analysis.apiCallCount = telemetry.apiCallCount;
        analysis.callsWithCacheRead = telemetry.callsWithCacheRead;
        analysis.callsWithCacheWrite = telemetry.callsWithCacheWrite;
        analysis.sessionCost = telemetry.sessionCost;
        analysis.mostRecentCost = telemetry.mostRecentCost;
        analysis.mostRecentInput = telemetry.mostRecentInput;
        analysis.mostRecentOutput = telemetry.mostRecentOutput;
        analysis.mostRecentReasoning = telemetry.mostRecentReasoning;
        analysis.mostRecentCacheRead = telemetry.mostRecentCacheRead;
        analysis.mostRecentCacheWrite = telemetry.mostRecentCacheWrite;
        analysis.mostRecentProviderTotalTokens = telemetry.mostRecentProviderTotalTokens;
        analysis.perModelUsage = telemetry.perModelUsage;
        const recentApiInputTotal = telemetry.mostRecentInput + telemetry.mostRecentCacheRead;
        const localUserAndTools = analysis.categories.user.totalTokens + analysis.categories.tools.totalTokens;
        const inferredPromptOverheadTokens = Math.max(0, recentApiInputTotal - localUserAndTools);
        const hasExplicitSystem = analysis.categories.system.totalTokens > 0;
        const strongInferenceSignal = inferredPromptOverheadTokens >= 300 &&
            inferredPromptOverheadTokens >= recentApiInputTotal * 0.15 &&
            inferredPromptOverheadTokens >= localUserAndTools * 0.1;
        if (inferredPromptOverheadTokens >= 50 && !hasExplicitSystem) {
            const inferredLabel = strongInferenceSignal
                ? "System (inferred from API telemetry)"
                : "Unattributed prompt overhead (inferred)";
            analysis.categories.system.totalTokens = inferredPromptOverheadTokens;
            analysis.categories.system.entries = [{ label: inferredLabel, tokens: inferredPromptOverheadTokens }];
            analysis.categories.system.allEntries = analysis.categories.system.entries;
        }
        analysis.totalTokens =
            analysis.categories.system.totalTokens +
                analysis.categories.user.totalTokens +
                analysis.categories.assistant.totalTokens +
                analysis.categories.tools.totalTokens +
                analysis.categories.reasoning.totalTokens;
    }
}
//# sourceMappingURL=analyzer.js.map