const { MongoClient } = require('mongodb');

async function checkUsers() {
  const uri = 'mongodb://127.0.0.1:27017';
  const dbName = 'Sales-Tracker';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Check if users collection exists
    const collections = await db.listCollections().toArray();
    const usersCollectionExists = collections.some(collection => collection.name === 'users');
    
    if (!usersCollectionExists) {
      console.log('Users collection does not exist');
      return;
    }
    
    // Get all users
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users:`);
    
    users.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - ${user.name}`);
    });
    
    if (users.length === 0) {
      console.log('No users found in the database');
    }
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

checkUsers();