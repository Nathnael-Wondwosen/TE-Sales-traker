const { MongoClient } = require('mongodb');

async function resetDatabase() {
  const uri = 'mongodb://127.0.0.1:27017';
  const dbName = 'Sales-Tracker';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Drop all collections
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).drop();
      console.log(`Dropped collection: ${collection.name}`);
    }
    
    console.log('All collections dropped successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

resetDatabase();