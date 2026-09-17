import express from 'express';
import { CommanderEngine } from '../agents/commander.engine.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * 1. ACTIVE MESH ROUTE: Runs the full multi-agent tool-calling loop 
 * (Ingest -> Guard -> Progression -> Quest Architect).
 */
router.post('/run-mesh', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rawActivityStream = req.body; 

    const engine = new CommanderEngine(userId);
    const result = await engine.runExecutionLoop(rawActivityStream);

    return res.status(200).json({
      message: 'Commander Agent Mesh executed successfully!',
      result
    });
  } catch (error) {
    console.error('Agent mesh endpoint error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 2. PASSIVE INGESTION ROUTE: Fast ingestion only.
 */
router.post('/ingest', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const engine = new CommanderEngine(userId);
    const result = await engine.runPassiveIngestion(req.body);
    return res.status(200).json({ message: 'Passive ingestion complete', result });
  } catch (error) {
    console.error('Ingest route error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 3. ACTIVE EVALUATION ROUTE: Evaluates pending telemetry, runs AI Semantic Guard, 
 * calculates XP progression, and architectures growth quests.
 */
router.post('/evaluate', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { activityId } = req.body;

    const engine = new CommanderEngine(userId);
    const result = await engine.evaluateActiveMesh(activityId);

    return res.status(200).json({
      message: 'Active mesh evaluation completed successfully!',
      result
    });
  } catch (error) {
    console.error('Evaluate route error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

export default router;