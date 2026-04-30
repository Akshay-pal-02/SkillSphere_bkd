const express = require('express');
const router = express.Router();
const {
  getDiscussions,
  getDiscussion,
  createDiscussion,
  addReply,
  deleteDiscussion,
} = require('../controllers/forumController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // all forum routes require login

router.route('/')
  .get(getDiscussions)
  .post(createDiscussion);

router.route('/:id')
  .get(getDiscussion)
  .delete(deleteDiscussion);

router.post('/:id/replies', addReply);

module.exports = router;
