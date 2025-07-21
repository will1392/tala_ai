/**
 * Session-based Gmail Service
 * Stores Gmail connections in Express session
 */

class SessionGmailService {
  constructor() {
    // Store connections in session
  }

  /**
   * Store Gmail connection in session
   */
  storeConnection(req, connectionData) {
    if (!req.session) {
      console.warn('No session available, connection will not persist');
      return;
    }
    
    req.session.gmailConnection = {
      email: connectionData.email,
      connectedAt: new Date(),
      userInfo: connectionData.userInfo
    };
    
    console.log('✅ Gmail connection stored in session:', connectionData.email);
  }

  /**
   * Get Gmail connection from session
   */
  getConnection(req) {
    if (!req.session || !req.session.gmailConnection) {
      return null;
    }
    
    return req.session.gmailConnection;
  }

  /**
   * Check if Gmail is connected
   */
  isConnected(req) {
    return !!(req.session && req.session.gmailConnection);
  }

  /**
   * Disconnect Gmail
   */
  disconnect(req) {
    if (req.session && req.session.gmailConnection) {
      delete req.session.gmailConnection;
      console.log('✅ Gmail disconnected from session');
    }
  }

  /**
   * Get status for API response
   */
  getStatus(req) {
    const connection = this.getConnection(req);
    
    if (!connection) {
      return {
        connected: false,
        accounts: []
      };
    }
    
    return {
      connected: true,
      accounts: [{
        email: connection.email,
        connectedAt: connection.connectedAt,
        picture: connection.userInfo?.picture
      }]
    };
  }
}

// Export singleton instance
const sessionGmailService = new SessionGmailService();
export default sessionGmailService;