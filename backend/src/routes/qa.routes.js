import express from 'express';
import { askQuestion, getChatHistory } from '../controllers/qa.controller.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', askQuestion);
router.get('/history/:patientId', getChatHistory);

export default router;
