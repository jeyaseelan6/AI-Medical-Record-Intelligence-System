import express from 'express';
import { uploadDocument, getDocuments } from '../controllers/document.controller.js';
import requireAuth from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

// Apply auth restriction to all document actions
router.use(requireAuth);

// Handles multipart form uploading (expecting field name 'file')
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/:patientId', getDocuments);

export default router;
