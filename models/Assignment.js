const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
  title: { type: String, required: true },
  body: { type: String, default: '' }, // instructions / description
  fileUrl: { type: String, default: '' },       // Cloudinary CDN URL
  filePublicId: { type: String, default: '' },  // Cloudinary public_id (for delete/update)
  fileName: { type: String, default: '' },
  fileType: { type: String, default: '' },       // pdf, docx, etc.
  deadline: { type: Date, default: null },
  maxMarks: { type: Number, default: 100 },
  generatedByAI: { type: Boolean, default: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema, 'assignment');
