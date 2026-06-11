export interface RoutingParams {
    directory?: string;
    workspace?: string;
}
export declare function fetchSessionMessages(client: any, sessionID: string, routing?: RoutingParams): Promise<any>;
export declare function fetchSessionChildren(client: any, sessionID: string, routing?: RoutingParams): Promise<any>;
export declare function fetchToolList(client: any, providerID: string, modelID: string, routing?: RoutingParams): Promise<any>;
export declare function fetchProviderList(client: any, routing?: RoutingParams): Promise<any>;
export declare function unwrapResponseData<T>(response: any): T;
//# sourceMappingURL=opencode.d.ts.map