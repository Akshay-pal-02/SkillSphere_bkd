const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String },
  description: { type: String, required: true },
  learningOutcomes: [{ type: String }],
  requirements: [{ type: String }],
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  price: { type: Number, default: 0 },
  type: { type: String, enum: ['free', 'paid'], default: 'free' },
  category: { type: String },
  thumbnail: { type: String },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'], default: 'Beginner' },
  language: { type: String, default: 'English' },
  duration: { type: String, default: '0h' },
  totalLessons: { type: Number, default: 0 },
  rating: { type: Number, default: 4.8 },
  numRatings: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
