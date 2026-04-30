const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  fileUrl: { type: String, required: true },       // Cloudinary CDN URL
  filePublicId: { type: String, default: '' },     // Cloudinary public_id
  status: { type: String, enum: ['pending', 'submitted', 'graded'], default: 'submitted' },
  grade: { type: String, default: null },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Prevent a student from submitting the same assignment multiple times unless retaking
assignmentSubmissionSchema.index({ studentId: 1, assignmentId: 1 }, { unique: true });

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
