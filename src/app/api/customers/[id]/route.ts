import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseService } from '@/lib/dbService';
import cache from '@/lib/cache';
import { ObjectId } from 'mongodb';
import { validateCustomer } from '@/lib/validation';

const dbService = DatabaseService.getInstance();

function isValidObjectId(id: string) {
  try { return new ObjectId(id).toString() === id; } catch { return false; }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 });
    }

    const customer = await dbService.getCustomerById(id);
    if (!customer) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    // Agents can only access their own customers; admins can access all
    if (session.user.role === 'agent' && customer.agentId.toString() !== (session.user as any).id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    console.error('Error getting customer:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 });
    }

    const existing = await dbService.getCustomerById(id);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    // Agents can only modify their own customers; admins can modify all
    if (session.user.role === 'agent' && existing.agentId.toString() !== (session.user as any).id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // Only allow certain fields to be updated by agents
    const updates: any = {};
    if (typeof body.name === 'string') updates.name = body.name;
    if (typeof body.contactTitle === 'string') updates.contactTitle = body.contactTitle;
    if (typeof body.email === 'string') updates.email = body.email;
    if (typeof body.phone === 'string') updates.phone = body.phone;

    // Admins may also reassign agentId
    if (session.user.role === 'admin' && body.agentId && isValidObjectId(body.agentId)) {
      updates.agentId = new ObjectId(body.agentId);
    }

    // Validate if name/agentId present (basic)
    const candidate = { ...existing, ...updates };
    const validation = validateCustomer({
      name: candidate.name,
      contactTitle: candidate.contactTitle,
      email: candidate.email,
      phone: candidate.phone,
      agentId: candidate.agentId?.toString() || (session.user as any).id,
    });
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const updated = await dbService.updateCustomer(id, updates);
    // Invalidate caches for old and potentially new agent assignment
    try {
      cache.delete(`customers_agent_${existing.agentId.toString()}`);
      if (updates.agentId) {
        cache.delete(`customers_agent_${updates.agentId.toString()}`);
      }
    } catch {}
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 });
    }

    const existing = await dbService.getCustomerById(id);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    if (session.user.role === 'agent' && existing.agentId.toString() !== (session.user as any).id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const ok = await dbService.deleteCustomer(id);
    try { cache.delete(`customers_agent_${existing.agentId.toString()}`); } catch {}
    return NextResponse.json({ success: ok, message: ok ? 'Deleted' : 'Not deleted' }, { status: ok ? 200 : 500 });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
