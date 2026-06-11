import type { SubagentAnalysis } from "./types.js";
import { CostCalculator } from "./cost.js";
import { type RoutingParams } from "./opencode.js";
import { WarningCollector } from "./warnings.js";
export declare class SubagentAnalyzer {
    private client;
    private costCalculator;
    private warnings?;
    private routing;
    constructor(client: any, costCalculator: CostCalculator, warnings?: WarningCollector | undefined, routing?: RoutingParams);
    analyzeChildSessions(parentSessionID: string): Promise<SubagentAnalysis>;
    private analyzeChildSession;
    private extractAgentType;
}
//# sourceMappingURL=subagent.d.ts.map