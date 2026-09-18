import prisma from '../services/prisma.js';

const VALID_ATTRIBUTES = ['COGNITIVE', 'PHYSICAL', 'EMOTIONAL', 'TECHNICAL', 'CREATIVE', 'FINANCIAL'];

export async function getUserMatrix(req, res) {
  try {
    // FIX: Use userId from the verified JWT middleware instead of req.params
    const userId = req.user.userId;

    // Fetch user with their skills (and progress) and assigned quests
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: {
          include: { progress: true }
        },
        quests: {
          include: { quest: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Initialize the 6 attributes matrix structure
    const attributeMatrix = {};
    VALID_ATTRIBUTES.forEach(attr => {
      attributeMatrix[attr] = {
        totalSkills: 0,
        verifiedSkills: 0,
        totalXp: 0,
        level: 1,
        skills: []
      };
    });

    let overallXp = 0;

    user.skills.forEach(skill => {
      const attr = skill.attribute;
      if (attributeMatrix[attr]) {
        attributeMatrix[attr].totalSkills += 1;
        if (skill.verified) {
          attributeMatrix[attr].verifiedSkills += 1;
        }

        const skillXp = skill.progress[0]?.xp || 0;
        const skillLevel = skill.progress[0]?.level || 1;

        attributeMatrix[attr].totalXp += skillXp;
        attributeMatrix[attr].level = Math.floor(attributeMatrix[attr].totalXp / 150) + 1;

        overallXp += skillXp;

        attributeMatrix[attr].skills.push({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          verified: skill.verified,
          xp: skillXp,
          level: skillLevel
        });
      }
    });

    // FIX: Include full user details (including skills and quests) 
    // so Flutter's User.fromJson() can parse them correctly without defaulting to empty lists.
    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        overallXp,
        skills: user.skills,
        quests: user.quests,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      attributeMatrix,
      quests: user.quests
    });

  } catch (error) {
    console.error('Matrix aggregation error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}