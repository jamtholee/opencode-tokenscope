import type { SessionMessage, TokenAnalysis, TokenModel, TokenscopeConfig } from "./types.js";
import { CostCalculator } from "./cost.js";
import { SubagentAnalyzer } from "./subagent.js";
import { ContextAnalyzer } from "./context.js";
import { SkillAnalyzer } from "./skill.js";
import { WarningCollector } from "./warnings.js";
export declare function resolveSessionID(argSessionID: string | undefined, contextSessionID: string | undefined): string | undefined;
export declare function addModelSupportWarnings(warnings: WarningCollector, costCalculator: CostCalculator, tokenModel: TokenModel, providerID: string | undefined, modelID: string | undefined, pricingModelName: string): void;
export declare function addPerModelPricingWarnings(warnings: WarningCollector, costCalculator: CostCalculator, analysis: TokenAnalysis, fallbackPricingModelName: string): void;
export declare function attachConfiguredAnalyses(input: {
    analysis: TokenAnalysis;
    messages: SessionMessage[];
    sessionID: string;
    tokenModel: TokenModel;
    providerID: string;
    modelID: string;
    pricingModelName: string;
    includeSubagents?: boolean;
    config: TokenscopeConfig;
    costCalculator: CostCalculator;
    subagentAnalyzer: SubagentAnalyzer;
    contextAnalyzer: ContextAnalyzer;
    skillAnalyzer: SkillAnalyzer;
}): Promise<void>;
//# sourceMappingURL=session-workflow.d.ts.map