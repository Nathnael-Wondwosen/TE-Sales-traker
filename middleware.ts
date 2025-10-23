import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Protected routes (prefixes)
const protectedPrefixes = ['/agent', '/supervisor', '/admin'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requiresAuth = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (!requiresAuth) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Basic RBAC route gating
  const role = (token as any).role as string | undefined;
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url));
  }
  if (pathname.startsWith('/supervisor') && role !== 'supervisor' && role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/agent/:path*', '/supervisor/:path*', '/admin/:path*'],
};
