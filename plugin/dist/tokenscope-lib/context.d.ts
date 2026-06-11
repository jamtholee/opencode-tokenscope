import type { TokenscopeConfig, ModelPricing, TokenModel, ContextAnalysisResult } from "./types.js";
import { TokenizerManager } from "./tokenizer.js";
import { WarningCollector } from "./warnings.js";
type ExportCommandRunner = (sessionID: string, directory?: string) => Promise<string>;
export declare class ContextAnalyzer {
    private warnings?;
    private client?;
    private directory?;
    private exportCommandRunner;
    private tokenizerManager;
    private toolTokenCache;
    constructor(tokenizerManager: TokenizerManager, warnings?: WarningCollector | undefined, client?: any | undefined, directory?: string | undefined, exportCommandRunner?: ExportCommandRunner);
    /**
     * Main entry point - analyzes a session using opencode export
     */
    analyze(sessionID: string, tokenModel: TokenModel, pricing: ModelPricing, config: TokenscopeConfig, providerID?: string, modelID?: string): Promise<ContextAnalysisResult>;
    /**
     * Execute opencode export and parse the JSON output
     */
    private runExport;
    /**
     * Analyze context breakdown from cache_write tokens.
     *
     * Note: OpenCode's `opencode export` command doesn't include system prompt content
     * in the output, so we estimate the breakdown from the first cache_write token count
     * which represents the total cached context size.
     *
     * If system prompts become available in future versions, we can enhance this
     * to tokenize the actual content for more accurate breakdowns.
     */
    private analyzeContextBreakdown;
    /**
     * Analyze actual system prompt content (for when opencode export includes it)
     */
    private analyzeSystemPromptContent;
    /**
     * Extract system prompts from exported session
     */
    private extractSystemPrompts;
    private countProjectTreeEntries;
    /**
     * Estimate context breakdown from cache token counts when system prompts aren't available.
     *
     * Based on typical OpenCode system prompt structure:
     * - Base System Prompt: ~1,500-2,000 tokens
     * - Tool Definitions: ~350 tokens per tool (typically 12-15 tools = ~4,500-5,500)
     * - Environment Context: ~100-200 tokens
     * - Project Tree: ~300-800 tokens (varies by project)
     * - Custom Instructions: ~100-500 tokens
     *
     * We use the first cache_write value as an estimate of total cached context.
     */
    private estimateContextFromCacheTokens;
    /**
     * Estimate tool schema tokens from tool calls in the session
     */
    private estimateToolSchemas;
    private getToolDefinitions;
    private selectGeneratedSystemPrompts;
    private isStrongGeneratedSystemContext;
    private isBaseGeneratedSystemPrompt;
    private isInstructionPrompt;
    private toolSchema;
    private formatToolDefinition;
    private countSchemaArguments;
    private hasComplexSchemaArguments;
    private sumPrecomputedToolTokens;
    private setPrecomputedToolTokens;
    private precomputeToolDefinitionTokens;
    private extractTranscriptTools;
    private firstCacheWriteModel;
    /**
     * Extract enabled tools from user messages
     */
    private extractEnabledTools;
    /**
     * Extract tool call argument data for inference
     */
    private extractToolCallData;
    /**
     * Infer argument types from values
     */
    private inferArgTypes;
    /**
     * Estimate tokens for a tool schema based on call data
     *
     * Formula from plan:
     * base_tokens = 200  (description + schema overhead)
     * per_simple_arg = 30
     * per_complex_arg = 60  (arrays, objects)
     * description_bonus = 80 (simple) or 120 (complex)
     */
    private estimateToolTokens;
    /**
     * Calculate cache efficiency metrics
     */
    private calculateCacheEfficiency;
}
export {};
//# sourceMappingURL=context.d.ts.map