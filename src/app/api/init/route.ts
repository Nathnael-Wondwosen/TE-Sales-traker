import { DatabaseService } from '@/lib/dbService';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';

const dbService = DatabaseService.getInstance();

export async function GET() {
  try {
    // Check if users already exist
    const existingUsers = await dbService.getAllUsers();
    if (existingUsers.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Database already initialized'
      });
    }

    // Create sample users
    const adminPassword = await hash('admin123', 10);
    const supervisorPassword = await hash('supervisor123', 10);
    const agentPassword = await hash('agent123', 10);

    const admin = await dbService.createUser({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const supervisor = await dbService.createUser({
      name: 'Supervisor User',
      email: 'supervisor@example.com',
      passwordHash: supervisorPassword,
      role: 'supervisor',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const agent = await dbService.createUser({
      name: 'Agent User',
      email: 'agent@example.com',
      passwordHash: agentPassword,
      role: 'agent',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create sample customers
    const customer1 = await dbService.createCustomer({
      name: 'John Doe',
      contactTitle: 'CEO',
      email: 'john@example.com',
      phone: '+1234567890',
      agentId: agent._id!,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const customer2 = await dbService.createCustomer({
      name: 'Jane Smith',
      contactTitle: 'Marketing Director',
      email: 'jane@example.com',
      phone: '+1234567891',
      agentId: agent._id!,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create sample interactions
    await dbService.createInteraction({
      customerId: customer1._id!,
      agentId: agent._id!,
      callDuration: 300,
      followUpStatus: 'completed',
      note: 'Discussed new product features',
      callStatus: 'called',
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await dbService.createInteraction({
      customerId: customer2._id!,
      agentId: agent._id!,
      callDuration: 180,
      followUpStatus: 'pending',
      note: 'Needs to review proposal',
      callStatus: 'voicemail',
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Database initialized with sample data',
      data: {
        users: [admin, supervisor, agent],
        customers: [customer1, customer2]
      }
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to initialize database',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}