#!/usr/bin/env node

/**
 * Knowledge Base System Health Check
 * Verifies all components of the knowledge base system
 * 
 * Usage:
 *   node scripts/check-knowledge-system.js
 *   npm run check:knowledge-system
 */

const { Pool } = require('pg');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { S3Client, HeadBucketCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

class SystemHealthChecker {
  constructor() {
    this.checks = [];
    this.errors = [];
    this.warnings = [];
  }

  async checkDatabase() {
    console.log('\n📊 Database Connection...');
    
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });

      await pool.query('SELECT 1');
      
      const docCount = await pool.query('SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL');
      const folderCount = await pool.query('SELECT COUNT(*) FROM folders');
      const batchCount = await pool.query('SELECT COUNT(*) FROM upload_batches');

      console.log('   ✅ Connected to PostgreSQL');
      console.log(`   ✅ Documents: ${docCount.rows[0].count}`);
      console.log(`   ✅ Folders: ${folderCount.rows[0].count}`);
      console.log(`   ✅ Batches: ${batchCount.rows[0].count}`);

      await pool.end();
      return true;
    } catch (error) {
      console.log('   ❌ Database connection failed');
      this.errors.push(`Database: ${error.message}`);
      return false;
    }
  }

  async checkQdrant() {
    console.log('\n🔍 Qdrant Vector Database...');
    
    try {
      const client = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY
      });

      const collections = await client.getCollections();
      const collection = collections.collections.find(c => c.name === 'knowledge_base');

      if (collection) {
        const info = await client.getCollection('knowledge_base');
        console.log('   ✅ Connected to Qdrant');
        console.log(`   ✅ Collection: knowledge_base`);
        console.log(`   ✅ Vectors: ${info.points_count || 0}`);
        console.log(`   ✅ Dimensions: ${info.config.params.vectors.size}`);
      } else {
        console.log('   ⚠️  Collection "knowledge_base" not found');
        this.warnings.push('Qdrant collection not initialized');
      }

      return true;
    } catch (error) {
      console.log('   ❌ Qdrant connection failed');
      this.errors.push(`Qdrant: ${error.message}`);
      return false;
    }
  }

  async checkOpenAI() {
    console.log('\n🤖 OpenAI API...');
    
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      // Simple check - just verify the key is set
      console.log('   ✅ API key configured');
      
      return true;
    } catch (error) {
      console.log('   ❌ OpenAI configuration failed');
      this.errors.push(`OpenAI: ${error.message}`);
      return false;
    }
  }

  async checkS3() {
    console.log('\n💾 AWS S3 Storage...');
    
    try {
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });

      const bucketName = process.env.AWS_S3_BUCKET;
      
      // Check bucket access
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      
      // Count objects
      const listResponse = await s3Client.send(
        new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1000 })
      );
      
      const totalSize = (listResponse.Contents || []).reduce((sum, obj) => sum + (obj.Size || 0), 0);
      
      console.log(`   ✅ Connected to S3 bucket: ${bucketName}`);
      console.log(`   ✅ Documents: ${listResponse.KeyCount || 0}`);
      console.log(`   ✅ Total size: ${this.formatSize(totalSize)}`);

      return true;
    } catch (error) {
      console.log('   ❌ S3 connection failed');
      this.errors.push(`S3: ${error.message}`);
      return false;
    }
  }

  async checkProcessingQueue() {
    console.log('\n⚙️  Processing Queue...');
    
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });

      // Check for stuck jobs (processing for > 1 hour)
      const stuckJobs = await pool.query(`
        SELECT COUNT(*) 
        FROM documents 
        WHERE status = 'processing' 
        AND updated_at < NOW() - INTERVAL '1 hour'
      `);

      // Check failed jobs in last 24 hours
      const failedJobs = await pool.query(`
        SELECT COUNT(*) 
        FROM documents 
        WHERE status = 'failed' 
        AND created_at > NOW() - INTERVAL '24 hours'
      `);

      console.log('   ✅ Processing queue operational');
      
      if (parseInt(stuckJobs.rows[0].count) > 0) {
        console.log(`   ⚠️  Stuck jobs: ${stuckJobs.rows[0].count}`);
        this.warnings.push(`${stuckJobs.rows[0].count} documents stuck in processing`);
      }
      
      if (parseInt(failedJobs.rows[0].count) > 0) {
        console.log(`   ⚠️  Failed (24h): ${failedJobs.rows[0].count}`);
        this.warnings.push(`${failedJobs.rows[0].count} documents failed processing in last 24h`);
      }

      await pool.end();
      return true;
    } catch (error) {
      console.log('   ❌ Queue check failed');
      this.errors.push(`Queue: ${error.message}`);
      return false;
    }
  }

  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Overall Status');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n   ✅ HEALTHY - All systems operational\n');
    } else if (this.errors.length === 0) {
      console.log('\n   ⚠️  DEGRADED - Some warnings detected\n');
    } else {
      console.log('\n   ❌ UNHEALTHY - Critical errors detected\n');
    }

    if (this.errors.length > 0) {
      console.log('❌ Errors:');
      this.errors.forEach(err => console.log(`   • ${err}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.warnings.forEach(warn => console.log(`   • ${warn}`));
      console.log('');
    }

    if (this.errors.length === 0 && this.warnings.length > 0) {
      console.log('💡 Recommendations:');
      this.warnings.forEach(warn => console.log(`   • Address: ${warn}`));
      console.log('');
    }
  }

  async run() {
    console.log('\n🏥 Knowledge Base System Health Check\n');
    console.log('='.repeat(60));

    await this.checkDatabase();
    await this.checkQdrant();
    await this.checkOpenAI();
    await this.checkS3();
    await this.checkProcessingQueue();

    this.printSummary();

    return this.errors.length === 0;
  }
}

async function main() {
  const checker = new SystemHealthChecker();
  const healthy = await checker.run();
  process.exit(healthy ? 0 : 1);
}

main().catch(error => {
  console.error('\n❌ Health check failed:', error.message);
  process.exit(1);
});
