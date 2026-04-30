const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['student', 'mentor', 'admin'], default: 'student' },
  verificationStatus: { type: String, default: 'verified' }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

const seedAdmin = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const email = 'admin@skillflow.com';
  const plainPassword = 'Admin@123';

  // Check if admin already exists
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`⚠️  Admin already exists: ${email}`);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await User.create({
    name: 'SkillFlow Admin',
    email,
    password: hashedPassword,
    role: 'admin',
    verificationStatus: 'verified'
  });

  console.log('🎉 Admin user created successfully!');
  console.log(`   Email   : ${email}`);
  console.log(`   Password: ${plainPassword}`);
  process.exit(0);
};

seedAdmin().catch(err => {
  console.error('❌ Error seeding admin:', err.message);
  process.exit(1);
});
