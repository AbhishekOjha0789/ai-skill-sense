import { IngestionService } from './ingestion.service.js';
import { ProgressionService } from './progression.service.js';
import { QuestService } from './quest.service.js';

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
    // Tool 1: Pure Ingestion Service
    this.tools.set('ingest_activity', {
      name: 'ingest_activity',
      description: 'Parses raw unstructured activity streams into normalized draft telemetry.',
      execute: async ({ rawInput, sourceType }) => {
        return await IngestionService.ingestRawActivity(this.userId, {
          title: rawInput,
          description: rawInput,
          sourceType
        });
      }
    });

    // Tool 2: Semantic Guard & Progression Service
    this.tools.set('evaluate_progress', {
      name: 'evaluate_progress',
      description: 'Runs semantic duplication guards, calculates XP, and updates skill tiers.',
      execute: async ({ skillId }) => {
        return await ProgressionService.evaluateAndProgressSkill(this.userId, skillId);
      }
    });

    // Tool 3: Adaptive Quest Architect (with Bounded Formula & Onboarding Rules)
    this.tools.set('architect_quest', {
      name: 'architect_quest',
      description: 'Evaluates active quest limits and mints tailored growth quests.',
      execute: async ({ domainContext, targetAxis }) => {
        return await QuestService.evaluateAndMintQuest(this.userId, domainContext, targetAxis);
      }
    });
  }

  /**
   * Executes a specific tool dynamically on-demand.
   */
  async executeTool(toolName: string, args: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found in Commander registry.`);
    }
    console.log(`[Commander Engine] Invoking tool: ${toolName} for user: ${this.userId}`);
    return await tool.execute(args);
  }
}