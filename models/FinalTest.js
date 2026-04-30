const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctAnswer: Number, // index of correct option
  explanation: String,
});

const finalTestSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, default: 'Final Test' },
  questions: [questionSchema],
  generatedByAI: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('FinalTest', finalTestSchema, 'finalTest');
