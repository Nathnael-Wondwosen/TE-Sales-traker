import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'TE-Sales-Tracker',
    timestamp: new Date().toISOString(),
    platform: process.env.RENDER ? 'Render' : 'Unknown',
    nodeEnv: process.env.NODE_ENV,
    message: 'Service is running correctly'
  });
}