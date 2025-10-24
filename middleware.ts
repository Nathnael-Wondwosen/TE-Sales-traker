import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Protected routes (prefixes)
const protectedPrefixes = ['/agent', '/supervisor', '/admin'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  console.log('Middleware called for path:', pathname);
  
  // Skip middleware for API routes, static files, and login page
  if (
    pathname.includes('/api/') || 
    pathname.includes('/_next/') || 
    pathname.includes('/favicon.ico') ||
    pathname.includes('/logo.jpg') ||
    pathname === '/login' ||
    pathname === '/debug'
  ) {
    console.log('Skipping middleware for path:', pathname);
    return NextResponse.next();
  }

  const requiresAuth = protectedPrefixes.some((p) => pathname.startsWith(p));
  console.log('Requires auth:', requiresAuth);

  if (!requiresAuth) {
    console.log('No auth required, continuing');
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  console.log('Token present:', !!token);
  
  if (!token) {
    console.log('No token, redirecting to login');
    const url = new URL('/login', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Basic RBAC route gating
  const role = (token as any).role as string | undefined;
  console.log('User role:', role);
  
  if (pathname.startsWith('/admin') && role !== 'admin') {
    console.log('Admin route accessed by non-admin, redirecting to home');
    return NextResponse.redirect(new URL('/', req.url));
  }
  if (pathname.startsWith('/supervisor') && role !== 'supervisor' && role !== 'admin') {
    console.log('Supervisor route accessed by non-supervisor, redirecting to home');
    return NextResponse.redirect(new URL('/', req.url));
  }

  console.log('Access granted');
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.jpg).*)'],
};