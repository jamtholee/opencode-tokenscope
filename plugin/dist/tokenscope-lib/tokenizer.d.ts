import type { TokenModel } from "./types.js";
import { WarningCollector } from "./warnings.js";
export declare class TokenizerManager {
    private warnings?;
    private tiktokenCache;
    private huggingFaceTokenizerCache;
    private tiktokenModule?;
    private huggingFaceTokenizersModule?;
    constructor(warnings?: WarningCollector | undefined);
    countTokens(content: string, model: TokenModel): Promise<number>;
    private approximateTokenCount;
    private countWithTiktoken;
    private countWithHuggingFaceTokenizer;
    private loadTiktokenEncoder;
    private loadTiktokenModule;
    private loadHuggingFaceTokenizer;
    private loadHuggingFaceTokenizersModule;
    private fetchHuggingFaceJson;
    private getHuggingFaceHeaders;
    private buildHuggingFaceFallbackWarning;
    private importRuntimePackage;
}
//# sourceMappingURL=tokenizer.d.ts.map