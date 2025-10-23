import clientPromise from '@/lib/mongodb';
import { User, Customer, Interaction } from '@/lib/models';
import { ObjectId } from 'mongodb';
import cache from '@/lib/cache';

export class DatabaseService {
  private static instance: DatabaseService;
  private dbName: string;

  private constructor() {
    this.dbName = process.env.MONGODB_DB || 'sales-track';
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async getCollection(collectionName: string) {
    const client = await clientPromise;
    return client.db(this.dbName).collection(collectionName);
  }

  // User operations
  async createUser(user: Omit<User, '_id'>): Promise<User> {
    const collection = await this.getCollection('users');
    const result = await collection.insertOne({ ...user, createdAt: new Date(), updatedAt: new Date() });
    return { ...user, _id: result.insertedId, createdAt: new Date(), updatedAt: new Date() };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const collection = await this.getCollection('users');
    return await collection.findOne({ email }) as User | null;
  }

  async getUserById(id: string): Promise<User | null> {
    const collection = await this.getCollection('users');
    return await collection.findOne({ _id: new ObjectId(id) }) as User | null;
  }

  async getAllUsers(): Promise<User[]> {
    const collection = await this.getCollection('users');
    return await collection.find({}).toArray() as User[];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const collection = await this.getCollection('users');
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result as User | null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const collection = await this.getCollection('users');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }

  // Customer operations
  async createCustomer(customer: Omit<Customer, '_id'>): Promise<Customer> {
    const collection = await this.getCollection('customers');
    const result = await collection.insertOne({ ...customer, createdAt: new Date(), updatedAt: new Date() });
    
    // Invalidate cache for this agent
    cache.delete(`customers_agent_${customer.agentId.toString()}`);
    
    return { ...customer, _id: result.insertedId, createdAt: new Date(), updatedAt: new Date() };
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    const collection = await this.getCollection('customers');
    return await collection.findOne({ _id: new ObjectId(id) }) as Customer | null;
  }

  async getCustomersByAgent(agentId: string): Promise<Customer[]> {
    const cacheKey = `customers_agent_${agentId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const collection = await this.getCollection('customers');
    const customers = await collection.find({ agentId: new ObjectId(agentId) }).toArray() as Customer[];
    
    // Cache for 2 minutes
    cache.set(cacheKey, customers, 2 * 60 * 1000);
    return customers;
  }

  async getAllCustomers(): Promise<Customer[]> {
    const collection = await this.getCollection('customers');
    return await collection.find({}).toArray() as Customer[];
  }

  async getCustomersWithLatestInteraction(agentId?: string): Promise<(Customer & { latestInteraction?: Interaction, agentName?: string })[]> {
    const customers = await this.getCollection('customers');
    const filter: any = {};
    if (agentId) filter.agentId = new ObjectId(agentId);

    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: 'interactions',
          let: { cid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$customerId', '$$cid'] } } },
            { $sort: { date: -1 } },
            { $limit: 1 },
          ],
          as: 'latestInteraction'
        }
      },
      {
        $addFields: {
          latestInteraction: { $arrayElemAt: ['$latestInteraction', 0] }
        }
      },
      // Lookup agent details to get agent name
      {
        $lookup: {
          from: 'users',
          localField: 'agentId',
          foreignField: '_id',
          as: 'agent'
        }
      },
      {
        $addFields: {
          agentName: { $arrayElemAt: ['$agent.name', 0] }
        }
      },
      {
        $project: {
          agent: 0 // Remove the agent array from the result
        }
      }
    ];

    const result = await customers.aggregate(pipeline).toArray();
    return result as any;
  }

  async getCustomerCountByAgent(): Promise<{ agentId: string; agentName: string; customerCount: number }[]> {
    // First, get all agents
    const users = await this.getCollection('users');
    const customers = await this.getCollection('customers');
    
    // Get all agents
    const agents = await users.find({ role: 'agent' }).toArray();
    
    // Get customer counts per agent
    const customerCounts = await customers.aggregate([
      {
        $group: {
          _id: "$agentId",
          customerCount: { $sum: 1 }
        }
      }
    ]).toArray();
    
    // Create a map of agentId to customerCount
    const countMap = new Map<string, number>();
    for (const item of customerCounts) {
      countMap.set(item._id.toString(), item.customerCount);
    }
    
    // Return all agents with their customer counts (0 if no customers)
    return agents.map(agent => ({
      agentId: agent._id.toString(),
      agentName: agent.name,
      customerCount: countMap.get(agent._id.toString()) || 0
    }));
  }

  async getPendingFollowUpsByAgent(): Promise<{ agentId: string; pendingCount: number }[]> {
    const interactions = await this.getCollection('interactions');
    
    // First, get the latest interaction for each customer
    const latestInteractions = await interactions.aggregate([
      // Sort by date descending
      { $sort: { customerId: 1, date: -1 } },
      // Group by customerId to get the latest interaction per customer
      {
        $group: {
          _id: "$customerId",
          latestInteraction: { $first: "$$ROOT" }
        }
      },
      // Replace root to get the interaction object
      { $replaceRoot: { newRoot: "$latestInteraction" } }
    ]).toArray();
    
    // Filter for pending or in-progress follow-ups
    const pendingInteractions = latestInteractions.filter(
      interaction => interaction.followUpStatus === 'pending' || interaction.followUpStatus === 'in-progress'
    );
    
    // Count pending follow-ups per agent
    const pendingCounts = pendingInteractions.reduce((acc, interaction) => {
      const agentId = interaction.agentId.toString();
      acc[agentId] = (acc[agentId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Get all agents to ensure we include agents with zero pending follow-ups
    const users = await this.getCollection('users');
    const agents = await users.find({ role: 'agent' }).toArray();
    
    // Return all agents with their pending follow-up counts (0 if none)
    return agents.map(agent => ({
      agentId: agent._id.toString(),
      pendingCount: pendingCounts[agent._id.toString()] || 0
    }));
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    const collection = await this.getCollection('customers');
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result as Customer | null;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const collection = await this.getCollection('customers');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }

  // Interaction operations
  async createInteraction(interaction: Omit<Interaction, '_id'>): Promise<Interaction> {
    const collection = await this.getCollection('interactions');
    const stored: Omit<Interaction, '_id'> = {
      ...interaction,
      date: interaction.date ? new Date(interaction.date) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    const result = await collection.insertOne(stored);
    
    // Invalidate caches
    cache.delete(`interactions_agent_${interaction.agentId.toString()}`);
    cache.delete('interactions_with_details');
    
    return { 
      ...stored,
      _id: result.insertedId
    } as Interaction;
  }

  async getInteractionById(id: string): Promise<Interaction | null> {
    const collection = await this.getCollection('interactions');
    return await collection.findOne({ _id: new ObjectId(id) }) as Interaction | null;
  }

  async getInteractionsByAgent(agentId: string): Promise<Interaction[]> {
    const cacheKey = `interactions_agent_${agentId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const collection = await this.getCollection('interactions');
    const interactions = await collection.find({ agentId: new ObjectId(agentId) })
      .sort({ date: -1 })
      .toArray() as Interaction[];
    
    // Cache for 1 minute
    cache.set(cacheKey, interactions, 1 * 60 * 1000);
    return interactions;
  }

  async getInteractionsByCustomer(customerId: string): Promise<Interaction[]> {
    const collection = await this.getCollection('interactions');
    return await collection.find({ customerId: new ObjectId(customerId) })
      .sort({ date: -1 })
      .toArray() as Interaction[];
  }

  async getAllInteractions(): Promise<Interaction[]> {
    const collection = await this.getCollection('interactions');
    return await collection.find({})
      .sort({ date: -1 })
      .toArray() as Interaction[];
  }

  async updateInteraction(id: string, updates: Partial<Interaction>): Promise<Interaction | null> {
    const collection = await this.getCollection('interactions');
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result as Interaction | null;
  }

  async deleteInteraction(id: string): Promise<boolean> {
    const collection = await this.getCollection('interactions');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }

  // Supervisor operations - get interactions with customer and agent details
  async getInteractionsWithDetails(): Promise<any[]> {
    const cacheKey = 'interactions_with_details';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const interactions = await this.getAllInteractions();
    const result = [];
    
    for (const interaction of interactions) {
      const customer = await this.getCustomerById(interaction.customerId.toString());
      const agent = await this.getUserById(interaction.agentId.toString());
      
      result.push({
        ...interaction,
        customerName: customer?.name || 'Unknown',
        agentName: agent?.name || 'Unknown',
        customerContactTitle: customer?.contactTitle || '',
        customerEmail: customer?.email || '',
      });
    }
    
    // Cache for 1 minute
    cache.set(cacheKey, result, 1 * 60 * 1000);
    return result;
  }
}