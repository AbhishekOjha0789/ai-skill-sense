import express from 'express';
import { generateAndAssignQuest, completeQuest } from '../controllers/questController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/generate', verifyToken, (req, res, next) => {
  req.body.userId = req.user.userId;
  next();
}, generateAndAssignQuest);

router.post('/complete', verifyToken, (req, res, next) => {
  req.body.userId = req.user.userId;
  next();
}, completeQuest);

export default router;