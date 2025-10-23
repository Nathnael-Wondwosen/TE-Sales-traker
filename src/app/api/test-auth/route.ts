import { NextResponse } from 'next/server';

export async function GET() {
  // Simple test to check if the endpoint is working
  return NextResponse.json({ 
    success: true, 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  const data = await request.json();
  console.log('Test auth POST data:', data);
  
  // Return a response that simulates a successful authentication
  const response = NextResponse.json({ 
    success: true, 
    user: {
      id: 'test-user-id',
      email: data.email || 'test@example.com',
      name: 'Test User',
      role: 'admin'
    }
  });
  
  // Set a test cookie
  response.cookies.set('test-auth-cookie', 'test-value', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });
  
  return response;
}