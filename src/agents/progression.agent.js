// src/agents/progression.agent.ts
import axios from 'axios';
const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
/**
 * Node 3: Computes balanced XP and milestone increments based on skill complexity and user history.
 */
export async function calculateProgression(skillTitle, skillDescription, attribute, currentUserLevel) {
    const systemPrompt = `
You are the Game Master Progression & Balance Agent for an AI life-operating system. 
Your job is to evaluate the cognitive load, depth, and technical or creative complexity of a verified user activity and compute fair, non-inflationary RPG-style progression rewards.

Rules for Balancing:
- Standard small tasks (e.g., minor bug fix, simple commit) grant 10 - 30 XP.
- Moderate tasks (e.g., core feature implementation, complete module design) grant 40 - 80 XP.
- Complex tasks (e.g., full architecture refactoring, complex deployment pipeline, advanced problem solving) grant 90 - 150 XP.
- Ensure progression remains mathematically balanced so users do not hyper-inflate levels.

Respond ONLY with a valid JSON object matching this exact schema, with no extra text or markdown code blocks around it:
{
  "xpEarned": number,
  "attributeWeight": "${attribute}",
  "levelIncrement": number,
  "reasoning": "A short 1-sentence game master rationale for why this XP was awarded."
}
`;
    const userPayload = `
Activity Title: ${skillTitle}
Description: ${skillDescription}
Target Attribute: ${attribute}
User's Current Level: ${currentUserLevel}
`;
    try {
        const response = await axios.post(HF_ROUTER_URL, {
            model: "Qwen/Qwen2.5-Coder-32B-Instruct", // Robust reasoning model via HF router
            messages: [
                { role: "system", content: systemPrompt.trim() },
                { role: "user", content: userPayload.trim() }
            ],
            temperature: 0.2,
            max_tokens: 300,
        }, {
            headers: {
                Authorization: `Bearer ${process.env.HF_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            }
        });
        const content = response.data.choices[0].message.content.trim();
        const progressionResult = JSON.parse(content);
        return progressionResult;
    }
    catch (error) {
        console.error("Game Master Progression error:", error.response?.data || error.message);
        throw new Error("Failed to calculate progression metrics.");
    }
}
