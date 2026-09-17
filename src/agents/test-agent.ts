import dotenv from 'dotenv';
import { normalizeIngestionData } from './ingestion.agent.js';
import { generateEmbedding , evaluateSkillGuard } from './semantic.guard.agent.js';
import { calculateProgression } from './progression.agent.js';
import { generateAdaptiveQuest } from './quest.architect.agent.js';

// Load environment variables
dotenv.config();

async function runMasterPipelineTest() {
  console.log("🚀 ========================================");
  console.log("🔗 RUNNING AI SKILL SENSE MULTI-AGENT MESH TEST");
  console.log("========================================\n");

  try {
    // --- STEP 1: Node 1 (Ingestion & Normalization) ---
    console.log("📥 [Node 1] Running Omnisource Ingestion Agent...");
    const rawInput = "Refactored the core microservice authentication pipeline using Docker, set up environment variables, and successfully deployed containerized API endpoints to Google Cloud Run.";
    const sourceType = "GITHUB_COMMIT";
    
    const normalized = await normalizeIngestionData(rawInput, sourceType);
    console.log("✨ Node 1 Output (Normalized Telemetry):");
    console.log(JSON.stringify(normalized, null, 2));
    console.log("\n----------------------------------------\n");

    // --- STEP 2: Node 2 (Semantic Guard & Embedding) ---
    console.log("🛡️ [Node 2] Running Semantic Skill Controller & Guard...");
    const guardResult = await evaluateSkillGuard("user_123", normalized.title, normalized.description, normalized.attribute);
    console.log("✨ Node 2 Output (Vector Embedding Generated):");
    console.log(`- Status: ${guardResult.isApproved ? "Approved" : "Blocked"}`);
    console.log(`- Vector Length (Dimensions): ${JSON.parse(guardResult.embedding).length}`);
    console.log("\n----------------------------------------\n");

    // --- STEP 3: Node 3 (Game Master Progression & Balance) ---
    console.log("🎲 [Node 3] Running Game Master Progression Agent...");
    const userLevel = 12;
    const progression = await calculateProgression(
      normalized.title,
      normalized.description,
      normalized.attribute,
      userLevel
    );
    console.log("✨ Node 3 Output (Economy & XP Rewards):");
    console.log(JSON.stringify(progression, null, 2));
    console.log("\n----------------------------------------\n");

    // --- STEP 4: Node 4 (Dynamic Persona-Adaptive Quest Architect) ---
    console.log("🗺️ [Node 4] Running Dynamic Quest Architect Agent...");
    const domainContext = "Computer Science student studying System Architecture, Cloud Deployment, and Microservices.";
    const quest = await generateAdaptiveQuest(
      domainContext,
      normalized.attribute,
      userLevel
    );
    console.log("✨ Node 4 Output (Adaptive Quest & UI Config):");
    console.log(JSON.stringify(quest, null, 2));

    console.log("\n========================================");
    console.log("🎉 ALL FOUR AGENT NODES EXECUTED SUCCESSFULLY!");
    console.log("========================================");

  } catch (error: any) {
    console.error("❌ Master pipeline test failed:", error.message || error);
  }
}

runMasterPipelineTest();