import { NextResponse } from 'next/server';

export async function GET() {
  // Get all environment variables (mask sensitive ones)
  const envVars = {
    MONGODB_URI: process.env.MONGODB_URI ? '[SET]' : '[NOT SET]',
    MONGODB_DB: process.env.MONGODB_DB || '[NOT SET]',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '[SET]' : '[NOT SET]',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || '[NOT SET]',
    NODE_ENV: process.env.NODE_ENV || '[NOT SET]',
  };

  return NextResponse.json({
    status: 'debug',
    timestamp: new Date().toISOString(),
    environment: envVars,
    message: 'Debug information for deployment troubleshooting'
  });
}