// Warning collection helpers for non-fatal analysis issues
export class WarningCollector {
    warnings = [];
    seen = new Set();
    add(message, key) {
        const dedupeKey = key ?? message;
        if (this.seen.has(dedupeKey)) {
            return;
        }
        this.seen.add(dedupeKey);
        this.warnings.push(message);
    }
    list() {
        return [...this.warnings];
    }
}
export function formatErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    try {
        return JSON.stringify(error);
    }
    catch {
        return String(error);
    }
}
//# sourceMappingURL=warnings.js.map