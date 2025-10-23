import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { DatabaseService } from '@/lib/dbService';

export async function GET() {
  try {
    const client = await clientPromise;
    // Quick ping to ensure connectivity
    await client.db().command({ ping: 1 });
    
    // Test database service
    const dbService = DatabaseService.getInstance();
    await dbService.getAllUsers();
    
    return NextResponse.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'Connected'
    });
  } catch (err: any) {
    return NextResponse.json({ 
      status: 'error', 
      message: err?.message ?? 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
