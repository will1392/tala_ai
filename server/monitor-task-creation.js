#!/usr/bin/env node

/**
 * Monitor task creation in real-time
 * This script shows what's happening during task creation via chat
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'task-creation-monitor.log');

// Clear previous log
fs.writeFileSync(logFile, `=== Task Creation Monitor Started at ${new Date().toISOString()} ===\n`);

console.log('🔍 Monitoring task creation process...');
console.log(`📝 Logs will be saved to: ${logFile}`);
console.log('');

// Patterns to look for
const patterns = [
  // User ID resolution
  /Original userId: (.+)/,
  /Resolved to UUID: (.+)/,
  /Updating TaskManager userId from (.+) to (.+)/,
  
  // Task creation process
  /Creating new task/,
  /Task object: (.+)/,
  /Creating task in Supabase: (.+)/,
  /Task created in Supabase: (.+)/,
  /Supabase task creation error: (.+)/,
  
  // Agent routing
  /Task analysis: type=(.+), complexity=(.+)/,
  /Routing strategy: (.+)/,
  /Executing with single agent: (.+)/,
  /Task Creator Agent executing task: (.+)/,
  
  // Intelligence system
  /Intelligent chat request from user (.+)/,
  /User profile loaded: (.+)/,
  
  // Errors
  /Error: (.+)/,
  /Failed to create task: (.+)/,
  /Task creation error: (.+)/
];

// Function to check if a line matches any pattern
function checkLine(line) {
  for (const pattern of patterns) {
    if (pattern.test(line)) {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${line}`;
      
      // Write to file
      fs.appendFileSync(logFile, logEntry + '\n');
      
      // Print to console with color
      if (line.includes('Error') || line.includes('error') || line.includes('Failed')) {
        console.log('\x1b[31m%s\x1b[0m', logEntry); // Red
      } else if (line.includes('✅') || line.includes('Success')) {
        console.log('\x1b[32m%s\x1b[0m', logEntry); // Green
      } else if (line.includes('UUID') || line.includes('userId')) {
        console.log('\x1b[33m%s\x1b[0m', logEntry); // Yellow
      } else {
        console.log('\x1b[36m%s\x1b[0m', logEntry); // Cyan
      }
      
      return true;
    }
  }
  return false;
}

// Monitor multiple log files
const logFiles = [
  'server.log',
  'server-new.log',
  'server-restart.log'
];

// Tail each log file
logFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (fs.existsSync(filePath)) {
    console.log(`📄 Monitoring ${file}...`);
    
    const tail = spawn('tail', ['-f', filePath]);
    
    tail.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          checkLine(line);
        }
      });
    });
    
    tail.stderr.on('data', (data) => {
      console.error(`Error tailing ${file}: ${data}`);
    });
  }
});

// Also monitor console output directly
console.log('\n🎯 Ready to monitor task creation. Try creating a task via chat!\n');
console.log('Example messages to test:');
console.log('- "Create a task to buy groceries"');
console.log('- "Add a reminder to call mom tomorrow"');
console.log('- "Make a todo for project deadline next week"');
console.log('\nPress Ctrl+C to stop monitoring.\n');

// Handle exit
process.on('SIGINT', () => {
  console.log('\n\n📊 Monitoring stopped.');
  console.log(`📝 Full log saved to: ${logFile}`);
  process.exit(0);
});