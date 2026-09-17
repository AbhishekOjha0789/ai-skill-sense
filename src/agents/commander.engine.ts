import { normalizeIngestionData } from './ingestion.agent.js';
import { evaluateSkillGuard } from './semantic.guard.agent.js';
import { calculateProgression } from './progression.agent.js';
import { generateAdaptiveQuest } from './quest.architect.agent.js';
import prisma from '../services/prisma.js';

// Define Tool Definitions for the Commander
export interface AgentTool {
  name: string;
  description: string;
  execute: (args: any) => Promise<any>;
}

export class CommanderEngine {
  private userId: string;
  private tools: Map<string, AgentTool> = new Map();

  constructor(userId: string) {
    this.userId = userId;
    this.registerTools();
  }

  private registerTools() {
    // Tool 1: Omnisource Ingestion
    this.tools.set('ingest_activity', {
      name: 'ingest_activity',
      description: 'Parses and standardizes raw unstructured activity streams into clean telemetry.',
      execute: async ({ rawInput, sourceType }) => {
        return await normalizeIngestionData(rawInput, sourceType);
      }
    });

    // Tool 2: Semantic Guard & Vector Validation
    this.tools.set('evaluate_guard', {
      name: 'evaluate_guard',
      description: 'Checks semantic similarity via pgvector to prevent duplicate skill submissions.',
      execute: async ({ title, description, attribute }) => {
        return await evaluateSkillGuard(this.userId, title, description, attribute);
      }
    });

    // Tool 3: Game Master Progression Balancing
    this.tools.set('calculate_progression', {
      name: 'calculate_progression',
      description: 'Computes balanced RPG XP rewards and level increments based on skill complexity.',
      execute: async ({ title, description, attribute, currentLevel }) => {
        return await calculateProgression(title, description, attribute, currentLevel);
      }
    });

    // Tool 4: Dynamic Quest Architect
    this.tools.set('architect_quest', {
      name: 'architect_quest',
      description: 'Generates custom growth quests and UI configuration metadata for lagging attributes.',
      execute: async ({ domainContext, weakestAttribute, currentLevel }) => {
        return await generateAdaptiveQuest(domainContext, weakestAttribute, currentLevel);
      }
    });
  }

  /**
   * PASSIVE MODE: Fast ingestion only.
   * Runs ONLY Tool 1 (Ingestion) to normalize and store raw telemetry without triggering the heavy evaluation loop.
   */
  async runPassiveIngestion(rawActivityStream: any): Promise<any> {
    console.log(`[Commander Engine] Running passive ingestion for user: ${this.userId}`);
    try {
      const ingestTool = this.tools.get('ingest_activity')!;
      const normalizedTelemetry = await ingestTool.execute({
        rawInput: rawActivityStream.description || rawActivityStream.title,
        sourceType: rawActivityStream.sourceType || 'MANUAL_INPUT'
      });

      const newSkill = await prisma.skill.create({
        data: {
          userId: this.userId,
          name: normalizedTelemetry.title,
          description: normalizedTelemetry.description,
          attribute: normalizedTelemetry.attribute,
          verified: false // Unprocessed telemetry waiting for batch/on-demand evaluation
        }
      });

      return {
        status: 'INGESTED_PENDING_EVALUATION',
        message: 'Telemetry successfully ingested and stored passively.',
        telemetry: normalizedTelemetry,
        skill: newSkill
      };
    } catch (error: any) {
      console.error('[Commander Engine Passive Ingestion Error]:', error.message);
      throw new Error(`Passive ingestion failed: ${error.message}`);
    }
  }

