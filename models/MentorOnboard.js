const mongoose = require('mongoose');

const mentorOnboardSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true
  },
  linkedinUrl: { type: String, default: '' },
  portfolioUrl: { type: String, default: '' },
  experienceYears: { type: Number, default: 0 },
  expertise: [{ type: String }],
  contentType: { type: String, default: 'video' },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
}, { timestamps: true });

module.exports = mongoose.model('MentorOnboard', mentorOnboardSchema, 'mentorOnboard');
