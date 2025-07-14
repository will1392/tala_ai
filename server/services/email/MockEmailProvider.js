/**
 * Mock Email Provider
 * 
 * For testing email integration without real email accounts
 */

import { v4 as uuidv4 } from 'uuid';

class MockEmailProvider {
  constructor() {
    this.messages = this.generateMockMessages();
  }

  /**
   * Generate mock email messages
   */
  generateMockMessages() {
    const subjects = [
      'Hotel Booking Confirmation - Paradise Resort',
      'Flight Itinerary for Your Trip to Bali',
      'Question about tour packages',
      'Newsletter: Top 10 Destinations for 2024',
      'Receipt for your booking #12345',
      'Meeting invitation: Travel Planning Session',
      'Inquiry about group discounts',
      'Your visa application status update'
    ];

    const senders = [
      'booking@paradiseresort.com',
      'noreply@airlines.com',
      'john.doe@gmail.com',
      'newsletter@travelagency.com',
      'payments@bookingsite.com',
      'calendar@company.com',
      'sarah.smith@outlook.com',
      'visa@embassy.gov'
    ];

    const messages = [];
    const now = new Date();

    for (let i = 0; i < 25; i++) {
      const date = new Date(now.getTime() - i * 3600000 * 24); // Each message 1 day older
      const isUnread = i < 5; // First 5 messages are unread
      
      messages.push({
        id: `mock-${uuidv4()}`,
        threadId: `thread-${Math.floor(i / 3)}`, // Group some messages in threads
        subject: subjects[i % subjects.length],
        from: senders[i % senders.length],
        to: 'user@travelagency.com',
        date: date.toISOString(),
        snippet: `This is a preview of the email content for ${subjects[i % subjects.length]}...`,
        labelIds: isUnread ? ['INBOX', 'UNREAD'] : ['INBOX'],
        isUnread,
        hasAttachments: i % 4 === 0, // Every 4th message has attachments
        body: this.generateMockBody(subjects[i % subjects.length], i),
        htmlBody: this.generateMockHtmlBody(subjects[i % subjects.length], i)
      });
    }

    return messages;
  }

  /**
   * Generate mock email body
   */
  generateMockBody(subject, index) {
    const bodies = {
      'Hotel Booking Confirmation - Paradise Resort': `
Dear Guest,

Your booking at Paradise Resort has been confirmed!

Booking Details:
- Check-in: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
- Check-out: ${new Date(Date.now() + 33 * 24 * 60 * 60 * 1000).toLocaleDateString()}
- Room Type: Deluxe Ocean View
- Guests: 2 Adults
- Total Amount: $1,200

Confirmation Number: PR-2024-${1000 + index}

We look forward to welcoming you!

Best regards,
Paradise Resort Team`,
      'Flight Itinerary for Your Trip to Bali': `
Flight Confirmation

Passenger: John Doe
Booking Reference: ABC${123 + index}

Outbound Flight:
- Date: ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
- Flight: GA 123
- Route: LAX → DPS
- Departure: 11:30 PM
- Arrival: 7:45 AM (+2 days)

Return Flight:
- Date: ${new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toLocaleDateString()}
- Flight: GA 124
- Route: DPS → LAX
- Departure: 10:15 AM
- Arrival: 8:30 AM (same day)

Please arrive at the airport 3 hours before international flights.`,
      'Question about tour packages': `
Hi there,

I'm interested in your Bali tour packages for next month. Could you please provide:
- Available dates
- Group sizes
- What's included in the package
- Pricing for 2 people

Also, do you offer any adventure activities like diving or hiking?

Thanks!
John`,
      'Newsletter: Top 10 Destinations for 2024': `
Discover the hottest travel destinations for 2024!

1. Japan - Cherry blossom season awaits
2. Iceland - Northern lights and hot springs
3. New Zealand - Adventure capital
4. Portugal - Hidden gems of Europe
5. Costa Rica - Eco-tourism paradise
6. Morocco - Exotic culture and cuisine
7. Greece - Island hopping adventures
8. Peru - Machu Picchu and beyond
9. Norway - Fjords and midnight sun
10. Vietnam - Culture and culinary delights

Book your next adventure with us and get 15% off!
Use code: EXPLORE2024

Happy travels!`
    };

    return bodies[subject] || `This is the email body for: ${subject}\n\nMessage ID: ${index}`;
  }