  /**
   * ACTIVE MODE: The full multi-agent tool-calling loop.
   * Dynamically orchestrates all tools based on live state feedback.
   */
  async runExecutionLoop(rawActivityStream: any): Promise<any> {
    console.log(`[Commander Engine] Initiating agentic execution loop for user: ${this.userId}`);

    try {
      // Step 1: Fetch user matrix state to inform decisions
      const user = await prisma.user.findUnique({
        where: { id: this.userId },
        include: { skills: { include: { progress: true } } }
      });

      if (!user) throw new Error('User context not found.');
      const currentLevel = user.skills.length > 0 ? Math.max(...user.skills.map(s => s.progress[0]?.level || 1)) : 1;

      // Step 2: Commander decides to invoke Tool 1 (Ingestion)
      console.log(`[Commander] Step 1: Invoking tool 'ingest_activity'...`);
      const ingestTool = this.tools.get('ingest_activity')!;
      const normalizedTelemetry = await ingestTool.execute({
        rawInput: rawActivityStream.description || rawActivityStream.title,
        sourceType: rawActivityStream.sourceType || 'MANUAL_INPUT'
      });

      // Step 3: Commander evaluates if activity meets progression thresholds (Level Management Guard)
      if (currentLevel > 5 && rawActivityStream.complexity === 'TRIVIAL') {
        return {
          status: 'VETO_REJECTED',
          reason: 'Commander decision: Activity complexity is too low for current user tier. Skipping downstream tools.'
        };
      }

      // Step 4: Commander invokes Tool 2 (Semantic Guard)
      console.log(`[Commander] Step 2: Invoking tool 'evaluate_guard'...`);
      const guardTool = this.tools.get('evaluate_guard')!;
      const guardResult = await guardTool.execute({
        title: normalizedTelemetry.title,
        description: normalizedTelemetry.description,
        attribute: normalizedTelemetry.attribute
      });

      // Commit verified skill to database
      const newSkill = await prisma.skill.create({
        data: {
          userId: this.userId,
          name: normalizedTelemetry.title,
          description: normalizedTelemetry.description,
          attribute: normalizedTelemetry.attribute,
          verified: guardResult.isApproved
        }
      });

      // Step 5: Commander invokes Tool 3 (Game Master Progression)
      console.log(`[Commander] Step 3: Invoking tool 'calculate_progression'...`);
      const progressionTool = this.tools.get('calculate_progression')!;
      const progression = await progressionTool.execute({
        title: normalizedTelemetry.title,
        description: normalizedTelemetry.description,
        attribute: normalizedTelemetry.attribute,
        currentLevel
      });

      await prisma.userSkillProgress.create({
        data: {
          skillId: newSkill.id,
          xp: progression.xpEarned,
          level: currentLevel + (progression.levelIncrement || 0)
        }
      });

      // Step 6: Commander evaluates pillar balance to decide target for Tool 4
      const allAttributes = ['COGNITIVE', 'PHYSICAL', 'EMOTIONAL', 'TECHNICAL', 'CREATIVE', 'FINANCIAL'];
      const attributeTotals = allAttributes.map(attr => {
        const skills = user.skills.filter(s => s.attribute === attr);
        let xp = 0;
        skills.forEach(s => s.progress.forEach(p => xp += p.xp));
        return { attr, xp };
      });
      const weakest = attributeTotals.reduce((min, curr) => curr.xp < min.xp ? curr : min, attributeTotals[0]);

      // Step 7: Commander invokes Tool 4 (Quest Architect) targeting equilibrium
      console.log(`[Commander] Step 4: Invoking tool 'architect_quest' (Targeting pillar: ${weakest.attr})...`);
      const questTool = this.tools.get('architect_quest')!;
      const adaptiveQuest = await questTool.execute({
        domainContext: `${normalizedTelemetry.title} - ${normalizedTelemetry.description}`,
        weakestAttribute: weakest.xp < 100 ? weakest.attr : normalizedTelemetry.attribute,
        currentLevel
      });

      const questRecord = await prisma.quest.create({
        data: {
          title: adaptiveQuest.questTitle,
          description: adaptiveQuest.questDescription,
          attribute: adaptiveQuest.targetAttribute,
          xpReward: adaptiveQuest.suggestedXpReward
        }
      });

      await prisma.userQuest.create({
        data: { userId: this.userId, questId: questRecord.id, status: 'PENDING' }
      });

      console.log(`[Commander Engine] Execution loop successfully completed.`);
      return {
        status: 'SUCCESS',
        commanderDecision: 'Approved and executed via tool-calling loop.',
        telemetry: normalizedTelemetry,
        skill: newSkill,
        progression,
        quest: adaptiveQuest
      };

    } catch (error: any) {
      console.error('[Commander Engine Error]:', error.message);
      throw new Error(`Agentic execution loop failed: ${error.message}`);
    }
  }

