/**
 * Script to manually add knowledge to CMO Knowledge Base
 */

import { cmoKnowledgeBase } from '../services/cmo/CMOKnowledgeBase.js';

async function addMarketingKnowledge() {
  console.log('📚 Adding marketing knowledge to CMO Knowledge Base...\n');
  
  try {
    // Initialize the knowledge base
    await cmoKnowledgeBase.initialize();
    
    // Add SEO Knowledge
    console.log('Adding SEO knowledge...');
    
    await cmoKnowledgeBase.addKnowledge('seo', {
      type: 'guide',
      topic: 'technical_seo',
      title: 'Core Web Vitals Optimization',
      content: 'Core Web Vitals are Google\'s metrics for page experience, focusing on loading, interactivity, and visual stability.',
      guidelines: [
        'Largest Contentful Paint (LCP): Should occur within 2.5 seconds',
        'First Input Delay (FID): Should be less than 100 milliseconds',
        'Cumulative Layout Shift (CLS): Should be less than 0.1',
        'Use PageSpeed Insights to measure',
        'Optimize images with next-gen formats',
        'Minimize JavaScript execution time'
      ],
      metadata: {
        source: 'manual-addition',
        priority: 'high'
      }
    });
    
    await cmoKnowledgeBase.addKnowledge('seo', {
      type: 'tool',
      topic: 'technical_seo',
      title: 'Robots.txt Generator',
      description: 'Generate a properly formatted robots.txt file',
      template: `User-agent: *
Disallow: /admin/
Disallow: /private/
Sitemap: {{sitemap_url}}

User-agent: Googlebot
Crawl-delay: 0

User-agent: Bingbot
Crawl-delay: 1`,
      tips: [
        'Place robots.txt in your root directory',
        'Test with Google Search Console',
        'Don\'t block CSS/JS files needed for rendering',
        'Include sitemap location'
      ]
    });
    
    // Add Email Knowledge
    console.log('\nAdding Email knowledge...');
    
    await cmoKnowledgeBase.addKnowledge('email', {
      type: 'checklist',
      topic: 'deliverability',
      title: 'Email Deliverability Checklist',
      description: 'Ensure your emails reach the inbox, not spam',
      items: [
        'Authenticate with SPF, DKIM, and DMARC',
        'Warm up new IP addresses gradually',
        'Maintain list hygiene (remove bounces, inactives)',
        'Use double opt-in for new subscribers',
        'Monitor sender reputation',
        'Avoid spam trigger words',
        'Include unsubscribe link',
        'Test with mail-tester.com',
        'Monitor blacklists regularly',
        'Segment engaged vs unengaged users'
      ],
      metadata: {
        importance: 'critical',
        updated: new Date().toISOString()
      }
    });
    
    // Add Social Media Knowledge
    console.log('\nAdding Social Media knowledge...');
    
    await cmoKnowledgeBase.addKnowledge('social', {
      type: 'template',
      topic: 'content_creation',
      title: 'Viral Post Formulas',
      description: 'Proven formulas for high-engagement social posts',
      templates: [
        {
          name: 'The Comparison',
          pattern: '{{Option_A}} vs {{Option_B}}\n\nWhich one are you? 🤔\n\n{{Description_A}}\nvs\n{{Description_B}}\n\nComment below! 👇',
          example: '☕ Coffee vs 🍵 Tea\n\nWhich one are you? 🤔\n\nTeam Coffee: Needs that caffeine kick\nvs\nTeam Tea: Prefers a calm start\n\nComment below! 👇'
        },
        {
          name: 'The Challenge',
          pattern: '{{Number}}-Day {{Topic}} Challenge! 💪\n\nWho\'s in?\n\nDay 1: {{Action_1}}\nDay 2: {{Action_2}}\n...\n\nDrop a {{Emoji}} if you\'re joining!',
          example: '7-Day Gratitude Challenge! 💪\n\nWho\'s in?\n\nDay 1: Write 3 things you\'re grateful for\nDay 2: Thank someone who helped you\n...\n\nDrop a ❤️ if you\'re joining!'
        }
      ]
    });
    
    // Add PPC/Ads Knowledge
    console.log('\nAdding Ads knowledge...');
    
    await cmoKnowledgeBase.addKnowledge('ads', {
      type: 'reference',
      topic: 'google_ads',
      title: 'Google Ads Quality Score Factors',
      content: 'Quality Score affects your ad rank and cost-per-click',
      factors: {
        'Expected CTR': {
          weight: '~40%',
          improve: 'Write compelling ad copy, use ad extensions'
        },
        'Ad Relevance': {
          weight: '~30%',
          improve: 'Match keywords to ad copy closely'
        },
        'Landing Page Experience': {
          weight: '~30%',
          improve: 'Fast load time, relevant content, mobile-friendly'
        }
      },
      scoring: {
        '1-3': 'Poor - Significant improvements needed',
        '4-6': 'Average - Room for optimization',
        '7-10': 'Good - Well-optimized'
      }
    });
    
    // Add Direct Mail Knowledge
    console.log('\nAdding Direct Mail knowledge...');
    
    await cmoKnowledgeBase.addKnowledge('direct-mail', {
      type: 'guide',
      topic: 'postcard_design',
      title: 'High-Converting Postcard Design',
      content: 'Design principles for direct mail postcards that get results',
      principles: [
        'Use high-contrast colors for visibility',
        'Keep headline under 7 words',
        'Include one clear CTA',
        'Use both sides effectively',
        'Add personalization (name, location)',
        'Include trackable phone number or QR code'
      ],
      sizes: {
        'Standard': '4.25" x 6"',
        'Large': '6" x 9"',
        'Jumbo': '6" x 11"'
      },
      usps_tips: [
        'Leave 4" x 2.375" clear for address area',
        'Maintain 0.125" quiet zone on all edges',
        'Use USPS-approved indicia for bulk mail'
      ]
    });
    
    // Get statistics
    const stats = cmoKnowledgeBase.getStats();
    
    console.log('\n✅ Knowledge added successfully!');
    console.log('\n📊 Updated Knowledge Base Statistics:');
    console.log(`Total items: ${stats.totalItems}`);
    
    for (const [category, categoryStats] of Object.entries(stats.categories)) {
      console.log(`\n${category}: ${categoryStats.count} items`);
    }
    
  } catch (error) {
    console.error('❌ Error adding knowledge:', error);
  }
}

// Run the script
addMarketingKnowledge();