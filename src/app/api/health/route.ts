import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    // Test MongoDB connection
    const client = await clientPromise;
    await client.db().command({ ping: 1 });
    
    return NextResponse.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'Connected',
      message: 'Application is healthy'
    });
  } catch (err: any) {
    console.error('Health check failed:', err);
    return NextResponse.json({ 
      status: 'error', 
      message: err?.message ?? 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}