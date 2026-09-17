import prisma from '../services/prisma.js';

export async function verifySkillWithExternalSource(req, res) {
  try {
    const { userId, skillId, source, documentData } = req.body;

    if (!userId || !skillId || !source) {
      return res.status(400).json({ error: 'Missing required fields: userId, skillId, source' });
    }

    // 1. Verify that the skill exists and belongs to the user
    const skill = await prisma.skill.findFirst({
      where: { id: skillId, userId: userId },
      include: { progress: true }
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found for this user.' });
    }

    if (skill.verified) {
      return res.status(400).json({ message: 'This skill is already verified.' });
    }

    // 2. Log the external verification payload in DataSourceLog
    const logEntry = await prisma.dataSourceLog.create({
      data: {
        source: source.toUpperCase(), // e.g., "DIGILOCKER", "UNIVERSITY_PORTAL"
        payload: JSON.stringify(documentData || { verifiedAt: new Date() })
      }
    });

    // 3. Update the skill to verified = true and link the log ID
    const updatedSkill = await prisma.skill.update({
      where: { id: skillId },
      data: {
        verified: true,
        sourceDocId: logEntry.id
      }
    });

    // 4. Boost user skill progress (Award major XP for authentic verification, e.g., +100 XP)
    let progressUpdate;
    if (skill.progress.length > 0) {
      const currentProgress = skill.progress[0];
      const newXp = currentProgress.xp + 100;
      const newLevel = Math.floor(newXp / 150) + 1; // Level up every 150 XP

      progressUpdate = await prisma.userSkillProgress.update({
        where: { id: currentProgress.id },
        data: { xp: newXp, level: newLevel }
      });
    }

    return res.status(200).json({
      message: 'Skill successfully verified via authentic source!',
      skill: updatedSkill,
      progress: progressUpdate,
      auditLogId: logEntry.id
    });

  } catch (error) {
    console.error('Verification error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}