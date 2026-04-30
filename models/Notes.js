const mongoose = require('mongoose');

const notesSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null },
  title: { type: String, required: true },
  body: { type: String, default: '' }, // markdown / text
  fileUrl: { type: String, default: '' },        // Cloudinary CDN URL
  filePublicId: { type: String, default: '' },   // Cloudinary public_id (for delete/update)
  fileName: { type: String, default: '' },
  fileType: { type: String, default: '' },        // pdf, docx, etc.
  generatedByAI: { type: Boolean, default: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Notes', notesSchema, 'notes');
