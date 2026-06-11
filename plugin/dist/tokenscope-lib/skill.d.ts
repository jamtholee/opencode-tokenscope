import type { SessionMessage, SkillAnalysis, TokenModel, TokenscopeConfig } from "./types.js";
import { TokenizerManager } from "./tokenizer.js";
import { WarningCollector } from "./warnings.js";
export declare class SkillAnalyzer {
    private client;
    private tokenizerManager;
    private serverUrl;
    private directory;
    private warnings?;
    constructor(client: any, tokenizerManager: TokenizerManager, serverUrl: URL, directory: string, warnings?: WarningCollector | undefined);
    /**
     * Main entry point - analyzes skill usage in a session
     */
    analyze(messages: SessionMessage[], providerID: string, modelID: string, tokenModel: TokenModel, config: TokenscopeConfig): Promise<SkillAnalysis | undefined>;
    /**
     * Fetch current tool definitions for the provider/model
     */
    private listTools;
    /**
     * Fetch available skills from current OpenCode APIs when possible.
     * Falls back to parsing the tool description for older versions.
     */
    private getAvailableSkills;
    /**
     * Fetch available subagents from current OpenCode APIs when possible.
     * Falls back to parsing the task tool description for older versions.
     */
    private getAvailableSubagents;
    /**
     * Parse available subagents from the task tool description.
     */
    private parseAvailableSubagents;
    /**
     * Parse the available skills list from both current markdown and legacy XML formats.
     */
    private parseAvailableSkills;
    private parseAvailableSkillsXml;
    private parseAvailableSkillsMarkdown;
    private isLikelyIdentifier;
    private isSubagentSectionBoundary;
    /**
     * Collect loaded skills from session messages with call count tracking.
     */
    private getLoadedSkills;
    /**
     * Extract skill name from tool state.
     */
    private extractSkillName;
    private resolveCurrentAgent;
    private filterAccessibleSkills;
    private filterAccessibleSubagents;
    private getPermissionRules;
    private evaluatePermission;
    private matchesWildcard;
    private buildVerboseSkillEntry;
    private buildSkillSystemPrompt;
    private buildVerboseSkillCatalog;
    private buildSkillToolDescription;
    private buildSubagentBullet;
    private getSubagentDescription;
    private buildFilteredTaskDescription;
    private fetchAgents;
    private fetchSkills;
    private fetchInternalJson;
}
//# sourceMappingURL=skill.d.ts.map