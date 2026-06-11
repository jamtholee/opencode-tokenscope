// Types and interfaces for the tokenscope plugin
// Type guards
export function isToolPart(part) {
    return part.type === "tool";
}
export function isReasoningPart(part) {
    return part.type === "reasoning";
}
export function isTextPart(part) {
    return part.type === "text";
}
//# sourceMappingURL=types.js.map