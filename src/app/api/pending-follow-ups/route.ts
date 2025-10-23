import { DatabaseService } from '@/lib/dbService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

const dbService = DatabaseService.getInstance();

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only supervisors and admins can get pending follow-ups data
    if (session.user.role !== 'supervisor' && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const pendingFollowUps = await dbService.getPendingFollowUpsByAgent();
    
    return NextResponse.json({ success: true, data: pendingFollowUps });
  } catch (error) {
    console.error('Error fetching pending follow-ups:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}