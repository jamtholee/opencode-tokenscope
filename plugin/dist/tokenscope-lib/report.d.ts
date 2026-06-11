import type { TokenAnalysis } from "./types.js";
export declare const REPORT_FILENAME = "token-usage-output.txt";
export declare function writeReport(outputPath: string, output: string): Promise<string | null>;
export declare function buildFailureReport(sessionID: string | undefined, warnings: string[], fatalMessage: string): string;
export declare function buildSuccessSummary(outputPath: string, analysis: TokenAnalysis): string;
//# sourceMappingURL=report.d.ts.map