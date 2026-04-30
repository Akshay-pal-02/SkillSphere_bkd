const User = require('../models/User');
const Course = require('../models/Course');
const CourseContent = require('../models/CourseContent');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// @desc    Generate course content using AI
// @route   POST /api/ai/generate
// @access  Private (Paid Mentor only)
const generateContent = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Gate: only paid plan mentors can use AI generation
    if (user.mentorPlan !== 'paid') {
      return res.status(403).json({ 
        message: 'AI generation is a Pro Plan feature. Please upgrade to unlock.' 
      });
    }

    const { courseId, type, context } = req.body;
    // `context` = { courseTitle, courseDescription, sectionTitles[], currentSectionTitle }

    let systemPrompt = "";
    let userPrompt = `Course Title: ${context.courseTitle || 'Untitled Course'}\nCourse Description: ${context.courseDescription || 'No description provided'}\nAll Sections: ${context.sectionTitles?.join(', ') || 'None'}\n`;

    if (type === 'notes') {
      systemPrompt = "You are an expert educator. Your task is to generate comprehensive markdown notes for a specific course section. Return the result as a JSON object with a single key 'body' containing the markdown text. Keep the formatting clean and professional.";
      userPrompt += `\nGenerate detailed notes for the section: "${context.currentSectionTitle}". Provide definitions, explanations, and examples if possible.`;
    } else if (type === 'assignment') {
      systemPrompt = "You are an expert educator. Your task is to generate a comprehensive markdown assignment for a specific course section. Return the result as a JSON object with a single key 'body' containing the markdown text.";
      userPrompt += `\nGenerate an assignment for the section: "${context.currentSectionTitle}". Detail the objective, instructions, and tasks. Include constraints or grading criteria if appropriate.`;
    } else if (type === 'quiz') {
      systemPrompt = `You are an expert educator. Your task is to generate a 5-10 question multiple-choice quiz for a specific course section. 
Return the result as a JSON object with a key 'questions', which is an array of objects. 
Each object must have: 
- 'question' (string)
- 'options' (array of exactly 4 strings)
- 'correctAnswer' (integer, 0-3 representing the zero-indexed index of the correct option)
- 'explanation' (string explaining why the answer is correct)`;
      userPrompt += `\nGenerate a quiz for the section: "${context.currentSectionTitle}". Ensure questions are challenging but fair based on the title context.`;
    } else if (type === 'finalTest') {
      systemPrompt = `You are an expert educator. Your task is to generate a 10-15 question comprehensive final multiple-choice exam for the entire course.
Return the result as a JSON object with a key 'questions', which is an array of objects. 
Each object must have: 
- 'question' (string)
- 'options' (array of exactly 4 strings)
- 'correctAnswer' (integer, 0-3 representing the zero-indexed index of the correct option)
- 'explanation' (string explaining why the answer is correct)`;
      userPrompt += `\nGenerate a final test covering all sections of the course. Ensure the questions evenly cover the various topics.`;
    } else {
      return res.status(400).json({ message: 'Invalid generation type' });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
    });

    const generatedText = response.choices[0].message.content;
    const generated = JSON.parse(generatedText);

    res.json({ type, generated, generatedByAI: true });
  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ message: error.message || 'AI generation failed' });
  }
};

module.exports = { generateContent };
