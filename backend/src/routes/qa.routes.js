import express from 'express';
import { askQuestion } from '../controllers/qa.controller.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', askQuestion);

export default router;
