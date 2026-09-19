import prisma from '../services/prisma.js';
import { generateAiQuestPrompt } from '../services/questGenerator.js';
import { generateEmbedding } from '../services/embeddingService.js';

export async function generateAndAssignQuest(req, res) {
  try {
    const { userId, attribute } = req.body;
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
      data: { userId, questId: newQuest.id, status: 'PENDING' }
    });

    return res.status(201).json({ message: 'AI Quest assigned!', quest: newQuest, userQuestStatus: userQuest });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function completeQuestWithProof(req, res) {
  try {
    const { userId, userQuestId, proofText } = req.body;

    if (!userQuestId || !proofText) {
      return res.status(400).json({ error: 'Missing userQuestId or proofText.' });
    }

    const userQuest = await prisma.userQuest.findUnique({
      where: { id: userQuestId },
      include: { quest: true }
    });

    if (!userQuest || userQuest.userId !== userId) {
      return res.status(404).json({ error: 'User quest not found.' });
    }

    if (userQuest.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Quest is already completed.' });
    }

    const attribute = userQuest.quest.attribute;
    const xpReward = userQuest.quest.xpReward;

    // 1. Convert the proof-of-work into a permanent verified skill record automatically
    const skillName = `Quest Accomplished: ${userQuest.quest.title}`;
    const textToEmbed = `${skillName}: ${proofText}`;
    const embedding = await generateEmbedding(textToEmbed);
    const vectorString = `[${embedding.join(',')}]`;

    const result = await prisma.$transaction(async (tx) => {
      // Mark user quest as completed
      const updatedUserQuest = await tx.userQuest.update({
        where: { id: userQuestId },
        data: { status: 'COMPLETED' }
      });

      // Create permanent skill from proof
      const newSkill = await tx.skill.create({
        data: {
          userId,
          name: skillName,
          description: proofText,
          attribute: attribute,
          verified: true
        }
      });

      await tx.$executeRaw`
        UPDATE "Skill" 
        SET embedding = ${vectorString}::vector 
        WHERE id = ${newSkill.id}
      `;

      // Find or create skill progress entry to award XP
      let targetProgress = await tx.userSkillProgress.findFirst({
        where: { skillId: newSkill.id }
      });

      const newLevel = Math.floor(xpReward / 150) + 1;
      const progressResult = await tx.userSkillProgress.create({
        data: {
          skillId: newSkill.id,
          xp: xpReward,
          level: newLevel
        }
      });

      return { updatedUserQuest, newSkill, progressResult };
    });

    return res.status(200).json({
      message: `Proof verified! Quest completed and +${xpReward} XP awarded to your ${attribute} matrix.`,
      userQuest: result.updatedUserQuest,
      skill: result.newSkill,
      progress: result.progressResult
    });

  } catch (error) {
    console.error('Complete quest error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}