// TokenizerManager - handles token counting with multiple backends
import { formatErrorMessage } from "./warnings.js";
const APPROXIMATE_ONLY_HUGGINGFACE_HUBS = new Set(["google/gemma-2-9b-it"]);
export class TokenizerManager {
    warnings;
    tiktokenCache = new Map();
    huggingFaceTokenizerCache = new Map();
    tiktokenModule;
    huggingFaceTokenizersModule;
    constructor(warnings) {
        this.warnings = warnings;
    }
    async countTokens(content, model) {
        if (!content.trim())
            return 0;
        try {
            switch (model.spec.kind) {
                case "approx":
                    return this.approximateTokenCount(content);
                case "tiktoken":
                    return await this.countWithTiktoken(content, model.spec.model);
                case "huggingface":
                    return await this.countWithHuggingFaceTokenizer(content, model.spec.hub);
            }
        }
        catch (error) {
            this.warnings?.add(`Token counting fell back to approximate mode for model '${model.name}': ${formatErrorMessage(error)}`, `token-count:${model.name}`);
            return this.approximateTokenCount(content);
        }
    }
    approximateTokenCount(content) {
        return Math.ceil(content.length / 4);
    }
    async countWithTiktoken(content, model) {
        const encoder = await this.loadTiktokenEncoder(model);
        try {
            return encoder.encode(content).length;
        }
        catch {
            return this.approximateTokenCount(content);
        }
    }
    async countWithHuggingFaceTokenizer(content, hub) {
        const tokenizer = await this.loadHuggingFaceTokenizer(hub);
        if (!tokenizer || typeof tokenizer.encode !== "function") {
            return this.approximateTokenCount(content);
        }
        try {
            const encoding = await tokenizer.encode(content);
            return Array.isArray(encoding?.ids) ? encoding.ids.length : this.approximateTokenCount(content);
        }
        catch {
            return this.approximateTokenCount(content);
        }
    }
    async loadTiktokenEncoder(model) {
        if (this.tiktokenCache.has(model)) {
            return this.tiktokenCache.get(model);
        }
        const mod = await this.loadTiktokenModule();
        const encodingForModel = mod.encodingForModel ?? mod.default?.encodingForModel;
        const getEncoding = mod.getEncoding ?? mod.default?.getEncoding;
        if (typeof getEncoding !== "function") {
            return { encode: (text) => ({ length: Math.ceil(text.length / 4) }) };
        }
        let encoder;
        try {
            encoder = typeof encodingForModel === "function" ? encodingForModel(model) : getEncoding(model);
        }
        catch {
            encoder = getEncoding("cl100k_base");
        }
        this.tiktokenCache.set(model, encoder);
        return encoder;
    }
    async loadTiktokenModule() {
        if (!this.tiktokenModule) {
            this.tiktokenModule = this.importRuntimePackage("js-tiktoken");
        }
        return this.tiktokenModule;
    }
    async loadHuggingFaceTokenizer(hub) {
        if (this.huggingFaceTokenizerCache.has(hub)) {
            return this.huggingFaceTokenizerCache.get(hub);
        }
        if (APPROXIMATE_ONLY_HUGGINGFACE_HUBS.has(hub)) {
            this.warnings?.add(`TokenScope used approximate token counting for '${hub}' because it only loads public tokenizers directly in analysis mode.`, `huggingface-tokenizer-approx-only:${hub}`);
            this.huggingFaceTokenizerCache.set(hub, null);
            return null;
        }
        try {
            const { Tokenizer } = await this.loadHuggingFaceTokenizersModule();
            const [tokenizerJson, tokenizerConfig] = await Promise.all([
                this.fetchHuggingFaceJson(hub, "tokenizer.json"),
                this.fetchHuggingFaceJson(hub, "tokenizer_config.json", true),
            ]);
            const tokenizer = new Tokenizer(tokenizerJson, tokenizerConfig ?? {});
            this.huggingFaceTokenizerCache.set(hub, tokenizer);
            return tokenizer;
        }
        catch (error) {
            this.warnings?.add(this.buildHuggingFaceFallbackWarning(hub, error), `huggingface-tokenizer-load:${hub}`);
            this.huggingFaceTokenizerCache.set(hub, null);
            return null;
        }
    }
    async loadHuggingFaceTokenizersModule() {
        if (!this.huggingFaceTokenizersModule) {
            this.huggingFaceTokenizersModule = this.importRuntimePackage("@huggingface/tokenizers");
        }
        return this.huggingFaceTokenizersModule;
    }
    async fetchHuggingFaceJson(hub, file, optional = false) {
        const response = await fetch(`https://huggingface.co/${hub}/raw/main/${file}`, {
            headers: this.getHuggingFaceHeaders(),
        });
        if (!response.ok) {
            if (optional && response.status === 404) {
                return null;
            }
            throw new Error(`Failed to fetch ${file} for '${hub}' (HTTP ${response.status})`);
        }
        return response.json();
    }
    getHuggingFaceHeaders() {
        const token = process.env.HF_TOKEN ?? process.env.HUGGING_FACE_HUB_TOKEN ?? process.env.HUGGINGFACE_TOKEN;
        return token ? { Authorization: `Bearer ${token}` } : undefined;
    }
    buildHuggingFaceFallbackWarning(hub, error) {
        const message = formatErrorMessage(error);
        if (message.includes("Token analyzer dependency '@huggingface/tokenizers' could not be loaded")) {
            return `TokenScope used approximate token counting for '${hub}' because the lightweight tokenizer runtime was unavailable.`;
        }
        return `TokenScope used approximate token counting for '${hub}' because an exact public tokenizer could not be loaded.`;
    }
    async importRuntimePackage(pkg) {
        try {
            return await import(pkg);
        }
        catch (error) {
            throw new Error(`Token analyzer dependency '${pkg}' could not be loaded. ` +
                `Reinstall the npm package or rerun plugin/install.sh. ${formatErrorMessage(error)}`);
        }
    }
}
//# sourceMappingURL=tokenizer.js.map