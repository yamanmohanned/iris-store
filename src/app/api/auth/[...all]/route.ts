import { getAuth } from "@/server/auth";
import { CLIENT_IP_HEADER } from "@/server/auth";
import { clientIpFrom } from "@/server/security/client-ip";

/**
 * Only the Better Auth endpoints that must be reachable by the browser are exposed (OAuth
 * callbacks and health). All other auth flows run through our Server Actions, which add input
 * validation, captcha, lockouts and rate limits — so there is no unguarded JSON auth API.
 */
const PUBLIC_PATHS = [
  /^\/api\/auth\/callback\/[a-z0-9-]+$/,
  /^\/api\/auth\/ok$/,
  /^\/api\/auth\/error$/,
];

async function handle(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (!PUBLIC_PATHS.some((re) => re.test(pathname))) {
    return new Response("Not found", { status: 404 });
  }
  const headers = new Headers(request.headers);
  const ip = clientIpFrom(headers);
  if (ip) headers.set(CLIENT_IP_HEADER, ip);
  else headers.delete(CLIENT_IP_HEADER);
  const forwarded = new Request(request, { headers, duplex: "half" } as RequestInit);
  return getAuth().handler(forwarded);
}

export const GET = handle;
export const POST = handle;
