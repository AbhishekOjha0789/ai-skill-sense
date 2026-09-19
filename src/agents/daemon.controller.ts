import prisma from '../services/prisma.js';
import { QuestService } from './quest.service.js';

// Simple in-memory tracker for the last audit time (resets if Render spins down, which is fine)
let lastGlobalAuditTime = 0;
const AUDIT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 Hours cooldown

export class DaemonController {
  public static async handleUserRegistrationOnboarding(userId: string) {
    console.log(`[Onboarding] Initializing immediate discovery quest for new user: ${userId}`);
    try {
      const result = await QuestService.evaluateAndMintQuest(
        userId, 
        'Welcome! Complete your first basic activity to initialize your skill matrix.', 
        'TECHNICAL'
      );
      return result;
    } catch (error: any) {
      console.error('[Onboarding Error]:', error.message);
    }
  }

  public static async handleProactiveAuditWebhook(req: any, res: any) {
    const authHeader = req.headers['x-daemon-secret'];
    if (authHeader !== process.env.DAEMON_SECRET_KEY) {
      return res.status(401).json({ error: 'Unauthorized daemon trigger.' });
    }

    const now = Date.now();
    // Check if the 6-hour cooldown has passed since the last full audit
    if (now - lastGlobalAuditTime < AUDIT_COOLDOWN_MS) {
      console.log('⏰ [Daemon Webhook] Ping received, but audit skipped due to cooldown window.');
      return res.status(200).json({ 
        status: 'SKIPPED_COOLDOWN', 
        message: 'Server kept alive. Audit skipped to respect rate limits.' 
      });
    }

    // Update last audit timestamp
    lastGlobalAuditTime = now;
    console.log('⏰ [Daemon Webhook] Proactive audit triggered via external ping...');

    try {
      const users = await prisma.user.findMany({
        include: { 
          skills: { include: { progress: true } },
          quests: { where: { status: 'PENDING' } }
        }
      });

      let interventionCount = 0;

      for (const user of users) {
        const allAttributes = ['COGNITIVE', 'PHYSICAL', 'EMOTIONAL', 'TECHNICAL', 'CREATIVE', 'FINANCIAL'];
        const attributeTotals = allAttributes.map(attr => {
          const skills = user.skills.filter(s => s.attribute === attr);
          let xp = 0;
          skills.forEach(s => s.progress.forEach(p => xp += p.xp));
          return { attr, xp };
        });

        const weakestPillar = attributeTotals.reduce((min, curr) => curr.xp < min.xp ? curr : min, attributeTotals[0]);

        if (weakestPillar.xp < 50) {
          const result = await QuestService.evaluateAndMintQuest(
            user.id, 
            `Autonomous background check detected stagnation in your ${weakestPillar.attr} axis.`,
            weakestPillar.attr
          );

          if (result.status === 'QUEST_MINTED') {
            interventionCount++;
          }
        }
      }

      return res.status(200).json({
        status: 'SUCCESS',
        message: `Proactive audit completed. Minted ${interventionCount} balancing quests.`,
        auditedUsers: users.length
      });

    } catch (error: any) {
      console.error('[Daemon Webhook Error]:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}