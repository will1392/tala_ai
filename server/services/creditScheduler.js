/**
 * Credit System Scheduler
 * Handles automatic monthly credit resets on the 1st of each month
 */

import cron from 'node-cron';
import CreditSystem from './creditSystem.js';

class CreditScheduler {
  constructor() {
    this.creditSystem = new CreditSystem();
    this.isScheduled = false;
    this.cronJob = null;
  }

  /**
   * Start the monthly credit reset scheduler
   * Runs at midnight (00:00) on the 1st of every month
   */
  start() {
    if (this.isScheduled) {
      console.log('⚠️  Credit scheduler already running');
      return;
    }

    // Schedule for midnight on the 1st of every month
    // Cron format: '0 0 1 * *' = minute hour day-of-month month day-of-week
    this.cronJob = cron.schedule('0 0 1 * *', async () => {
      console.log('🔄 Starting monthly credit reset...');
      
      try {
        const result = await this.creditSystem.monthlyReset();
        
        if (result.success) {
          console.log('✅ Monthly credit reset completed successfully');
          console.log(`   - Users reset: ${result.usersReset}`);
          console.log(`   - Organizations reset: ${result.organizationsReset}`);
          
          // Log to monitoring/alerting system if available
          await this.notifySuccess(result);
        } else {
          console.error('❌ Monthly credit reset failed:', result.error);
          await this.notifyFailure(result.error);
        }
      } catch (error) {
        console.error('❌ Error during monthly credit reset:', error);
        await this.notifyFailure(error.message);
      }
    }, {
      scheduled: true,
      timezone: 'UTC' // Use UTC to avoid timezone issues
    });

    this.isScheduled = true;
    console.log('✅ Credit scheduler started - will run at midnight on the 1st of each month (UTC)');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isScheduled = false;
      console.log('⏹️  Credit scheduler stopped');
    }
  }

  /**
   * Manually trigger a credit reset (for testing or admin purposes)
   */
  async manualReset() {
    console.log('🔄 Manual credit reset triggered...');
    
    try {
      const result = await this.creditSystem.monthlyReset();
      
      if (result.success) {
        console.log('✅ Manual credit reset completed');
        console.log(`   - Users reset: ${result.usersReset}`);
        console.log(`   - Organizations reset: ${result.organizationsReset}`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error during manual credit reset:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get next scheduled reset date
   */
  getNextResetDate() {
    const now = new Date();
    const nextReset = new Date(Date.UTC(
      now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear(),
      now.getUTCMonth() === 11 ? 0 : now.getUTCMonth() + 1,
      1, 0, 0, 0, 0
    ));
    
    return nextReset.toISOString();
  }

  /**
   * Get days until next reset
   */
  getDaysUntilReset() {
    const nextReset = new Date(this.getNextResetDate());
    const now = new Date();
    const diffTime = nextReset.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Notify success (extend this to send to monitoring/alerting system)
   */
  async notifySuccess(result) {
    // TODO: Integrate with monitoring system (Sentry, DataDog, etc.)
    // For now, just log
    console.log('📧 Credit reset notification sent (success)');
  }

  /**
   * Notify failure (extend this to send alerts)
   */
  async notifyFailure(error) {
    // TODO: Integrate with alerting system (PagerDuty, Slack, email, etc.)
    // For now, just log
    console.error('🚨 Credit reset ALERT - Failed:', error);
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isScheduled: this.isScheduled,
      nextResetDate: this.getNextResetDate(),
      daysUntilReset: this.getDaysUntilReset(),
      timezone: 'UTC'
    };
  }
}

// Export singleton instance
const creditScheduler = new CreditScheduler();
export default creditScheduler;
