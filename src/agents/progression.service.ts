import { evaluateSkillGuard } from './semantic.guard.agent.js';
import { calculateProgression } from './progression.agent.js';
import prisma from '../services/prisma.js';

export class ProgressionService {
  public static async evaluateAndProgressSkill(userId: string, skillId: string) {
    const targetSkill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!targetSkill) throw new Error('Skill not found for evaluation.');

    // Step 1: Semantic Guard Check (Added fallbacks ?? '' to handle potential null values)
    const guardResult = await evaluateSkillGuard(
      userId, 
      targetSkill.name ?? '', 
      targetSkill.description ?? '', 
      targetSkill.attribute ?? ''
    );

    if (!guardResult.isApproved) {
      await prisma.skill.delete({ where: { id: skillId } });
      return { status: 'REJECTED_DUPLICATE', reason: guardResult.reason };
    }

    // Step 2: Fetch current user level context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { skills: { include: { progress: true } } }
    });
    const currentLevel = user?.skills.length ? Math.max(...user.skills.map(s => s.progress[0]?.level || 1)) : 1;

    // Step 3: Calculate RPG Progression (Added fallbacks here too just in case)
    const progression = await calculateProgression(
      targetSkill.name ?? '',
      targetSkill.description ?? '',
      targetSkill.attribute ?? '',
      currentLevel
    );

    // Step 4: Atomic Commit for Skill Verification and Progress
    const result = await prisma.$transaction(async (tx) => {
      const verifiedSkill = await tx.skill.update({
        where: { id: skillId },
        data: { verified: true }
      });

      const skillProgress = await tx.userSkillProgress.create({
        data: {
          skillId: verifiedSkill.id,
          xp: progression.xpEarned,
          level: currentLevel + (progression.levelIncrement || 0)
        }
      });

      return { verifiedSkill, skillProgress };
    });

    return {
      status: 'SUCCESS',
      skill: result.verifiedSkill,
      progression
    };
  }
}