const { MongoClient } = require('mongodb');
const { compare } = require('bcryptjs');

async function verifyPassword(email, password) {
  const uri = 'mongodb://127.0.0.1:27017';
  const dbName = 'Sales-Tracker';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Find the user
    const user = await db.collection('users').findOne({ email: email });
    
    if (!user) {
      console.log(`User with email ${email} not found`);
      return;
    }
    
    console.log(`User found: ${user.email} (${user.role})`);
    
    // Verify password
    const isPasswordValid = await compare(password, user.passwordHash);
    console.log(`Password is valid: ${isPasswordValid}`);
    
  } catch (error) {
    console.error('Error verifying password:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Test with admin credentials
verifyPassword('admin@example.com', 'admin123');