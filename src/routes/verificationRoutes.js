import express from 'express';
import { verifySkillWithExternalSource } from '../controllers/verificationController.js';

const router = express.Router();

router.post('/verify-skill', verifySkillWithExternalSource);

export default router;