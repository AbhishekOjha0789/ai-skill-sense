import express from 'express';
import { CommanderEngine } from '../agents/commander.engine.js';
import prisma from '../services/prisma.js';

const router = express.Router();

/**
 * Helper to fetch the primary user for automated webhooks 
 * (or extract from a service-specific API token header if preferred).
 */
async function getDefaultUser() {
  return await prisma.user.findFirst();
}

/**
 * 1. GITHUB WEBHOOK (Screen / Code Architecture)
 * Listens to push, pull request, and issue events.
 */
router.post('/github/:secretToken', async (req, res) => {
  try {
    const { secretToken } = req.params;
    const event = req.headers['x-github-event'];
    const payload = req.body;

    // 1. Authenticate user via the unique secret token in the URL path
    const user = await prisma.user.findFirst({
      where: { webhookSecret: secretToken }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid or unauthorized webhook token.' });
    }

    const engine = new CommanderEngine(user.id);

    // 2. Handle push events
    if (event === 'push') {
      const repo = payload.repository?.name || 'repository';
      const commitMsg = payload.head_commit?.message || 'Code commit update';
      
      const result = await engine.runPassiveIngestion({
        title: `GitHub Commit: ${repo}`,
        description: commitMsg,
        sourceType: 'GITHUB_COMMIT',
        complexity: 'COMPLEX'
      });

      console.log(`[Webhook] Successfully ingested GitHub push for user: ${user.name}`);
      return res.status(200).json({ status: 'SUCCESS', result });
    }

    return res.status(200).json({ message: `Ignored GitHub event: ${event}` });
  } catch (error) {
    console.error('[GitHub Webhook Error]:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 2. FITNESS & HEALTH WEBHOOK (Ground / Physical Pillar)
 * Integrates with services like Apple Health, Google Fit, Strava, or smartwatches.
 */
router.post('/fitness', async (req, res) => {
  try {
    const { activityType, durationMinutes, distanceKm, caloriesBurned, description } = req.body;
    const user = await getDefaultUser();
    if (!user) return res.status(400).json({ error: 'User context missing.' });

    const engine = new CommanderEngine(user.id);
    const result = await engine.runPassiveIngestion({
      title: `Physical Activity: ${activityType || 'Workout'} (${durationMinutes || 0} mins)`,
      description: description || `Completed workout covering ${distanceKm || 0}km, burning ${caloriesBurned || 0} kcal.`,
      sourceType: 'FITNESS_TRACKER',
      complexity: 'MODERATE'
    });

    return res.status(200).json({ status: 'SUCCESS', result });
  } catch (error) {
    console.error('[Fitness Webhook Error]:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 3. MINDFULNESS, JOURNALING & HEART API (Heart / Emotional Pillar)
 * Integrates with meditation apps, journaling tools, or emotional check-in webhooks.
 */
router.post('/heart', async (req, res) => {
  try {
    const { sessionType, durationMinutes, reflectionNotes, emotionalTone } = req.body;
    const user = await getDefaultUser();
    if (!user) return res.status(400).json({ error: 'User context missing.' });

    const engine = new CommanderEngine(user.id);
    const result = await engine.runPassiveIngestion({
      title: `Mindfulness Session: ${sessionType || 'Meditation'}`,
      description: reflectionNotes || `Completed a ${durationMinutes || 10}-minute mindfulness session. Tone: ${emotionalTone || 'Balanced'}.`,
      sourceType: 'HEART_METRICS',
      complexity: 'SIMPLE'
    });

    return res.status(200).json({ status: 'SUCCESS', result });
  } catch (error) {
    console.error('[Heart Webhook Error]:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 4. PRODUCTIVITY & TASK TRACKER WEBHOOK (Cognitive / Professional Pillar)
 * Integrates with Notion, Todoist, Jira, or calendar completion hooks.
 */
router.post('/productivity', async (req, res) => {
  try {
    const { taskTitle, projectCategory, completionNotes } = req.body;
    const user = await getDefaultUser();
    if (!user) return res.status(400).json({ error: 'User context missing.' });

    const engine = new CommanderEngine(user.id);
    const result = await engine.runPassiveIngestion({
      title: `Task Completed: ${taskTitle || 'Milestone Reached'}`,
      description: completionNotes || `Finished core objective in project category: ${projectCategory || 'General'}`,
      sourceType: 'PRODUCTIVITY_TOOL',
      complexity: 'MODERATE'
    });

    return res.status(200).json({ status: 'SUCCESS', result });
  } catch (error) {
    console.error('[Productivity Webhook Error]:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

export default router;