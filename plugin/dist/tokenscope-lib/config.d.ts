import type { TokenizerSpec, ModelPricing, TokenscopeConfig } from "./types.js";
export declare const DEFAULT_ENTRY_LIMIT = 3;
export declare function resolveBundledAssetPath(filename: string, moduleDir?: string): Promise<string>;
export declare function loadModelPricing(): Promise<Record<string, ModelPricing>>;
export declare const DEFAULT_TOKENSCOPE_CONFIG: TokenscopeConfig;
export declare function loadTokenscopeConfig(): Promise<TokenscopeConfig>;
export declare const OPENAI_MODEL_MAP: Record<string, string>;
export declare const HUGGINGFACE_TOKENIZER_MODEL_MAP: Record<string, string>;
export declare const PROVIDER_DEFAULTS: Record<string, TokenizerSpec>;
//# sourceMappingURL=config.d.ts.map