import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if required environment variables for auth are set
    const authEnv = {
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      hasUrl: !!process.env.NEXTAUTH_URL,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      nodeEnv: process.env.NODE_ENV,
    };

    return NextResponse.json({
      success: true,
      message: 'Auth environment check completed',
      environment: authEnv,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Auth environment check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}