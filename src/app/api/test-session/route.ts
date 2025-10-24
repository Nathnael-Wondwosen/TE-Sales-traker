import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: Request) {
  try {
    console.log('Test session API called');
    
    // Try to get token
    const token = await getToken({ 
      req: req as any, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    console.log('Token retrieved:', token ? 'Present' : 'Not present');
    
    return NextResponse.json({
      success: true,
      message: 'Session test completed',
      hasToken: !!token,
      token: token ? {
        email: token.email,
        role: (token as any).role,
      } : null,
      env: {
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        hasUrl: !!process.env.NEXTAUTH_URL,
        nodeEnv: process.env.NODE_ENV,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      }
    });
  } catch (error) {
    console.error('Session test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Session test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}