import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET() {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      return NextResponse.json({
        success: false,
        message: 'MONGODB_URI environment variable is not set'
      }, { status: 500 });
    }

    // Test connection with shorter timeout
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    await client.db().command({ ping: 1 });
    await client.close();

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Database connection error:', error);
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}