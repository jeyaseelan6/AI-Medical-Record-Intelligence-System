import express from 'express';
import { getPatientTimeline } from '../controllers/timeline.controller.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/:patientId', getPatientTimeline);

export default router;