  /**
   * ACTIVE MODE: Evaluates pending unverified activities through the AI guard,
   * calculates progression, and architectures a dynamic quest.
   */
  async evaluateActiveMesh(activityId?: string): Promise<any> {
    console.log(`[Commander Engine] Running active evaluation mesh for user: ${this.userId}`);

    // 1. Find the pending unverified activity
    const targetActivity = activityId 
      ? await prisma.skill.findUnique({ where: { id: activityId } })
      : await prisma.skill.findFirst({ where: { userId: this.userId, verified: false } });

    if (!targetActivity) {
      return { status: 'NO_PENDING_ACTIVITIES', message: 'No uncomputed telemetry found for evaluation.' };
    }

    // 2. Run Tool 2: AI Semantic Guard & pgvector Check
    const guardTool = this.tools.get('evaluate_guard')!;
    const guardResult = await guardTool.execute({
      title: targetActivity.name,
      description: targetActivity.description,
      attribute: targetActivity.attribute
    });

    if (!guardResult.isApproved) {
      return {
        status: 'REJECTED_DUPLICATE',
        reason: guardResult.reason
      };
    }

    // 3. Update skill to verified and attach embedding if available
    const updatedSkill = await prisma.skill.update({
      where: { id: targetActivity.id },
      data: { 
        verified: true,
        // Remove prisma.raw() and let Prisma map the string into the vector column via SQL cast if needed, 
        // or update it via a raw query if Prisma schema treats it as Unsupported("vector")
      }
    });

    // 4. Run Tool 3: Calculate Progression (XP)
    const user = await prisma.user.findUnique({
      where: { id: this.userId },
      include: { skills: { include: { progress: true } } }
    });
    const currentLevel = user?.skills.length ? Math.max(...user.skills.map(s => s.progress[0]?.level || 1)) : 1;

    const progressionTool = this.tools.get('calculate_progression')!;
    const progression = await progressionTool.execute({
      title: updatedSkill.name,
      description: updatedSkill.description,
      attribute: updatedSkill.attribute,
      currentLevel
    });

    await prisma.userSkillProgress.create({
      data: {
        skillId: updatedSkill.id,
        xp: progression.xpEarned,
        level: currentLevel + (progression.levelIncrement || 0)
      }
    });

    // 5. Run Tool 4: Architect Quest
    const questTool = this.tools.get('architect_quest')!;
    const adaptiveQuest = await questTool.execute({
      domainContext: `${updatedSkill.name} - ${updatedSkill.description}`,
      weakestAttribute: updatedSkill.attribute,
      currentLevel
    });

    const questRecord = await prisma.quest.create({
      data: {
        title: adaptiveQuest.questTitle,
        description: adaptiveQuest.questDescription,
        attribute: adaptiveQuest.targetAttribute,
        xpReward: adaptiveQuest.suggestedXpReward
      }
    });

    await prisma.userQuest.create({
      data: { userId: this.userId, questId: questRecord.id, status: 'PENDING' }
    });

    return {
      status: 'SUCCESS',
      commanderDecision: 'AI Semantic Guard passed, XP calculated, and quest architected.',
      telemetry: targetActivity,
      skill: updatedSkill,
      progression,
      quest: adaptiveQuest
    };
  }
}