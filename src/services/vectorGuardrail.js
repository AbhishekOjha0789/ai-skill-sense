import https from 'https';
import prisma from './prisma.js';

export async function fetchEmbedding(text) {
  const data = JSON.stringify({ inputs: text });

  const options = {
    hostname: 'router.huggingface.co',
    path: '/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction',
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

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(responseBody);
            if (parsed.error) {
              return reject(new Error(`Hugging Face model loading: ${parsed.error}`));
            }
            resolve(parsed);
          } catch (err) {
            reject(new Error(`Failed to parse embedding response: ${err.message}`));
          }
        } else {
          reject(new Error(`HF API failed with status ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

export async function checkDuplicateSkill(userId, embedding) {
  const vectorString = `[${embedding.join(',')}]`;
  const similarityThreshold = 0.85; 

  // Query all skills for this user to inspect similarities clearly
  const matches = await prisma.$queryRaw`
    SELECT id, name, 1 - (embedding <=> ${vectorString}::vector) AS similarity
    FROM "Skill"
    WHERE "userId" = ${userId}
    ORDER BY similarity DESC;
  `;

  console.log("Similarity check results against existing skills:", matches);

  // Filter for anything meeting or exceeding the 0.85 threshold
  const duplicate = matches.find(m => Number(m.similarity) >= similarityThreshold);
  return duplicate || null;
}