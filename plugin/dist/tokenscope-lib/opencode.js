// OpenCode SDK compatibility helpers
function compactRouting(routing = {}) {
    const compacted = {};
    if (routing.directory)
        compacted.directory = routing.directory;
    if (routing.workspace)
        compacted.workspace = routing.workspace;
    return compacted;
}
function queryWithRouting(routing) {
    const compacted = compactRouting(routing);
    return Object.keys(compacted).length > 0 ? { query: compacted } : {};
}
function isFailedResponse(response) {
    return response === undefined || (!!response && typeof response === "object" && "error" in response && response.error !== undefined);
}
async function firstSuccessful(attempts) {
    let lastError;
    for (const attempt of attempts) {
        try {
            const response = await attempt();
            if (isFailedResponse(response)) {
                lastError = response?.error ?? new Error("OpenCode API returned no data");
                continue;
            }
            return response;
        }
        catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}
export async function fetchSessionMessages(client, sessionID, routing = {}) {
    const messages = client?.session?.messages;
    if (typeof messages !== "function") {
        throw new Error("OpenCode session.messages API is unavailable");
    }
    const compactedRouting = compactRouting(routing);
    return firstSuccessful([
        () => messages.call(client.session, { path: { id: sessionID }, ...queryWithRouting(compactedRouting), throwOnError: true }),
        () => messages.call(client.session, { path: { sessionID }, ...queryWithRouting(compactedRouting), throwOnError: true }),
        () => messages.call(client.session, { sessionID, ...compactedRouting }, { throwOnError: true }),
    ]);
}
export async function fetchSessionChildren(client, sessionID, routing = {}) {
    const children = client?.session?.children;
    if (typeof children !== "function") {
        throw new Error("OpenCode session.children API is unavailable");
    }
    const compactedRouting = compactRouting(routing);
    return firstSuccessful([
        () => children.call(client.session, { path: { id: sessionID }, ...queryWithRouting(compactedRouting), throwOnError: true }),
        () => children.call(client.session, { path: { sessionID }, ...queryWithRouting(compactedRouting), throwOnError: true }),
        () => children.call(client.session, { sessionID, ...compactedRouting }, { throwOnError: true }),
    ]);
}
export async function fetchToolList(client, providerID, modelID, routing = {}) {
    const list = client?.tool?.list;
    if (typeof list !== "function") {
        throw new Error("OpenCode tool.list API is unavailable");
    }
    const compactedRouting = compactRouting(routing);
    return firstSuccessful([
        () => list.call(client.tool, { query: { ...compactedRouting, provider: providerID, model: modelID }, throwOnError: true }),
        () => list.call(client.tool, { ...compactedRouting, provider: providerID, model: modelID }, { throwOnError: true }),
    ]);
}
export async function fetchProviderList(client, routing = {}) {
    const list = client?.provider?.list;
    if (typeof list !== "function") {
        throw new Error("OpenCode provider.list API is unavailable");
    }
    const compactedRouting = compactRouting(routing);
    const hasRouting = Object.keys(compactedRouting).length > 0;
    const attempts = [];
    attempts.push(() => list.call(client.provider, { ...queryWithRouting(compactedRouting), throwOnError: true }));
    if (hasRouting) {
        attempts.push(() => list.call(client.provider, { ...compactedRouting }, { throwOnError: true }));
    }
    if (!hasRouting) {
        attempts.push(() => list.call(client.provider, {}, { throwOnError: true }));
        attempts.push(() => list.call(client.provider, { throwOnError: true }));
    }
    return firstSuccessful(attempts);
}
export function unwrapResponseData(response) {
    return (response?.data ?? response);
}
//# sourceMappingURL=opencode.js.map