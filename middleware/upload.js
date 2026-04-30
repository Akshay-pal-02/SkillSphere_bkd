const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// ── Allowed MIME types ─────────────────────────────────────────────────────
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type not allowed. Allowed types: JPEG, PNG, WebP, GIF, PDF, DOC, DOCX, PPT, PPTX, TXT`
      ),
      false
    );
  }
};

// ── Generic Cloudinary storage (auto detects image vs raw) ─────────────────
const buildStorage = (folder, resourceType = 'auto') =>
  new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const isRaw = resourceType === 'raw' || file.mimetype === 'application/pdf' || file.mimetype.includes('document');
      const baseName = file.originalname.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
      // For raw files, Cloudinary requires the extension in the public_id to serve it correctly
      const ext = file.originalname.split('.').pop();
      const publicId = isRaw ? `${Date.now()}-${baseName}.${ext}` : `${Date.now()}-${baseName}`;
      
      return {
        folder: `lms/${folder}`,
        resource_type: resourceType,
        public_id: publicId,
      };
    },
  });

// ── Named uploader instances ───────────────────────────────────────────────

/** Avatar / profile pictures – images only */
const uploadAvatar = multer({
  storage: buildStorage('avatars', 'image'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/** Course thumbnails – images only */
const uploadThumbnail = multer({
  storage: buildStorage('thumbnails', 'image'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/** Notes / course PDFs – raw (PDF, DOC …) */
const uploadNotes = multer({
  storage: buildStorage('notes', 'raw'),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

/** Assignment files (mentor uploads) – raw */
const uploadAssignment = multer({
  storage: buildStorage('assignments', 'raw'),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

/** Student submission files – raw */
const uploadSubmission = multer({
  storage: buildStorage('submissions', 'raw'),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

/** General-purpose uploader (fallback) */
const upload = multer({
  storage: buildStorage('general', 'auto'),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = {
  upload,
  uploadAvatar,
  uploadThumbnail,
  uploadNotes,
  uploadAssignment,
  uploadSubmission,
};
