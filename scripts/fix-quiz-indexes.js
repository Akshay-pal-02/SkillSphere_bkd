const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const dropIndex = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/lms';
    console.log(`Connecting to ${mongoUri}...`);
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully');

    const db = mongoose.connection.db;
    const collection = db.collection('Quizz');

    console.log('Checking indexes on collection "Quizz"...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    const indexToDrop = 'courseId_1_type_1';
    
    if (indexes.some(idx => idx.name === indexToDrop)) {
      console.log(`Dropping index "${indexToDrop}"...`);
      await collection.dropIndex(indexToDrop);
      console.log('Index dropped successfully!');
    } else {
      console.log(`Index "${indexToDrop}" not found. No action needed.`);
    }

    console.log('Closing connection...');
    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('FAILED:', error.message);
    process.exit(1);
  }
};

dropIndex();
