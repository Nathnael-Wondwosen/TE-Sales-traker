import { DatabaseService } from '@/lib/dbService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/models';
import { hash } from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { validateUser } from '@/lib/validation';

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

    const url = new URL(req.url);
    const userId = url.searchParams.get('id');

    // If no user ID is provided, return all users (admin only)
    if (!userId) {
      // Only admins can get all users
      if (session.user.role !== 'admin') {
        return NextResponse.json(
          { success: false, message: 'Forbidden' },
          { status: 403 }
        );
      }

      const users = await dbService.getAllUsers();
      
      // Remove password hashes from the response
      const sanitizedUsers = users.map(user => {
        const { passwordHash, ...sanitizedUser } = user;
        return sanitizedUser;
      });

      return NextResponse.json({ success: true, data: sanitizedUsers });
    }

    // If user ID is provided, return that specific user
    // Allow supervisors and admins to fetch any user, agents can only fetch their own info
    if (session.user.role !== 'admin' && session.user.role !== 'supervisor' && (session.user as any).id !== userId) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const user = await dbService.getUserById(userId);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Remove password hash from the response
    const { passwordHash, ...sanitizedUser } = user;
    
    return NextResponse.json({ success: true, data: sanitizedUser });
  } catch (error) {
    console.error('Error fetching user:', error);
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

    // Only admins can create users
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    // Validate data
    const validation = validateUser(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await dbService.getUserByEmail(body.email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await hash(body.password, 10);

    const userData: Omit<User, '_id'> = {
      name: body.name,
      email: body.email,
      passwordHash: hashedPassword,
      role: body.role,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const user = await dbService.createUser(userData);
    
    // Remove password hash from the response
    const { passwordHash, ...sanitizedUser } = user;
    
    return NextResponse.json({ 
      success: true, 
      data: sanitizedUser,
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can update users
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    // Validate required fields
    if (!body.id) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const updates: Partial<User> = {};
    
    if (body.name) updates.name = body.name;
    if (body.email) updates.email = body.email;
    if (body.role) updates.role = body.role;
    if (body.password) {
      updates.passwordHash = await hash(body.password, 10);
    }
    updates.updatedAt = new Date();

    const user = await dbService.updateUser(body.id, updates);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Remove password hash from the response
    const { passwordHash, ...sanitizedUser } = user;
    
    return NextResponse.json({ 
      success: true, 
      data: sanitizedUser,
      message: 'User updated successfully' 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can delete users
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent deleting oneself
    if (id === (session.user as any).id) {
      return NextResponse.json(
        { success: false, message: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    const result = await dbService.deleteUser(id);
    
    if (!result) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}