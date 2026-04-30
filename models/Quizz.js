const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctAnswer: Number, // index of correct option
  explanation: String,
});

const quizzSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  title: { type: String, default: 'Quiz' },
  type: { type: String, default: 'quiz' },
  questions: [questionSchema],
  generatedByAI: { type: Boolean, default: false },
}, { timestamps: true });

// Ensure one quiz per section
quizzSchema.index({ courseId: 1, sectionId: 1 }, { unique: true });

module.exports = mongoose.model('Quizz', quizzSchema, 'Quizz');
