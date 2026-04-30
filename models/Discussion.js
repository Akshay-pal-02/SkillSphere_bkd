const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
}, { timestamps: true });

const discussionSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  body:     { type: String, required: true },
  author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, default: 'General' },
  tags:     [{ type: String }],
  replies:  [replySchema],
  views:    { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Discussion', discussionSchema);
