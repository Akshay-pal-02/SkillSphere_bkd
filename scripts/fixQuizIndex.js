/**
 * One-time script to drop the stale index on the Quizz collection.
 * 
 * Run this with: node scripts/fixQuizIndex.js
 * 
 * The old index "courseId_1_type_1" was from a previous schema version.
 * The current schema uses { courseId, sectionId } as the unique compound key.
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('Quizz');

    // List all existing indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes on Quizz collection:');
    indexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
    });

    // Drop the stale index if it exists
    const staleIndex = indexes.find(idx => idx.name === 'courseId_1_type_1');
    if (staleIndex) {
      await collection.dropIndex('courseId_1_type_1');
      console.log('\n✅ Dropped stale index: courseId_1_type_1');
    } else {
      console.log('\n⚠️  Index "courseId_1_type_1" not found — may have already been removed.');
    }

    // Also check for any other problematic indexes and drop them
    const allStaleIndexes = indexes.filter(idx => 
      idx.name !== '_id_' && 
      idx.name !== 'courseId_1_sectionId_1' &&
      idx.unique
    );

    for (const idx of allStaleIndexes) {
      if (idx.name === 'courseId_1_type_1') continue; // already handled
      console.log(`⚠️  Found extra unique index: ${idx.name} — dropping...`);
      await collection.dropIndex(idx.name);
      console.log(`✅ Dropped: ${idx.name}`);
    }

    // Verify final state
    const finalIndexes = await collection.indexes();
    console.log('\n📋 Final indexes on Quizz collection:');
    finalIndexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
    });

    console.log('\n🎉 Done! You can now restart your backend server.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

run();
