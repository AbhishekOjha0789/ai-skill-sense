import { generateAdaptiveQuest } from './quest.architect.agent.js';
import prisma from '../services/prisma.js';

export class QuestService {
  /**
   * Calculates the max allowed active quests using your balance formula:
   * Max Quests = 3 + (Level * 0.5) + Min(Total XP / 500, 5)
   */
  private static calculateMaxActiveQuests(currentLevel: number, totalXp: number): number {
    const baseAllowance = 3;
    const levelFactor = Math.floor(currentLevel * 0.5);
    const xpBonus = Math.min(Math.floor(totalXp / 500), 5);
    return baseAllowance + levelFactor + xpBonus;
  }

  /**
   * Evaluates if a user is eligible for a new quest based on capacity and state.
   */
  public static async evaluateAndMintQuest(userId: string, domainContext?: string, targetAxis?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        skills: { include: { progress: true } },
        quests: { where: { status: 'PENDING' } }
      }
    });

    if (!user) throw new Error('User context not found.');

    // Calculate metrics
    const currentLevel = user.skills.length > 0 ? Math.max(...user.skills.map(s => s.progress[0]?.level || 1)) : 1;
    let totalXp = 0;
    user.skills.forEach(s => s.progress.forEach(p => totalXp += p.xp));

    const maxAllowedQuests = this.calculateMaxActiveQuests(currentLevel, totalXp);
    const activeQuestCount = user.quests.length;

    // GUARD: If user has reached their maximum allowed active quests, block creation
    if (activeQuestCount >= maxAllowedQuests) {
      return { status: 'QUEST_CAP_REACHED', activeCount: activeQuestCount, limit: maxAllowedQuests };
    }

    // ONBOARDING HOOK: If user has 0 skills, mint an immediate Day-1 discovery quest
    let weakestAttribute = targetAxis || 'TECHNICAL';
    let contextString = domainContext || 'Foundational Discovery Quest to log your very first skill.';

    if (user.skills.length === 0) {
      contextString = 'Welcome to AI Skill Sense! Complete your first basic activity to initialize your skill matrix.';
      weakestAttribute = 'TECHNICAL';
    } else if (!targetAxis) {
      // Find weakest pillar otherwise
      const allAttributes = ['COGNITIVE', 'PHYSICAL', 'EMOTIONAL', 'TECHNICAL', 'CREATIVE', 'FINANCIAL'];
      const attributeTotals = allAttributes.map(attr => {
        const skills = user.skills.filter(s => s.attribute === attr);
        let xp = 0;
        skills.forEach(s => s.progress.forEach(p => xp += p.xp));
        return { attr, xp };
      });
      const weakest = attributeTotals.reduce((min, curr) => curr.xp < min.xp ? curr : min, attributeTotals[0]);
      weakestAttribute = weakest.attr;
    }

    // Generate Adaptive Quest via AI Agent
    const adaptiveQuest = await generateAdaptiveQuest(contextString, weakestAttribute, currentLevel);

    const newQuestRecord = await prisma.$transaction(async (tx) => {
      const questRecord = await tx.quest.create({
        data: {
          title: adaptiveQuest.questTitle,
          description: adaptiveQuest.questDescription,
          attribute: adaptiveQuest.targetAttribute,
          xpReward: adaptiveQuest.suggestedXpReward
        }
      });

      await tx.userQuest.create({
        data: { userId, questId: questRecord.id, status: 'PENDING' }
      });

      return questRecord;
    });

    return {
      status: 'QUEST_MINTED',
      quest: newQuestRecord,
      capacity: `${activeQuestCount + 1}/${maxAllowedQuests}`
    };
  }
}