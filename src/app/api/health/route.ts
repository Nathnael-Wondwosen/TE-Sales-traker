import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      hasMongoUri: !!process.env.MONGODB_URI,
      hasMongoDb: !!process.env.MONGODB_DB,
      hasAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasAuthUrl: !!process.env.NEXTAUTH_URL,
      nodeEnv: process.env.NODE_ENV,
    };

    // Test MongoDB connection
    let dbStatus = 'Unknown';
    let dbError = null;
    
    try {
      const client = await clientPromise;
      await client.db().command({ ping: 1 });
      dbStatus = 'Connected';
    } catch (err: any) {
      dbError = err?.message ?? 'Unknown error';
      dbStatus = 'Disconnected';
    }

    return NextResponse.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      database: {
        status: dbStatus,
        error: dbError
      },
      message: 'Application health check completed'
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