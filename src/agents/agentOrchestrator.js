import prisma from '../services/prisma.js';
import { normalizeIngestionData } from './ingestion.agent.js';
import { evaluateSkillGuard } from './semantic.guard.agent.js';
import { calculateProgression } from './progression.agent.js';
import { generateAdaptiveQuest } from './quest.architect.agent.js';

export async function runAgentMeshWorkflow(userId, rawActivityStream) {
  try {
    console.log(`[Agent Mesh] Initializing autonomous Hugging Face mesh for user: ${userId}`);

    // Fetch user context for agent reasoning
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { skills: { include: { progress: true } } }
    });

    const currentLevel = user?.skills.length > 0 ? Math.max(...user.skills.map(s => s.progress[0]?.level || 1)) : 1;

    // 1. Node 1: Omnisource Ingestion Agent (HF Qwen-32B)
    const normalized = await normalizeIngestionData(
      rawActivityStream.description || rawActivityStream.title,
      rawActivityStream.sourceType || 'MANUAL_INPUT'
    );

    // 2. Node 2: Semantic Guard Agent (Embeddings & Duplicate Checks)
    const guardResult = await evaluateSkillGuard(
      userId,
      normalized.title,
      normalized.description,
      normalized.attribute
    );

    // Save verified skill to database
    const newSkill = await prisma.skill.create({
      data: {
        userId,
        name: normalized.title,
        description: normalized.description,
        attribute: normalized.attribute,
        verified: guardResult.isApproved
      }
    });

    // 3. Node 3: Game Master Progression Agent (HF Qwen-32B XP Balancing)
    const progression = await calculateProgression(
      normalized.title,
      normalized.description,
      normalized.attribute,
      currentLevel
    );

    const progressRecord = await prisma.userSkillProgress.create({
      data: {
        skillId: newSkill.id,
        xp: progression.xpEarned,
        level: currentLevel + (progression.levelIncrement || 0)
      }
    });

    // 4. Node 4: Dynamic Quest Architect Agent (HF Qwen-32B Persona & UI Config)
    const domainContext = `${normalized.title} - ${normalized.description}`;
    const adaptiveQuestData = await generateAdaptiveQuest(
      domainContext,
      normalized.attribute,
      currentLevel
    );

    const questRecord = await prisma.quest.create({
      data: {
        title: adaptiveQuestData.questTitle,
        description: adaptiveQuestData.questDescription,
        attribute: adaptiveQuestData.targetAttribute,
        xpReward: adaptiveQuestData.suggestedXpReward
      }
    });

    const userQuestRecord = await prisma.userQuest.create({
      data: {
        userId,
        questId: questRecord.id,
        status: 'PENDING'
      }
    });

    return {
      status: 'AUTONOMOUS_MESH_SUCCESS',
      ingestedTelemetry: normalized,
      skillLogged: newSkill,
      gameMasterProgression: {
        ...progression,
        progressId: progressRecord.id
      },
      adaptiveQuest: {
        ...adaptiveQuestData,
        userQuestId: userQuestRecord.id
      }
    };

  } catch (error) {
    console.error('[Agent Mesh Execution Error]:', error.message);
    throw new Error(`Agent pipeline failed: ${error.message}`);
  }
}