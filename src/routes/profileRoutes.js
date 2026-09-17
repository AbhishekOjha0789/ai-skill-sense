import express from 'express';
import crypto from 'crypto';
import prisma from '../services/prisma.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/matrix', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { include: { progress: true } },
        quests: { include: { quest: true } }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Compute matrix levels & XP per attribute
    const attributes = ['COGNITIVE', 'PHYSICAL', 'EMOTIONAL', 'TECHNICAL', 'CREATIVE', 'FINANCIAL'];
    const attributeMatrix = {};

    attributes.forEach(attr => {
      const attrSkills = user.skills.filter(s => s.attribute === attr);
      
      // Sum up actual XP from progress records (with fallback to static value if no progress exists)
      let totalXp = 0;
      attrSkills.forEach(s => {
        if (s.progress && s.progress.length > 0) {
          s.progress.forEach(p => {
            totalXp += p.xp || 0;
          });
        } else {
          totalXp += s.verified ? 50 : 10;
        }
      });

      const level = Math.floor(totalXp / 150) + 1;

      attributeMatrix[attr] = {
        totalXp,
        level,
        totalSkills: attrSkills.length,
        verifiedSkills: attrSkills.filter(s => s.verified).length,
        skills: attrSkills
      };
    });

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        overallXp: Object.values(attributeMatrix).reduce((sum, m) => sum + m.totalXp, 0)
      },
      attributeMatrix,
      quests: user.quests
    });
  } catch (error) {
    console.error('Failed to fetch user matrix:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/webhook-bridge', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        let user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Generate a webhook secret token if one doesn't exist yet
        if (!user.webhookSecret) {
            const secretToken = crypto.randomBytes(24).toString('hex');
            user = await prisma.user.update({
                where: { id: userId },
                data: { webhookSecret: secretToken }
            });
        }

        const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhooks/github/${user.webhookSecret}`;
        return res.status(200).json({ webhookUrl });
    } catch (error) {
        console.error('Webhook bridge error:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

export default router;