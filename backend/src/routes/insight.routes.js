import express from 'express';
import { getPatientInsights, getPatientForecast } from '../controllers/insight.controller.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/forecast/:patientId', getPatientForecast);
router.get('/:patientId', getPatientInsights);

export default router;
