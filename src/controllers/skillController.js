import prisma from '../services/prisma.js';
import { generateEmbedding } from '../services/embeddingService.js'; // Assuming you have this service

export async function submitSkill(req, res) {
  try {
    const { userId, name, description, attribute } = req.body;

    if (!userId || !name || !attribute) {
      return res.status(400).json({ error: 'User ID, name, and attribute are required.' });
    }

    // 1. Basic Quality Guard Check (Prevent low-effort entries)
    if (description && description.trim().length < 10) {
      return res.status(400).json({ 
        error: 'Guard Check Failed: Skill description is too brief. Please provide meaningful context about what you learned or built.' 
      });
    }

    // 2. Generate embedding for the incoming skill
    const textToEmbed = `${name}: ${description || ''}`;
    const embedding = await generateEmbedding(textToEmbed);
    const vectorString = `[${embedding.join(',')}]`;

    // 3. Check for high semantic duplicates using pgvector (Threshold > 0.88)
    const existingSkills = await prisma.$queryRaw`
      id, name, 1 - (embedding <=> ${vectorString}::vector) as similarity
      FROM "Skill"
      WHERE "userId" = ${userId}
    `;

    // If any existing skill has a very high similarity score, flag it
    const duplicate = existingSkills.find(s => s.similarity > 0.88);
    if (duplicate) {
      return res.status(400).json({
        error: `Guard Check Failed: This skill is too similar to your existing skill "${duplicate.name}" (Similarity: ${(duplicate.similarity * 100).toFixed(1)}%). Try submitting a more advanced or distinct skill.`
      });
    }

    // 4. Create the skill if it passes all guards
    const newSkill = await prisma.skill.create({
      data: {
        userId,
        name,
        description,
        attribute,
        verified: true, // Auto-verified since it passed intelligence guards
      }
    });

    // 5. Create initial progress entry for the new skill (+50 XP)
    const progress = await prisma.userSkillProgress.create({
      data: {
        skillId: newSkill.id,
        xp: 50,
        level: 1
      }
    });

    // 6. Log the successful guard check
    await prisma.dataSourceLog.create({
      data: {
        source: 'SEMANTIC_GUARD_ENGINE',
        payload: JSON.stringify({ userId, skillId: newSkill.id, status: 'PASSED' })
      }
    });

    return res.status(201).json({
      message: 'Skill successfully verified and logged!',
      skill: newSkill,
      progress
    });

  } catch (error) {
    console.error('Skill submission error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}