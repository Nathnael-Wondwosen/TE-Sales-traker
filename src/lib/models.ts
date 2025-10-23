import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'supervisor' | 'agent';
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  _id?: ObjectId;
  name: string;
  contactTitle?: string;
  email?: string;
  phone?: string;
  agentId: ObjectId; // Reference to the agent who owns this customer
  createdAt: Date;
  updatedAt: Date;
}

export interface Interaction {
  _id?: ObjectId;
  customerId: ObjectId; // Reference to the customer
  agentId: ObjectId; // Reference to the agent
  callDuration?: number; // in seconds
  followUpStatus: 'pending' | 'in-progress' | 'completed' | 'closed';
  note?: string;
  supervisorComment?: string;
  callStatus: 'called' | 'not-reached' | 'busy' | 'voicemail' | 'scheduled';
  date: Date; // Automatically set to current date
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}