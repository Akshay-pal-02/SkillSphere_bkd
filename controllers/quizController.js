const Quizz = require('../models/Quizz');

// @desc    Create or update a quiz
// @route   POST /api/quiz
// @access  Private (Mentor)
const saveQuiz = async (req, res) => {
  try {
    const { courseId, sectionId, title, questions, generatedByAI } = req.body;

    if (!courseId || !sectionId) {
      return res.status(400).json({ message: 'courseId and sectionId are required' });
    }

    const { isValid } = require('mongoose').Types.ObjectId;
    if (!isValid(sectionId)) {
      return res.status(400).json({ message: 'Invalid section ID format. Must be a 24-character hex string.' });
    }

    let quiz;
    try {
      // Primary approach: upsert by courseId + sectionId
      quiz = await Quizz.findOneAndUpdate(
        { courseId, sectionId },
        { title: title || 'Quiz', questions: questions || [], generatedByAI: generatedByAI || false },
        { upsert: true, new: true, runValidators: true }
      );
    } catch (upsertErr) {
      // If there's a duplicate key error (stale index), try a manual find + update
      if (upsertErr.code === 11000) {
        console.warn('Quiz upsert hit duplicate key — falling back to manual update. Run: node scripts/fixQuizIndex.js');
        quiz = await Quizz.findOne({ courseId, sectionId });
        if (quiz) {
          quiz.title = title || 'Quiz';
          quiz.questions = questions || [];
          quiz.generatedByAI = generatedByAI || false;
          await quiz.save();
        } else {
          // Try to find by courseId only and update
          quiz = await Quizz.findOne({ courseId });
          if (quiz) {
            quiz.sectionId = sectionId;
            quiz.title = title || 'Quiz';
            quiz.questions = questions || [];
            quiz.generatedByAI = generatedByAI || false;
            await quiz.save();
          } else {
            return res.status(500).json({ 
              message: 'Quiz save failed due to a stale database index. Please run: node scripts/fixQuizIndex.js in your backend folder, then restart the server.' 
            });
          }
        }
      } else {
        throw upsertErr;
      }
    }

    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all quizzes for a course
// @route   GET /api/quiz/:courseId
// @access  Private (Student/Mentor)
const getQuizzesByCourse = async (req, res) => {
  try {
    const quizzes = await Quizz.find({ courseId: req.params.courseId });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get quiz for a section
// @route   GET /api/quiz/section/:sectionId
// @access  Private
const getQuizBySection = async (req, res) => {
  try {
    const quiz = await Quizz.findOne({ sectionId: req.params.sectionId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { saveQuiz, getQuizzesByCourse, getQuizBySection };
