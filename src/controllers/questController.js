import prisma from '../services/prisma.js';
import { generateAiQuestPrompt } from '../services/questGenerator.js';

const VALID_ATTRIBUTES = ['COGNITIVE', 'PHYSICAL', 'EMOTIONAL', 'TECHNICAL', 'CREATIVE', 'FINANCIAL'];

export async function generateAndAssignQuest(req, res) {
  try {
    const { userId, attribute } = req.body;

    if (!userId || !attribute || !VALID_ATTRIBUTES.includes(attribute)) {
      return res.status(400).json({ error: 'Valid userId and one of the 6 attributes are required.' });
    }

    const questContent = await generateAiQuestPrompt(attribute);

    const newQuest = await prisma.quest.create({
      data: {
        title: questContent.title,
        description: questContent.description,
        attribute: attribute,
        xpReward: 50
      }
    });

    const userQuest = await prisma.userQuest.create({
      data: {
        userId: userId,
        questId: newQuest.id,
        status: 'PENDING'
      }
    });

    await prisma.dataSourceLog.create({
      data: {
        source: 'AI_QUEST_GENERATOR',
        payload: JSON.stringify({ userId, questId: newQuest.id, attribute })
      }
    });

    return res.status(201).json({
      message: 'AI Quest successfully generated and assigned!',
      quest: newQuest,
      userQuestStatus: userQuest
    });

  } catch (error) {
    console.error('Quest generation error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

export async function completeQuest(req, res) {
  try {
    const { userQuestId } = req.body;

    if (!userQuestId) {
      return res.status(400).json({ error: 'Missing userQuestId' });
    }

    // 1. Find the user quest along with its master quest details
    const userQuest = await prisma.userQuest.findUnique({
      where: { id: userQuestId },
      include: { quest: true }
    });

    if (!userQuest) {
      return res.status(404).json({ error: 'User quest not found.' });
    }

    if (userQuest.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Quest is already completed.' });
    }

    // 2. Mark the user quest as COMPLETED
    const updatedUserQuest = await prisma.userQuest.update({
      where: { id: userQuestId },
      data: { status: 'COMPLETED' }
    });

    const attribute = userQuest.quest.attribute;
    const xpReward = userQuest.quest.xpReward;

    // 3. Find or auto-create a skill under this attribute to hold the XP progress
    let targetSkill = await prisma.skill.findFirst({
      where: { 
        userId: userQuest.userId, 
        attribute: attribute 
      },
      include: { progress: true }
    });

    // If no skill exists for this attribute yet, create a default one automatically!
    if (!targetSkill) {
      targetSkill = await prisma.skill.create({
        data: {
          userId: userQuest.userId,
          name: `${attribute} Mastery`,
          description: `Auto-generated skill pillar for ${attribute}`,
          attribute: attribute,
          verified: true
        },
        include: { progress: true }
      });
    }

    let progressResult = null;

    if (targetSkill.progress && targetSkill.progress.length > 0) {
      const currentProgress = targetSkill.progress[0];
      const newXp = currentProgress.xp + xpReward;
      const newLevel = Math.floor(newXp / 150) + 1;

      progressResult = await prisma.userSkillProgress.update({
        where: { id: currentProgress.id },
        data: { xp: newXp, level: newLevel }
      });
    } else {
      const newLevel = Math.floor(xpReward / 150) + 1;
      progressResult = await prisma.userSkillProgress.create({
        data: {
          skillId: targetSkill.id,
          xp: xpReward,
          level: newLevel
        }
      });
    }

    return res.status(200).json({
      message: `Quest successfully completed! Awarded +${xpReward} XP to your ${attribute} matrix.`,
      userQuest: updatedUserQuest,
      updatedProgress: progressResult
    });

  } catch (error) {
    console.error('Complete quest error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}