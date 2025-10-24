import { NextResponse } from 'next/server';

export async function GET() {
  // Check if required environment variables are set
  const config = {
    hasMongoUri: !!process.env.MONGODB_URI,
    hasMongoDb: !!process.env.MONGODB_DB,
    hasAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasAuthUrl: !!process.env.NEXTAUTH_URL,
    nodeEnv: process.env.NODE_ENV,
    authUrl: process.env.NEXTAUTH_URL,
  };

  return NextResponse.json({
    config,
    message: 'Environment configuration check',
  });
}