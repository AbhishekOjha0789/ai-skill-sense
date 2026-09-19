import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './services/prisma.js';
import authRoutes from './routes/authRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import skillRoutes from './routes/skillRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import questRoutes from './routes/questRoutes.js';
import profileRoutes from './routes/profileRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static frontend dashboard
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ 
      status: 'success', 
      message: 'AI Skill Sense API is running', 
      database: 'connected' 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed', 
      error: error.message 
    });
  }
});

// Register feature routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/users', profileRoutes);
app.use('/api/webhooks', webhookRoutes);

// Ensure default user exists on startup
async function ensureDefaultUser() {
  try {
    await prisma.user.upsert({
      where: { id: 'abc1' },
      update: {},
      create: {
        id: 'abc1',
        name: 'Abhishek',
        email: 'abhishek@test.com',
        password: 'default_placeholder_password'
      }
    });
    console.log('Default user (abc1) verified/created successfully.');
  } catch (err) {
    console.error('Failed to seed default user:', err.message);
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server is running on port ${PORT}`);
  await ensureDefaultUser();
});