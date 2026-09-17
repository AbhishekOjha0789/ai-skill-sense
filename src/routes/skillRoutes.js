import express from 'express';
import { submitSkill } from '../controllers/skillController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/submit', verifyToken, (req, res, next) => {
  // Inject authenticated userId from token into req.body
  req.body.userId = req.user.userId;
  next();
}, submitSkill);

export default router;