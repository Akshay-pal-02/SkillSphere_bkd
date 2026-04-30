const FinalTest = require('../models/FinalTest');

// @desc    Create or update a final test
// @route   POST /api/final-test
// @access  Private (Mentor)
const saveFinalTest = async (req, res) => {
  try {
    const { courseId, title, questions, generatedByAI } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required' });
    }

    const finalTest = await FinalTest.findOneAndUpdate(
      { courseId },
      { title, questions, generatedByAI },
      { upsert: true, new: true }
    );

    res.status(201).json(finalTest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get final test for a course
// @route   GET /api/final-test/:courseId
// @access  Private (Student/Mentor)
const getFinalTestByCourse = async (req, res) => {
  try {
    const finalTest = await FinalTest.findOne({ courseId: req.params.courseId });
    if (!finalTest) {
        return res.status(404).json({ message: 'Final test not found' });
    }
    res.json([finalTest]); // Return array to simplify frontend consumption when grouped
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { saveFinalTest, getFinalTestByCourse };
