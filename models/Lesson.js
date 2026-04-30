const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  title: { type: String, required: true },
  videoUrl: { type: String, default: '' },
  content: { type: String, default: '' }, // text/markdown description
  order: { type: Number, default: 0 },
  duration: { type: Number, default: 0 }, // in minutes
}, { timestamps: true });

module.exports = mongoose.model('Lesson', lessonSchema);
