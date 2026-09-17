// src/agents/ingestion.agent.ts
import axios from 'axios';
const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
/**
 * Normalizes raw, unstructured data sources into standard JSON telemetry.
 * @param rawInput Unstructured text, logs, or OCR snippets
 * @param sourceType Origin label (e.g., "GITHUB_COMMIT", "WEB_SCRAPE", "DIGILOCKER_OCR")
 */
export async function normalizeIngestionData(rawInput, sourceType) {
    const systemPrompt = `
You are the Omnisource Ingestion & Normalization Agent for an AI life-operating system. 
Your job is to parse messy user input streams (Git commit logs, web text, academic certificates) and distill them into a precise, clean JSON object.

You must categorize the activity into strictly one of these six attributes:
- COGNITIVE (mental frameworks, complex problem solving, theory)
- PHYSICAL (workouts, athletics, health tracking)
- EMOTIONAL (mindfulness, reflection, emotional mastery)
- TECHNICAL (coding, system architecture, engineering tasks)
- CREATIVE (UI/UX design, content creation, writing, art)
- FINANCIAL (budgeting, investments, economic strategies)

Respond ONLY with a valid JSON object matching this exact schema, with no extra text or markdown formatting blocks around it:
{
  "title": "Concise, professional title of the activity",
  "description": "A 1-2 sentence summary narrative of what was achieved.",
  "attribute": "EXACT_MATCH_FROM_THE_SIX_CHOICES",
  "sourceType": "${sourceType}"
}
`;
    try {
        const response = await axios.post(HF_ROUTER_URL, {
            model: "Qwen/Qwen2.5-Coder-32B-Instruct", // Active serverless router-supported model
            messages: [
                { role: "system", content: systemPrompt.trim() },
                { role: "user", content: rawInput }
            ],
            temperature: 0.1,
            max_tokens: 300,
        }, {
            headers: {
                Authorization: `Bearer ${process.env.HF_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            }
        });
        const content = response.data.choices[0].message.content.trim();
        // Parse and return the standardized telemetry object
        const telemetry = JSON.parse(content);
        return telemetry;
    }
    catch (error) {
        console.error("Ingestion Agent normalization error:", error.response?.data || error.message);
        throw new Error("Failed to normalize incoming data stream.");
    }
}
