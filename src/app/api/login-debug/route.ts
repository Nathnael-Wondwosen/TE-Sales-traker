import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'login-debug-endpoint',
    message: 'Login debug endpoint is working',
    environment: {
      hasAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasAuthUrl: !!process.env.NEXTAUTH_URL,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      nodeEnv: process.env.NODE_ENV,
    },
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Login debug POST request received:', body);
    
    return NextResponse.json({
      status: 'success',
      message: 'Login debug POST endpoint received data',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Login debug POST error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Error processing login debug POST request',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}