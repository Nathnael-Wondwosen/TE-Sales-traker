import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/dbService';

export async function GET() {
  try {
    const dbService = DatabaseService.getInstance();
    const users = await dbService.getAllUsers();
    
    return NextResponse.json({
      success: true,
      message: 'Users retrieved successfully',
      userCount: users.length,
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }))
    });
  } catch (error) {
    console.error('Users test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve users',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}