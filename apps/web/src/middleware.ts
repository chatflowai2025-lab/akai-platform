import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];

  // If this is a subdomain of getakai.ai (not www, not bare getakai)
  if (
    hostname.endsWith('.getakai.ai') &&
    subdomain !== 'www' &&
    subdomain !== 'getakai'
  ) {
    // Rewrite to our site renderer — preserves the original URL path
    return NextResponse.rewrite(new URL(`/site/${subdomain}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply to all routes except Next.js internals, API routes, and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
