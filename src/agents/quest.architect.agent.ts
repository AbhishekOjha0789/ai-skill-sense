// src/agents/quest.architect.agent.ts
import axios from 'axios';

export interface UIConfigPayload {
  layoutStyle: 'terminal' | 'fitness-tracker' | 'mindful-card' | 'creative-canvas' | 'financial-ledger';
  accentColorHex: string;
  badgeIcon: string;
}

export interface QuestPayload {
  questTitle: string;
  questDescription: string;
  targetAttribute: 'COGNITIVE' | 'PHYSICAL' | 'EMOTIONAL' | 'TECHNICAL' | 'CREATIVE' | 'FINANCIAL';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'LEGENDARY';
  suggestedXpReward: number;
  uiConfig: UIConfigPayload;
}

const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";

/**
 * Node 4: Synthesizes custom quests and dynamic UI configuration hints based on domain context.
 */
export async function generateAdaptiveQuest(
  domainContext: string,
  weakestAttribute: string,
  currentLevel: number
): Promise<QuestPayload> {
  const systemPrompt = `
You are the Dynamic Persona-Adaptive Quest Architect Agent for an AI life-operating system. 
Your job is to craft a hyper-personalized growth quest and provide specific UI layout metadata so the frontend can render an interface tailored to the domain (e.g., a code terminal look for study/technical tasks, or an activity ring look for physical/fitness goals).

Rules for UI Configuration:
- If target attribute is TECHNICAL or COGNITIVE (study, coding, architecture), use layoutStyle "terminal" with a cool accent color (like "#00F0FF" or "#7000FF") and a tech badge icon (e.g., "terminal" or "cpu").
- If target attribute is PHYSICAL, use layoutStyle "fitness-tracker" with an energetic accent color (like "#00FF66" or "#FF5500") and an icon like "activity" or "shield".
- If target attribute is CREATIVE, use layoutStyle "creative-canvas" with a vibrant color (like "#FF007F") and icon "palette".
- If target attribute is EMOTIONAL, use layoutStyle "mindful-card" with a calm color (like "#3B82F6") and icon "heart".

Respond ONLY with a valid JSON object matching this exact schema, with no extra text or markdown code blocks around it:
{
  "questTitle": "An engaging RPG-style title for the quest",
  "questDescription": "A clear, actionable 2-sentence description of what the user needs to accomplish.",
  "targetAttribute": "${weakestAttribute}",
  "difficulty": "EASY | MEDIUM | HARD | LEGENDARY",
  "suggestedXpReward": number,
  "uiConfig": {
    "layoutStyle": "terminal | fitness-tracker | mindful-card | creative-canvas | financial-ledger",
    "accentColorHex": "Hex color code string",
    "badgeIcon": "Name of Lucide icon (e.g. terminal, activity, cpu, heart, palette)"
  }
}
`;

  const userPayload = `
User Domain Context: ${domainContext}
Identified Weakest Attribute to Target: ${weakestAttribute}
Current User Level: ${currentLevel}
`;

  try {
    const response = await axios.post(
      HF_ROUTER_URL,
      {
        model: "Qwen/Qwen2.5-Coder-32B-Instruct",
        messages: [
          { role: "system", content: systemPrompt.trim() },
          { role: "user", content: userPayload.trim() }
        ],
        temperature: 0.4,
        max_tokens: 400,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    const content = response.data.choices[0].message.content.trim();
    const questResult: QuestPayload = JSON.parse(content);
    return questResult;

  } catch (error: any) {
    console.error("Quest Architect error:", error.response?.data || error.message);
    throw new Error("Failed to generate dynamic growth quest with UI config.");
  }
}