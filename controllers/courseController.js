const Course = require('../models/Course');
const Section = require('../models/Section');
const Lesson = require('../models/Lesson');
const CourseContent = require('../models/CourseContent');
const Enrollment = require('../models/Enrollment');
const Review = require('../models/Review');
const Notes = require('../models/Notes');
const Assignment = require('../models/Assignment');
const Quizz = require('../models/Quizz');
const FinalTest = require('../models/FinalTest');

// @desc    Get all published courses (public catalog)
// @route   GET /api/courses
// @access  Public (optional auth for enrollment check)
const getAllPublishedCourses = async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = { status: 'published' };
    if (category) filter.category = category;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];

    const courses = await Course.find(filter)
      .populate('mentorId', 'name')
      .sort({ createdAt: -1 });

    // If user is logged in, attach enrollment status
    let enrolledCourseIds = new Set();
    if (req.user) {
      const enrollments = await Enrollment.find({ studentId: req.user._id });
      enrolledCourseIds = new Set(enrollments.map(e => e.courseId.toString()));
    }

    const coursesWithStatus = courses.map(c => ({
      ...c.toObject(),
      isEnrolled: enrolledCourseIds.has(c._id.toString())
    }));

    res.json(coursesWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new course (Step 1)
// @route   POST /api/courses
// @access  Private (Mentor)
const createCourse = async (req, res) => {
  try {
    const { 
      title, subtitle, description, price, category, thumbnail, type,
      learningOutcomes, requirements, level, language, duration 
    } = req.body;
    
    const course = await Course.create({
      title,
      subtitle,
      description,
      price: price || 0,
      category,
      thumbnail,
      type: type || 'paid',
      mentorId: req.user._id,
      status: 'draft',
      learningOutcomes,
      requirements,
      level: level || 'Beginner',
      language: language || 'English',
      duration: duration || '0h'
    });
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private (Mentor)
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, mentorId: req.user._id },
      { $set: req.body },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Course not found or not authorized' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a course and all its dependent content
// @route   DELETE /api/courses/:id
// @access  Private (Mentor)
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, mentorId: req.user._id });
    if (!course) return res.status(404).json({ message: 'Course not found or not authorized' });

    // Cascade delete across related collections
    await Section.deleteMany({ courseId: course._id });
    await Lesson.deleteMany({ courseId: course._id });
    await CourseContent.deleteMany({ courseId: course._id });
    
    // Actually delete the course
    await Course.findByIdAndDelete(course._id);
    
    res.json({ message: 'Course successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single course with all sections and lessons
// @route   GET /api/courses/:id
// @access  Private
const getCourseDetails = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('mentorId', 'name email avatar mentorDetails');
    
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const sections = await Section.find({ courseId: course._id }).sort('order');
    const lessonsRaw = await Lesson.find({ courseId: course._id }).sort('order');

    let totalLessons = 0;
    let totalDuration = 0; // in minutes

    // Group lessons under their sections and calculate totals
    const sectionsWithLessons = sections.map(section => {
      const sectionLessons = lessonsRaw.filter(l => l.sectionId.toString() === section._id.toString());
      totalLessons += sectionLessons.length;
      totalDuration += sectionLessons.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      
      return {
        ...section.toObject(),
        lessons: sectionLessons
      };
    });

    const notes = await Notes.find({ courseId: course._id }).lean();
    const assignments = await Assignment.find({ courseId: course._id }).lean();
    const quizzes = await Quizz.find({ courseId: course._id }).lean();
    const finalTests = await FinalTest.find({ courseId: course._id }).lean();

    const content = [
      ...notes.map(n => ({ ...n, type: 'notes' })),
      ...assignments.map(a => ({ ...a, type: 'assignment' })),
      ...quizzes.map(q => ({ ...q, type: 'quiz' })),
      ...finalTests.map(f => ({ ...f, type: 'finalTest' }))
    ];

    // Format duration for display (e.g., "12h 30m" or "45m")
    const hours = Math.floor(totalDuration / 60);
    const mins = totalDuration % 60;
    const durationDisplay = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    res.json({ 
      course: { ...course.toObject(), totalLessons, totalDuration: durationDisplay }, 
      sections: sectionsWithLessons, 
      content 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a section to a course (Step 2)
// @route   POST /api/courses/:id/sections
// @access  Private (Mentor)
const addSection = async (req, res) => {
  try {
    const { title, order } = req.body;
    const section = await Section.create({ courseId: req.params.id, title, order });
    res.status(201).json(section);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a section title
// @route   PUT /api/courses/:id/sections/:sectionId
// @access  Private (Mentor)
const updateSection = async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(req.params.sectionId, req.body, { new: true });
    res.json(section);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a section and all its lessons
// @route   DELETE /api/courses/:id/sections/:sectionId
// @access  Private (Mentor)
const deleteSection = async (req, res) => {
  try {
    await Lesson.deleteMany({ sectionId: req.params.sectionId });
    await Section.findByIdAndDelete(req.params.sectionId);
    res.json({ message: 'Section and its lessons deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a lesson to a section (Step 2)
// @route   POST /api/courses/:id/sections/:sectionId/lessons
// @access  Private (Mentor)
const addLesson = async (req, res) => {
  try {
    const { title, videoUrl, content, order, duration } = req.body;
    const lesson = await Lesson.create({
      courseId: req.params.id,
      sectionId: req.params.sectionId,
      title, videoUrl, content, order, duration
    });
    res.status(201).json(lesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a lesson
// @route   PUT /api/courses/:id/sections/:sectionId/lessons/:lessonId
// @access  Private (Mentor)
const updateLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(req.params.lessonId, req.body, { new: true });
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a lesson
// @route   DELETE /api/courses/:id/sections/:sectionId/lessons/:lessonId
// @access  Private (Mentor)
const deleteLesson = async (req, res) => {
  try {
    await Lesson.findByIdAndDelete(req.params.lessonId);
    res.json({ message: 'Lesson deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk Update Curriculum (Sections & Lessons) efficiently
// @route   PUT /api/courses/:id/update-full
// @access  Private (Mentor)
const updateCourseCurriculum = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { sections } = req.body;
    
    // Validate course ownership
    const course = await Course.findOne({ _id: courseId, mentorId: req.user._id });
    if (!course) return res.status(404).json({ message: 'Course not found or unauthorized' });

    // 1. Gather valid mongo ObjectIDs from incoming payload to know what to keep
    const mongoose = require('mongoose');
    const incomingSectionIds = [];
    const incomingLessonIds = [];

    sections.forEach(s => {
      if (s._id && mongoose.Types.ObjectId.isValid(s._id)) {
        incomingSectionIds.push(s._id);
      }
      if (s.lessons) {
        s.lessons.forEach(l => {
          if (l._id && mongoose.Types.ObjectId.isValid(l._id)) {
            incomingLessonIds.push(l._id);
          }
        });
      }
    });

    // 2. Delete sections and lessons that were removed by the user in the UI
    await Section.deleteMany({ courseId, _id: { $nin: incomingSectionIds } });
    await Lesson.deleteMany({ courseId, _id: { $nin: incomingLessonIds } });

    // 3. Upsert sequentially
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const secData = sections[sIdx];
      let sectionDoc;
      
      if (secData._id && mongoose.Types.ObjectId.isValid(secData._id)) {
        sectionDoc = await Section.findByIdAndUpdate(
          secData._id, 
          { title: secData.title, order: sIdx }, 
          { new: true }
        );
      } else {
        sectionDoc = await Section.create({ courseId, title: secData.title, order: sIdx });
      }

      if (secData.lessons && sectionDoc) {
        for (let lIdx = 0; lIdx < secData.lessons.length; lIdx++) {
          const lData = secData.lessons[lIdx];
          const lessonPayload = {
            title: lData.title,
            videoUrl: lData.videoUrl,
            content: lData.content,
            duration: Number(lData.duration) || 0,
            order: lIdx,
            sectionId: sectionDoc._id // strictly enforced mapping
          };

          if (lData._id && mongoose.Types.ObjectId.isValid(lData._id)) {
            await Lesson.findByIdAndUpdate(lData._id, lessonPayload);
          } else {
            lessonPayload.courseId = courseId;
            await Lesson.create(lessonPayload);
          }
        }
      }
    }

    // Fetch the updated sections to send to the frontend immediately!
    const updatedSections = await Section.find({ courseId }).sort('order').lean();
    const allLessons = await Lesson.find({ courseId }).sort('order').lean();

    const sectionsWithLessons = updatedSections.map(section => {
      const sectionLessons = allLessons.filter(l => l.sectionId.toString() === section._id.toString());
      return {
        ...section,
        lessons: sectionLessons
      };
    });

    res.json({ message: 'Curriculum successfully synced', sections: sectionsWithLessons });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Save course content (notes / assignment / quiz / finalTest)
// @route   POST /api/courses/:id/content
// @access  Private (Mentor)
const saveCourseContent = async (req, res) => {
  try {
    const { type, body, questions, generatedByAI, sectionId } = req.body;
    const content = await CourseContent.findOneAndUpdate(
      { courseId: req.params.id, type, sectionId: sectionId || null },
      { body, questions, generatedByAI, sectionId: sectionId || null },
      { upsert: true, new: true }
    );
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Publish a course (change status to published)
// @route   PUT /api/courses/:id/publish
// @access  Private (Mentor)
const publishCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, mentorId: req.user._id },
      { status: 'published' },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Course not found or not authorized' });
    res.json({ message: 'Course published!', course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a review to a course
// @route   POST /api/courses/:id/reviews
// @access  Private (Student)
const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const courseId = req.params.id;

    // Check enrollment
    const enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId });
    if (!enrollment) return res.status(403).json({ message: 'Must be enrolled to review' });

    // Ensure it's 1-5
    if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5' });

    // Upsert review
    const review = await Review.findOneAndUpdate(
      { courseId, studentId: req.user._id },
      { rating, comment },
      { new: true, upsert: true }
    ).populate('studentId', 'name avatar');

    // Update course average rating
    const allReviews = await Review.find({ courseId });
    const avgRating = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;
    await Course.findByIdAndUpdate(courseId, { 
      rating: parseFloat(avgRating.toFixed(1)), 
      numRatings: allReviews.length 
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get course reviews
// @route   GET /api/courses/:id/reviews
// @access  Public
const getCourseReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ courseId: req.params.id })
      .populate('studentId', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllPublishedCourses,
  createCourse,
  getCourseDetails,
  addSection,
  updateSection,
  deleteSection,
  addLesson,
  updateLesson,
  deleteLesson,
  saveCourseContent,
  publishCourse,
  updateCourse,
  addReview,
  getCourseReviews,
  deleteCourse,
  updateCourseCurriculum
};
