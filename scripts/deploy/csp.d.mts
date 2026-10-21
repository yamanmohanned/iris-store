export function inlineScriptHashes(html: string): string[];
export function contentSecurityPolicy(html: string): string;
export const SECURITY_HEADERS: Record<string, string>;
export const HSTS: string;
export function pageHeaders(html: string): Record<string, string>;
