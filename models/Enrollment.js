const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  progress: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }], // Array of completed lessons
  isCompleted: { type: Boolean, default: false },
  certificateUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
