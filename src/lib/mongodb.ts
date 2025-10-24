import { MongoClient } from 'mongodb';

// Reuse the MongoClient across hot reloads in development to prevent
// exhausting connections.
// eslint-disable-next-line no-var
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('Missing MONGODB_URI. Set it in your .env.local or Vercel environment variables');
}

const client = new MongoClient(uri, {
  // Add connection options for better reliability
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

let clientPromise: Promise<MongoClient>;
// Mask credentials in logs
const safeUri = uri.replace(/(mongodb(?:\+srv)?:\/\/)([^@]+)@/, '$1***@');

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = client.connect().catch(err => {
      console.error('[DB] MongoDB connection failed in development:', err?.message || err);
      throw err;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, always create a new connection
  clientPromise = client.connect().catch(err => {
    console.error('[DB] MongoDB connection failed in production:', err?.message || err);
    throw err;
  });
}

// Log connection status once per module load (development only)
clientPromise
  .then(() => {
    if (process.env.NODE_ENV === 'development') {
      const dbName = process.env.MONGODB_DB || '(default)';
      console.log(`[DB] Connected to MongoDB ${dbName} @ ${safeUri}`);
    }
  })
  .catch((err) => {
    console.error('[DB] MongoDB connection error:', err?.message || err);
  });

export default clientPromise;

export async function getDb(dbName?: string) {
  const client = await clientPromise;
  const name = dbName || process.env.MONGODB_DB;
  return name ? client.db(name) : client.db();
}