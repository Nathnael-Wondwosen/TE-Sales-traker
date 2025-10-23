import { DatabaseService } from '@/lib/dbService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { Customer } from '@/lib/models';
import { ObjectId } from 'mongodb';
import { validateCustomer } from '@/lib/validation';

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

    // Only agents, supervisors, and admins can get customers
    if (session.user.role !== 'agent' && session.user.role !== 'admin' && (session.user as any).role !== 'supervisor') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const withLatest = searchParams.get('withLatest') === 'true';
    const qAgentId = searchParams.get('agentId');

    if (withLatest) {
      if (session.user.role === 'agent') {
        const customers = await dbService.getCustomersWithLatestInteraction((session.user as any).id);
        return NextResponse.json({ success: true, data: customers });
      }
      // Admin/Supervisor: allow filtering by agentId
      if (qAgentId) {
        const customers = await dbService.getCustomersWithLatestInteraction(qAgentId);
        return NextResponse.json({ success: true, data: customers });
      }
      const customers = await dbService.getCustomersWithLatestInteraction();
      return NextResponse.json({ success: true, data: customers });
    }

    if (session.user.role === 'agent') {
      const customers = await dbService.getCustomersByAgent((session.user as any).id);
      return NextResponse.json({ success: true, data: customers });
    }
    // Admin/Supervisor: allow filtering by agentId
    if (qAgentId) {
      const customers = await dbService.getCustomersByAgent(qAgentId);
      return NextResponse.json({ success: true, data: customers });
    }
    const customers = await dbService.getAllCustomers();
    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only agents and admins can create customers
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
    const validation = validateCustomer(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const customerData: Omit<Customer, '_id'> = {
      name: body.name,
      contactTitle: body.contactTitle || '',
      email: body.email || '',
      phone: body.phone || '',
      agentId: new ObjectId(body.agentId),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const customer = await dbService.createCustomer(customerData);
    
    return NextResponse.json({ 
      success: true, 
      data: customer,
      message: 'Customer created successfully' 
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}