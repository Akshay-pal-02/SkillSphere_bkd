const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'mentor', 'admin'], default: 'student' },
  avatar: { type: String, default: '' },
  verificationStatus: { type: String, enum: ['unverified', 'pending', 'verified'], default: 'unverified' },
  mentorPlan: { type: String, enum: ['none', 'free', 'paid'], default: 'none' },
  mentorDetails: {
    bio: { type: String, default: '' },
    portfolioUrl: String,
    linkedinUrl: String,
    experienceYears: Number,
    expertise: [String],
    contentType: String,
    rating: { type: Number, default: 4.8 },
    numRatings: { type: Number, default: 0 },
    totalStudents: { type: Number, default: 0 },
  }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
