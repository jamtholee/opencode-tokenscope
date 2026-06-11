import type { TokenAnalysis, TokenscopeConfig } from "./types.js";
import { CostCalculator } from "./cost.js";
export declare class OutputFormatter {
    private costCalculator;
    private config;
    constructor(costCalculator: CostCalculator);
    setConfig(config: TokenscopeConfig): void;
    format(analysis: TokenAnalysis): string;
    private formatVisualOutput;
}
//# sourceMappingURL=formatter.d.ts.map