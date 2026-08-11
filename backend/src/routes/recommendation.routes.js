import express from 'express';
import { 
  getRecommendationContext, 
  searchRecommendedProviders, 
  getRecommendationHistory 
} from '../controllers/recommendation.controller.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = express.Router();

// Enforce JWT authentication on all recommendation endpoints
router.use(requireAuth);

// 1. Prepare clinical finding context & AI care reasoning
router.post('/context', getRecommendationContext);

// 2. Search and rank real healthcare providers near a location
router.post('/search', searchRecommendedProviders);

// 3. Retrieve patient recommendation history
router.get('/history/:patientId', getRecommendationHistory);

export default router;
