const Discussion = require('../models/Discussion');

// @desc    Get all discussions (with optional search/category filter)
// @route   GET /api/forums
// @access  Private
const getDiscussions = async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    const filter = {};
    if (category && category !== 'All') filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { body:  { $regex: search, $options: 'i' } },
      ];
    }
    const sortOrder = sort === 'popular' ? { views: -1 } : { createdAt: -1 };

    const discussions = await Discussion.find(filter)
      .populate('author', 'name avatar role')
      .sort(sortOrder)
      .lean();

    // Attach reply count for convenience
    const result = discussions.map(d => ({
      ...d,
      replyCount: d.replies.length,
      replies: undefined, // don't send full replies on list view
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single discussion with all replies
// @route   GET /api/forums/:id
// @access  Private
const getDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('author', 'name avatar role')
      .populate('replies.author', 'name avatar role');

    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });
    res.json(discussion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new discussion
// @route   POST /api/forums
// @access  Private
const createDiscussion = async (req, res) => {
  try {
    const { title, body, category, tags } = req.body;
    if (!title || !body) return res.status(400).json({ message: 'Title and body are required' });

    const discussion = await Discussion.create({
      title,
      body,
      category: category || 'General',
      tags: tags || [],
      author: req.user._id,
    });

    const populated = await discussion.populate('author', 'name avatar role');
    res.status(201).json({ ...populated.toObject(), replyCount: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Post a reply to a discussion
// @route   POST /api/forums/:id/replies
// @access  Private
const addReply = async (req, res) => {
  try {
    const { body } = req.body;
    if (!body) return res.status(400).json({ message: 'Reply body is required' });

    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });

    discussion.replies.push({ author: req.user._id, body });
    await discussion.save();

    await discussion.populate('replies.author', 'name avatar role');
    const newReply = discussion.replies[discussion.replies.length - 1];

    res.status(201).json(newReply);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a discussion (author or admin only)
// @route   DELETE /api/forums/:id
// @access  Private
const deleteDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });

    const isOwner = discussion.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

    await Discussion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Discussion deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDiscussions, getDiscussion, createDiscussion, addReply, deleteDiscussion };
