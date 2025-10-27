import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    console.log('[Test] Testing MongoDB connection');
    
    // Check environment variables
    const envCheck = {
      hasMongoUri: !!process.env.MONGODB_URI,
      hasMongoDb: !!process.env.MONGODB_DB,
      mongoUri: process.env.MONGODB_URI ? '[SET]' : '[NOT SET]',
      mongoDb: process.env.MONGODB_DB || '[NOT SET]',
    };
    
    console.log('[Test] Environment check:', envCheck);
    
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({
        success: false,
        message: 'MONGODB_URI environment variable is not set',
        environment: envCheck
      }, { status: 500 });
    }

    // Test MongoDB connection
    console.log('[Test] Connecting to MongoDB');
    const client = await clientPromise;
    console.log('[Test] Getting database');
    const db = client.db(process.env.MONGODB_DB);
    console.log('[Test] Listing collections');
    const collections = await db.listCollections().toArray();
    
    console.log('[Test] MongoDB connection successful');
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connection test successful',
      environment: envCheck,
      collections: collections.map(c => c.name),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Test] MongoDB connection error:', error);
    return NextResponse.json({
      success: false,
      message: 'MongoDB connection test failed',
      error: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}