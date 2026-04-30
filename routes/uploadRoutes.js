const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { uploadNotes, uploadAssignment, uploadThumbnail } = require('../middleware/upload');
const {
  saveNotes,
  getNotes,
  deleteNote,
  saveAssignment,
  getAssignments,
  deleteAssignment,
} = require('../controllers/uploadController');

// ── Image / Thumbnail Upload ───────────────────────────────────────────────
router.post(
  '/image',
  protect,
  (req, res, next) => {
    uploadThumbnail.single('file')(req, res, (err) => {
      if (err) {
        console.error('Multer/Cloudinary Error:', err);
        return res.status(500).json({ message: err.message || 'Upload failed' });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    res.json({ url: req.file.path, public_id: req.file.filename });
  }
);

// ── Notes ──────────────────────────────────────────────────────────────────
router.post(
  '/notes',
  protect,
  restrictTo('mentor', 'admin'),
  (req, res, next) => {
    uploadNotes.single('file')(req, res, (err) => {
      if (err) {
        console.error('Multer/Cloudinary Error:', err);
        return res.status(500).json({ message: err.message || 'Upload failed' });
      }
      next();
    });
  },
  saveNotes
);
router.get('/notes/:courseId', protect, getNotes);
router.delete('/notes/:id', protect, restrictTo('mentor', 'admin'), deleteNote);

// ── Assignment (mentor uploads) ────────────────────────────────────────────
router.post(
  '/assignment',
  protect,
  restrictTo('mentor', 'admin'),
  (req, res, next) => {
    uploadAssignment.single('file')(req, res, (err) => {
      if (err) {
        console.error('Multer/Cloudinary Error:', err);
        return res.status(500).json({ message: err.message || 'Upload failed' });
      }
      next();
    });
  },
  saveAssignment
);
router.get('/assignment/:courseId', protect, getAssignments);
router.delete('/assignment/:id', protect, restrictTo('mentor', 'admin'), deleteAssignment);

module.exports = router;
