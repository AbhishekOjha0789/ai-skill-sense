import cron from 'node-cron';
import prisma from '../services/prisma.js';
import { CommanderEngine } from './commander.engine.js';

export class AutonomousCommanderDaemon {
  private static instance: AutonomousCommanderDaemon;
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): AutonomousCommanderDaemon {
    if (!AutonomousCommanderDaemon.instance) {
      AutonomousCommanderDaemon.instance = new AutonomousCommanderDaemon();
    }
    return AutonomousCommanderDaemon.instance;
  }

  /**
   * Starts the 24/7 background intelligence loop
   */
  public startBackgroundDaemon() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('🟢 [Autonomous Commander] 24/7 Core Supervisor Daemon online and monitoring system state...');

    // Run proactive idle-time scan every 6 hours (or configured interval)
    cron.schedule('0 */6 * * *', async () => {
      console.log('⏰ [Commander Daemon] Executing scheduled proactive audit & idle-time generation...');
      await this.executeProactiveAudit();
    });
  }

  /**
   * Proactive Agent Mode: Executes actions even when the user is not actively submitting activities
   */
  private async executeProactiveAudit() {
    try {
      // Fetch all active users in the system
      const users = await prisma.user.findMany({
        include: { 
          skills: { include: { progress: true } },
          quests: { include: { quest: true } }
        }
      });

      for (const user of users) {
        // Analyze user's pillar equilibrium
        const allAttributes = ['COGNITIVE', 'PHYSICAL', 'EMOTIONAL', 'TECHNICAL', 'CREATIVE', 'FINANCIAL'];
        const attributeTotals = allAttributes.map(attr => {
          const skills = user.skills.filter(s => s.attribute === attr);
          let xp = 0;
          skills.forEach(s => s.progress.forEach(p => xp += p.xp));
          return { attr, xp };
        });

        const weakestPillar = attributeTotals.reduce((min, curr) => curr.xp < min.xp ? curr : min, attributeTotals[0]);

        // If the user's lowest pillar is severely lagging behind, the Commander proactively intervenes
        if (weakestPillar.xp < 50) {
          console.log(`[Commander Proactive] User ${user.id} has an underdeveloped pillar: ${weakestPillar.attr}. Generating proactive intervention quest...`);

          const engine = new CommanderEngine(user.id);
          // Proactively force a maintenance quest generation via the tool engine
          await engine.runExecutionLoop({
            title: `Proactive Equilibrium Maintenance: ${weakestPillar.attr}`,
            description: `Autonomous background check detected stagnation in your ${weakestPillar.attr} axis. Commander has minted a foundational balancing quest.`,
            sourceType: 'AUTONOMOUS_DAEMON_PROACTIVE',
            complexity: 'MODERATE'
          });
        }
      }
      console.log('[Commander Daemon] Proactive audit cycle completed successfully.');
    } catch (error: any) {
      console.error('[Commander Daemon Error] Proactive audit failed:', error.message);
    }
  }
}

// Export singleton initializer
export const commanderDaemon = AutonomousCommanderDaemon.getInstance();