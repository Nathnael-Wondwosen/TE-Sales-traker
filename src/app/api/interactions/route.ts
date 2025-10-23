import { DatabaseService } from '@/lib/dbService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { Interaction } from '@/lib/models';
import { ObjectId } from 'mongodb';
import { validateInteraction } from '@/lib/validation';
import cache from '@/lib/cache';

const dbService = DatabaseService.getInstance();

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // If a customerId is specified, return interactions for that customer only
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    if (customerId) {
      const interactions = await dbService.getInteractionsByCustomer(customerId);
      return NextResponse.json({ success: true, data: interactions });
    }

    // Otherwise, fall back to role-based listing
    if (session.user.role === 'agent') {
      const interactions = await dbService.getInteractionsByAgent((session.user as any).id);
      return NextResponse.json({ success: true, data: interactions });
    }
    if (session.user.role === 'supervisor' || session.user.role === 'admin') {
      const interactions = await dbService.getInteractionsWithDetails();
      return NextResponse.json({ success: true, data: interactions });
    }
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error fetching interactions:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only agents and admins can create interactions
    if (session.user.role !== 'agent' && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    // Add agentId for agents
    if (session.user.role === 'agent') {
      body.agentId = (session.user as any).id;
    }
    
    // Validate data
    const validation = validateInteraction(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const interactionData: Omit<Interaction, '_id'> = {
      customerId: new ObjectId(body.customerId),
      agentId: new ObjectId(body.agentId),
      callDuration: body.callDuration || 0,
      followUpStatus: body.followUpStatus || 'pending',
      note: body.note || '',
      supervisorComment: body.supervisorComment || undefined,
      callStatus: body.callStatus || 'called',
      date: body.date ? new Date(body.date) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const interaction = await dbService.createInteraction(interactionData);
    
    return NextResponse.json({ 
      success: true, 
      data: interaction,
      message: 'Interaction recorded successfully' 
    });
  } catch (error) {
    console.error('Error creating interaction:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update an interaction (used by supervisors to add comments)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only supervisors and admins can update interactions (to add comments)
    if (session.user.role !== 'supervisor' && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    // Validate required fields
    if (!body.id) {
      return NextResponse.json(
        { success: false, message: 'Interaction ID is required' },
        { status: 400 }
      );
    }

    const updates: Partial<Interaction> = {};
    
    // Only allow updating the supervisor comment
    if (body.supervisorComment !== undefined) {
      updates.supervisorComment = body.supervisorComment;
    }
    
    // Add the supervisor's ID to track who made the comment
    updates.updatedAt = new Date();

    const interaction = await dbService.updateInteraction(body.id, updates);
    
    if (!interaction) {
      return NextResponse.json(
        { success: false, message: 'Interaction not found' },
        { status: 404 }
      );
    }
    
    // Invalidate cache for interactions
    cache.delete('interactions_with_details');
    
    return NextResponse.json({ 
      success: true, 
      data: interaction,
      message: 'Interaction updated successfully' 
    });
  } catch (error) {
    console.error('Error updating interaction:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}