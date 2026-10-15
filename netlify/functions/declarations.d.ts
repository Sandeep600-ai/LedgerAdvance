/**
 * Ambient type declarations for Netlify Functions and Netlify Blobs.
 * Resolves IDE TypeScript diagnostics when node_modules is not installed locally.
 */

declare module "@netlify/blobs" {
  export interface StoreOptions {
    name?: string;
    siteID?: string;
    token?: string;
    consistency?: "strong" | "eventual";
    edgeURL?: string;
    [key: string]: any;
  }

  export interface GetOptions {
    type?: "text" | "json" | "arrayBuffer" | "blob" | "stream";
  }

  export interface SetOptions {
    metadata?: Record<string, any>;
    [key: string]: any;
  }

  export interface Store {
    get(key: string, options?: GetOptions): Promise<any>;
    getWithMetadata?(key: string, options?: GetOptions): Promise<any>;
    set(key: string, data: any, options?: SetOptions): Promise<void>;
    setJSON(key: string, data: any, options?: SetOptions): Promise<void>;
    delete(key: string): Promise<void>;
    list?(options?: any): Promise<any>;
  }

  export function getStore(name: string, options?: StoreOptions): Store;
  export function getStore(options: StoreOptions): Store;
}

declare module "@netlify/functions" {
  export interface Context {
    account?: { id: string };
    site?: { id: string; url: string };
    geo?: {
      city?: string;
      country?: { code?: string; name?: string };
      subdivision?: { code?: string; name?: string };
      timezone?: string;
      latitude?: number;
      longitude?: number;
    };
    ip?: string;
    params?: Record<string, string>;
    requestId?: string;
    server?: { id: string };
    cookies?: any;
    next?: () => Promise<Response>;
    [key: string]: any;
  }

  export interface Config {
    path?: string | string[];
    schedule?: string;
    preferStatic?: boolean;
    rateLimit?: any;
    [key: string]: any;
  }

  export type Handler = (req: Request, context: Context) => Promise<Response> | Response;
}
