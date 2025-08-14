/**
 * Chat Status Route - Server-Sent Events for real-time status updates
 */

import express from 'express';

const router = express.Router();

// Store active SSE connections
const connections = new Map();

/**
 * SSE endpoint for status updates
 */
router.get('/stream/:requestId', (req, res) => {
  const { requestId } = req.params;
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Store connection
  connections.set(requestId, res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', requestId })}\n\n`);
  
  // Clean up on disconnect
  req.on('close', () => {
    connections.delete(requestId);
  });
});

/**
 * Send status update to a specific request
 */
export function sendStatusUpdate(requestId, status) {
  const connection = connections.get(requestId);
  if (connection) {
    const data = JSON.stringify({
      type: 'status',
      status,
      timestamp: new Date().toISOString()
    });
    connection.write(`data: ${data}\n\n`);
  }
}

/**
 * Send progress update with details
 */
export function sendProgressUpdate(requestId, stage, details = {}) {
  const connection = connections.get(requestId);
  if (connection) {
    const data = JSON.stringify({
      type: 'progress',
      stage,
      details,
      timestamp: new Date().toISOString()
    });
    connection.write(`data: ${data}\n\n`);
  }
}

/**
 * Complete the status stream
 */
export function completeStatusStream(requestId) {
  const connection = connections.get(requestId);
  if (connection) {
    connection.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    setTimeout(() => {
      connections.delete(requestId);
    }, 1000);
  }
}

export default router;