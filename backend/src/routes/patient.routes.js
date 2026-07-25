import express from 'express';
import { createPatient, getPatients, getPatientById } from '../controllers/patient.controller.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication check to all patient operations
router.use(requireAuth);

router.post('/', createPatient);
router.get('/', getPatients);
router.get('/:id', getPatientById);

export default router;
