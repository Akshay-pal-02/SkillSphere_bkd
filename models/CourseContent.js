const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctAnswer: Number, // index of correct option
  explanation: String,
});

const courseContentSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null }, // null = course-level (finalTest)
  type: { 
    type: String, 
    enum: ['notes', 'assignment', 'quiz', 'finalTest'], 
    required: true 
  },
  // For notes and assignments (markdown / rich text)
  body: { type: String, default: '' },
  // For quiz and finalTest
  questions: [questionSchema],
  generatedByAI: { type: Boolean, default: false },
}, { timestamps: true });

// One content document per (course, section, type) combination
courseContentSchema.index({ courseId: 1, sectionId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('CourseContent', courseContentSchema);
