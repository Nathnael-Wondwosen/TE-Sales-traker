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

    // Only supervisors and admins can get agent stats
    if (session.user.role !== 'supervisor' && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const agentStats = await dbService.getCustomerCountByAgent();
    
    return NextResponse.json({ success: true, data: agentStats });
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}