  /**
   * Generate mock HTML body
   */
  generateMockHtmlBody(subject, index) {
    const body = this.generateMockBody(subject, index);
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            ${body.split('\n').map(line => `<p>${line}</p>`).join('')}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get inbox messages
   */
  async getInbox(options = {}) {
    const { maxResults = 20, pageToken = 0, query = '' } = options;
    
    let filtered = this.messages;
    
    // Apply search query
    if (query) {
      // Handle special queries
      if (query === 'in:inbox') {
        // All messages are in inbox by default
        filtered = this.messages.filter(msg => msg.labelIds.includes('INBOX'));
      } else if (query.includes('is:unread')) {
        filtered = filtered.filter(msg => msg.isUnread);
      } else {
        // Regular text search
        const searchLower = query.toLowerCase();
        filtered = filtered.filter(msg => 
          msg.subject.toLowerCase().includes(searchLower) ||
          msg.from.toLowerCase().includes(searchLower) ||
          msg.snippet.toLowerCase().includes(searchLower)
        );
      }
    }
    
    // Paginate
    const start = parseInt(pageToken) || 0;
    const end = start + maxResults;
    const page = filtered.slice(start, end);
    
    return {
      messages: page,
      nextPageToken: end < filtered.length ? String(end) : null,
      resultSizeEstimate: filtered.length
    };
  }

  /**
   * Get single message
   */
  async getMessage(messageId) {
    const message = this.messages.find(m => m.id === messageId);
    if (!message) {
      throw new Error('Message not found');
    }
    
    // Add attachments for messages that have them
    if (message.hasAttachments) {
      message.attachments = [
        {
          filename: 'booking-confirmation.pdf',
          mimeType: 'application/pdf',
          size: 245000,
          attachmentId: `attach-${messageId}-1`
        },
        {
          filename: 'hotel-photo.jpg',
          mimeType: 'image/jpeg',
          size: 1250000,
          attachmentId: `attach-${messageId}-2`
        }
      ];
    }
    
    return message;
  }

  /**
   * Modify message (mark read/unread, etc.)
   */
  async modifyMessage(messageId, modifications) {
    const message = this.messages.find(m => m.id === messageId);
    if (!message) {
      throw new Error('Message not found');
    }
    
    const { addLabelIds = [], removeLabelIds = [] } = modifications;
    
    // Handle label changes
    removeLabelIds.forEach(label => {
      message.labelIds = message.labelIds.filter(l => l !== label);
      if (label === 'UNREAD') {
        message.isUnread = false;
      }
    });
    
    addLabelIds.forEach(label => {
      if (!message.labelIds.includes(label)) {
        message.labelIds.push(label);
      }
      if (label === 'UNREAD') {
        message.isUnread = true;
      }
    });
    
    return { success: true };
  }

  /**
   * Search messages
   */
  async searchMessages(query, limit = 20) {
    return this.getInbox({ maxResults: limit, query });
  }

  /**
   * Send message (mock)
   */
  async sendMessage(message) {
    const newMessage = {
      id: `mock-${uuidv4()}`,
      threadId: `thread-new-${Date.now()}`,
      subject: message.subject,
      from: 'user@travelagency.com',
      to: message.to,
      date: new Date().toISOString(),
      snippet: message.body.substring(0, 100) + '...',
      labelIds: ['SENT'],
      isUnread: false,
      hasAttachments: false,
      body: message.body,
      htmlBody: `<p>${message.body}</p>`
    };
    
    this.messages.unshift(newMessage);
    return newMessage;
  }
}

// Export singleton instance
const mockEmailProvider = new MockEmailProvider();
export default mockEmailProvider;