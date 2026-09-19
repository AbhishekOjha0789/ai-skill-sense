import { normalizeIngestionData } from './ingestion.agent.js';
import prisma from '../services/prisma.js';

export class IngestionService {
  public static async ingestRawActivity(userId: string, rawActivityStream: any) {
    console.log(`[Ingestion Service] Normalizing raw stream for user: ${userId}`);
    
    const normalizedTelemetry = await normalizeIngestionData(
      rawActivityStream.description || rawActivityStream.title,
      rawActivityStream.sourceType || 'MANUAL_INPUT'
    );

    // Save strictly as an unverified raw draft skill
    const draftSkill = await prisma.skill.create({
      data: {
        userId,
        name: normalizedTelemetry.title,
        description: normalizedTelemetry.description,
        attribute: normalizedTelemetry.attribute,
        verified: false
      }
    });

    return {
      status: 'DRAFT_STORED',
      telemetry: normalizedTelemetry,
      skill: draftSkill
    };
  }
}