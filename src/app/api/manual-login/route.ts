import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { jwtVerify } from 'jose';

// Simple manual login endpoint for testing
export async function POST(request: Request) {
  const { email, password } = await request.json();
  
  // Simple validation (in a real app, you'd check against your database)
  if (email === 'admin@example.com' && password === 'admin123') {
    // Create a simple JWT token
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 24 * 30; // 30 days
    
    const token = await new SignJWT({ 
      email, 
      role: 'admin',
      name: 'Admin User'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .sign(secret);
    
    const response = NextResponse.json({ 
      success: true, 
      message: 'Login successful'
    });
    
    // Set the cookie
    response.cookies.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    
    return response;
  }
  
  return NextResponse.json({ 
    success: false, 
    message: 'Invalid credentials' 
  }, { status: 401 });
}