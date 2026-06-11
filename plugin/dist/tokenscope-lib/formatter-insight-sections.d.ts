import type { CacheEfficiency, ContextBreakdown, CostEstimate, SkillAnalysis, ToolSchemaEstimate } from "./types.js";
export declare function formatContextBreakdown(breakdown: ContextBreakdown): string[];
export declare function formatToolEstimates(estimates: ToolSchemaEstimate[]): string[];
export declare function formatCacheEfficiency(efficiency: CacheEfficiency, cost: CostEstimate, modelName: string): string[];
export declare function formatAvailableSkills(analysis: SkillAnalysis): string[];
export declare function formatLoadedSkills(analysis: SkillAnalysis): string[];
export declare function formatAvailableSubagents(analysis: SkillAnalysis): string[];
//# sourceMappingURL=formatter-insight-sections.d.ts.map