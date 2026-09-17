import https from 'https';

export async function generateAiQuestPrompt(attribute) {
  const prompt = `Generate a short personal development quest to improve one's ${attribute} attribute. Return ONLY a valid JSON object with keys "title" and "description". No markdown, no extra text.`;

  const data = JSON.stringify({
    inputs: prompt,
    parameters: { max_new_tokens: 150, return_full_text: false }
  });

  const options = {
    hostname: 'router.huggingface.co',
    path: '/hf-inference/models/google/gemma-2-2b-it', // Lightweight free model under 300MB equivalents/serverless
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HF_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(responseBody);
            // HF text generation returns an array containing generated_text
            const outputText = Array.isArray(parsed) ? parsed[0]?.generated_text : parsed.generated_text;
            
            // Clean up JSON output if wrapped in code blocks
            const cleanJsonStr = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
            const questData = JSON.parse(cleanJsonStr);
            resolve(questData);
          } catch (err) {
            // Fallback default quest if model output parsing fails
            resolve({
              title: `Level up your ${attribute}`,
              description: `Perform a 15-minute dedicated focus session or practical exercise targeting your ${attribute} attribute.`
            });
          }
        } else {
          // Fallback if model is loading or rate-limited
          resolve({
            title: `Master ${attribute} Basics`,
            description: `Read one article or watch one tutorial video focused on advancing your ${attribute} capabilities.`
          });
        }
      });
    });

    req.on('error', () => {
      resolve({
        title: `Daily ${attribute} Challenge`,
        description: `Complete a core task related to your ${attribute} goals today.`
      });
    });

    req.write(data);
    req.end();
  });
}