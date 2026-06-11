import type { SessionMessage, TokenModel, TokenAnalysis, CategoryEntrySource } from "./types.js";
import { TokenizerManager } from "./tokenizer.js";
export interface ModelAndProvider {
    model: TokenModel;
    providerID: string;
    modelID: string;
}
export declare class ModelResolver {
    resolveModelAndProvider(messages: SessionMessage[]): ModelAndProvider;
    resolveTokenModel(messages: SessionMessage[]): TokenModel;
    private resolveOpenAIModel;
    private resolveHuggingFaceTokenizerModel;
    private mapOpenAI;
    private getProviderID;
    private getModelID;
    private canonicalize;
}
export declare class ContentCollector {
    collectSystemPrompts(messages: SessionMessage[]): CategoryEntrySource[];
    collectMessageTexts(messages: SessionMessage[], role: "user" | "assistant"): CategoryEntrySource[];
    collectToolOutputs(messages: SessionMessage[]): CategoryEntrySource[];
    collectToolCallCounts(messages: SessionMessage[]): Map<string, number>;
    collectAllToolsCalled(messages: SessionMessage[]): string[];
    collectReasoningTexts(messages: SessionMessage[]): CategoryEntrySource[];
    private extractText;
    private identifySystemPrompt;
    private capitalize;
}
export declare class TokenAnalysisEngine {
    private tokenizerManager;
    private contentCollector;
    constructor(tokenizerManager: TokenizerManager, contentCollector: ContentCollector);
    analyze(sessionID: string, messages: SessionMessage[], tokenModel: TokenModel, entryLimit: number): Promise<TokenAnalysis>;
    private buildCategory;
    private applyTelemetryAdjustments;
}
//# sourceMappingURL=analyzer.d.ts.map