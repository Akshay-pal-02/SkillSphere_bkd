const Notes = require('../models/Notes');
const Assignment = require('../models/Assignment');
const cloudinary = require('../config/cloudinary');

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract Cloudinary file metadata from a multer-storage-cloudinary req.file object.
 * After upload, req.file contains: path (secure URL), filename (public_id), mimetype, originalname, size
 */
const extractCloudinaryMeta = (file) => ({
  fileUrl:       file.path,       // full Cloudinary HTTPS URL
  filePublicId:  file.filename,   // public_id – needed for delete/update
  fileName:      file.originalname,
  fileType:      file.mimetype,
});

// ── NOTES ──────────────────────────────────────────────────────────────────

// @desc    Save/upload Notes for a course section
// @route   POST /api/upload/notes
// @access  Private (Mentor)
const saveNotes = async (req, res) => {
  try {
    const { courseId, sectionId, lessonId, title, body, generatedByAI } = req.body;

    if (!courseId || !title) {
      return res.status(400).json({ message: 'courseId and title are required.' });
    }

    const { isValid } = require('mongoose').Types.ObjectId;
    if (sectionId && !isValid(sectionId)) {
      return res.status(400).json({ message: 'Invalid section ID format. Must be a 24-character hex string.' });
    }
    if (lessonId && !isValid(lessonId)) {
      return res.status(400).json({ message: 'Invalid lesson ID format.' });
    }

    const payload = {
      courseId,
      sectionId:     sectionId || null,
      lessonId:      lessonId  || null,
      title,
      body:          body || '',
      generatedByAI: generatedByAI === 'true' || generatedByAI === true,
      uploadedBy:    req.user._id,
    };

    // If a file was uploaded to Cloudinary, attach its metadata
    if (req.file) {
      Object.assign(payload, extractCloudinaryMeta(req.file));
    }

    const notes = await Notes.create(payload);
    res.status(201).json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all notes for a course
// @route   GET /api/upload/notes/:courseId
// @access  Private
const getNotes = async (req, res) => {
  try {
    const notes = await Notes.find({ courseId: req.params.courseId })
      .sort({ createdAt: -1 })
      .populate('sectionId', 'title');
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a note and its Cloudinary file
// @route   DELETE /api/upload/notes/:id
// @access  Private (Mentor)
const deleteNote = async (req, res) => {
  try {
    const note = await Notes.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Delete from Cloudinary if public_id is stored
    if (note.filePublicId) {
      await cloudinary.uploader.destroy(note.filePublicId, { resource_type: 'raw' });
    }

    await note.deleteOne();
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── ASSIGNMENTS ────────────────────────────────────────────────────────────

// @desc    Save/upload Assignment for a course section
// @route   POST /api/upload/assignment
// @access  Private (Mentor)
const saveAssignment = async (req, res) => {
  try {
    const { courseId, sectionId, title, body, deadline, maxMarks, generatedByAI } = req.body;

    if (!courseId || !title) {
      return res.status(400).json({ message: 'courseId and title are required.' });
    }

    const { isValid } = require('mongoose').Types.ObjectId;
    if (sectionId && !isValid(sectionId)) {
      return res.status(400).json({ message: 'Invalid section ID format. Must be a 24-character hex string.' });
    }

    const payload = {
      courseId,
      sectionId:     sectionId || null,
      title,
      body:          body || '',
      deadline:      deadline  || null,
      maxMarks:      Number(maxMarks) || 100,
      generatedByAI: generatedByAI === 'true' || generatedByAI === true,
      uploadedBy:    req.user._id,
    };

    if (req.file) {
      Object.assign(payload, extractCloudinaryMeta(req.file));
    }

    const assignment = await Assignment.create(payload);
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all assignments for a course
// @route   GET /api/upload/assignment/:courseId
// @access  Private
const getAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find({ courseId: req.params.courseId })
      .sort({ createdAt: -1 })
      .populate('sectionId', 'title');
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an assignment and its Cloudinary file
// @route   DELETE /api/upload/assignment/:id
// @access  Private (Mentor)
const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    if (assignment.filePublicId) {
      await cloudinary.uploader.destroy(assignment.filePublicId, { resource_type: 'raw' });
    }

    await assignment.deleteOne();
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { saveNotes, getNotes, deleteNote, saveAssignment, getAssignments, deleteAssignment };
