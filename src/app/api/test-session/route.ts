import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  return NextResponse.json({
    session: session || null,
    message: session ? 'User is authenticated' : 'User is not authenticated'
  });
}