const express = require('express');
const router = express.Router();
const { getTopMentors } = require('../controllers/publicController');

router.get('/mentors', getTopMentors);

module.exports = router;
