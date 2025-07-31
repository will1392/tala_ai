/**
 * Direct Mail Response Templates
 * 
 * Context-aware response templates for direct mail marketing queries
 */

export const directMailTemplates = {
  // Intent-based templates
  intents: {
    create: {
      title: 'Creating Direct Mail Campaign',
      template: `Let's design your {mailType} direct mail campaign for maximum impact.

**Campaign Details:**
- **Mail Piece**: {mailType}
- **Quantity**: {quantity} pieces
- **Target Audience**: {audience}
- **Budget**: {budget} ({costPerPiece}/piece)

**Design Elements:**
- **Size/Format**: {format}
- **Paper Stock**: {paperStock}
- **Colors**: {colors}
- **Special Features**: {specialFeatures}

**Messaging Strategy:**
{headline}
{mainCopy}
{offer}
{callToAction}

**Personalization:**
{personalizationElements}

**Tracking Methods:**
- QR Code: {qrCodeStrategy}
- PURL: {purlStrategy}
- Phone tracking: {phoneTracking}

**Mailing Strategy:**
- Drop date: {dropDate}
- Expected delivery: {deliveryWindow}

{examples}`,
      variables: ['mailType', 'quantity', 'audience', 'budget', 'costPerPiece', 'format', 'paperStock', 'colors', 'specialFeatures', 'headline', 'mainCopy', 'offer', 'callToAction', 'personalizationElements', 'qrCodeStrategy', 'purlStrategy', 'phoneTracking', 'dropDate', 'deliveryWindow', 'examples']
    },

    optimize: {
      title: 'Direct Mail Optimization',
      template: `Let's optimize your direct mail {optimizationFocus} for better ROI.

**Current Performance:**
- Response Rate: {currentResponse} (Industry avg: {industryResponse})
- Conversion Rate: {conversionRate}
- Cost per Acquisition: {cpa}
- ROI: {roi}

**Optimization Opportunities:**
{opportunities}

**Testing Recommendations:**
1. **Format Test**: {formatTest}
2. **Offer Test**: {offerTest}
3. **Creative Test**: {creativeTest}

**List Optimization:**
{listStrategy}

**Cost Reduction Strategies:**
{costStrategies}

**Expected Improvements:**
- Response Rate: +{responseImprovement}%
- CPA Reduction: -{cpaReduction}%
- ROI Increase: +{roiIncrease}%

{benchmarks}`,
      variables: ['optimizationFocus', 'currentResponse', 'industryResponse', 'conversionRate', 'cpa', 'roi', 'opportunities', 'formatTest', 'offerTest', 'creativeTest', 'listStrategy', 'costStrategies', 'responseImprovement', 'cpaReduction', 'roiIncrease', 'benchmarks']
    },

    analyze: {
      title: 'Direct Mail Campaign Analysis',
      template: `Analysis of your {campaignName} direct mail campaign:

**Campaign Overview:**
- Pieces Mailed: {quantity}
- Delivery Rate: {deliveryRate}%
- Total Cost: {totalCost}

**Response Metrics:**
- Responses: {responses} ({responseRate}%)
- Conversions: {conversions} ({conversionRate}%)
- Revenue Generated: {revenue}
- ROI: {roi} ({roiPercentage}%)

**Geographic Performance:**
{geoAnalysis}

**Demographic Insights:**
{demoAnalysis}

**Creative Performance:**
{creativeAnalysis}

**What Worked:**
{successFactors}

**Areas for Improvement:**
{improvements}

**Next Campaign Recommendations:**
{recommendations}`,
      variables: ['campaignName', 'quantity', 'deliveryRate', 'totalCost', 'responses', 'responseRate', 'conversions', 'conversionRate', 'revenue', 'roi', 'roiPercentage', 'geoAnalysis', 'demoAnalysis', 'creativeAnalysis', 'successFactors', 'improvements', 'recommendations']
    }
  },

  // Mail piece types
  mailTypes: {
    postcard: {
      sizes: ['4"x6"', '5"x7"', '6"x9"', '6"x11"'],
      benefits: ['Lower cost', 'No envelope needed', 'Immediate visibility'],
      bestFor: ['Announcements', 'Sales/promotions', 'Event invitations'],
      responseRates: {
        b2c: '2.5-3.5%',
        b2b: '1.5-2.5%'
      }
    },

    letter: {
      sizes: ['#10 envelope', '6"x9" envelope', '9"x12" envelope'],
      benefits: ['More space for messaging', 'Professional appearance', 'Can include inserts'],
      bestFor: ['Complex offers', 'High-value products', 'Fundraising'],
      responseRates: {
        b2c: '3-5%',
        b2b: '2-4%'
      }
    },

    selfMailer: {
      sizes: ['8.5"x11" folded', '11"x17" folded', 'Custom sizes'],
      benefits: ['No envelope cost', 'Larger canvas', 'Creative formats'],
      bestFor: ['Catalogs', 'Newsletters', 'Multi-offer promotions'],
      responseRates: {
        b2c: '2-3%',
        b2b: '1.5-2.5%'
      }
    },

    dimensional: {
      types: ['Boxes', 'Tubes', 'Unusual shapes'],
      benefits: ['Nearly 100% open rate', 'Memorable impact', 'Pass-along value'],
      bestFor: ['High-value prospects', 'Product launches', 'VIP customers'],
      responseRates: {
        general: '5-8.5%'
      }
    }
  },

  // Quick answer templates
  quickAnswers: {
    responseRates: {
      question: 'response rate',
      answer: 'Average direct mail response rates:\n\n**Consumer Lists**: 2.5-3.5%\n**House Lists**: 5-7%\n**B2B**: 2-3%\n**Dimensional Mail**: 5-8.5%\n\n**Factors affecting response:**\n- List quality (40%)\n- Offer (40%)\n- Creative (20%)'
    },

    costCalculation: {
      question: 'direct mail cost',
      answer: 'Direct mail costs breakdown:\n\n**Components:**\n- Printing: $0.10-0.50/piece\n- List rental: $0.05-0.20/name\n- Postage: $0.30-0.60/piece\n- Design: $500-2,000 one-time\n\n**Total**: $0.50-1.50/piece typical\n\n**ROI Target**: $1.20-1.50 return per $1 spent'
    },

    listHygiene: {
      question: 'mailing list',
      answer: 'Mailing list best practices:\n\n**List Hygiene:**\n- NCOA update (monthly)\n- CASS certification\n- Remove duplicates\n- Suppress deceased\n\n**Segmentation:**\n- RFM (Recency, Frequency, Monetary)\n- Demographics\n- Geographic\n- Behavioral'
    }
  },

  // Design best practices
  design: {
    hierarchy: {
      principle: '40-40-20 Rule',
      breakdown: {
        'Audience': '40% of success',
        'Offer': '40% of success',
        'Creative': '20% of success'
      }
    },

    elements: {
      headline: ['Clear value proposition', '3-7 words ideal', 'Benefits-focused'],
      offer: ['Time-limited', 'Exclusive feel', 'Easy to understand'],
      cta: ['Action-oriented', 'Stand out visually', 'Repeat 2-3 times'],
      personalization: ['Name in 2+ places', 'Relevant imagery', 'Custom offers']
    },

    testing: {
      formats: ['Size variations', 'Color vs B&W', 'Photo vs illustration'],
      copy: ['Headline options', 'Offer presentation', 'CTA wording'],
      lists: ['Demographics', 'Geographics', 'Behavioral segments']
    }
  },

  // Expertise variations
  expertise: {
    beginner: {
      prefix: "Direct mail basics explained:\n\n",
      suffix: "\n\n📮 **Start Simple**: Test with postcards before complex formats.",
      focus: ['understanding costs', 'basic design', 'measuring response']
    },

    intermediate: {
      prefix: "Strategic direct mail approach:\n\n",
      suffix: "\n\n📊 **Next Level**: Integrate QR codes and PURLs for digital tracking.",
      focus: ['list segmentation', 'A/B testing', 'multi-touch campaigns']
    },

    expert: {
      prefix: "Advanced direct mail strategies:\n\n",
      suffix: "\n\n🎯 **Pro Tactic**: Use predictive modeling and trigger-based automation.",
      focus: ['predictive analytics', 'omnichannel integration', 'lifetime value optimization']
    }
  },

  // Metrics and benchmarks
  metrics: {
    byIndustry: {
      'Retail': { responseRate: '3.1%', roi: '$1.24' },
      'Financial': { responseRate: '4.5%', roi: '$1.38' },
      'Nonprofit': { responseRate: '5.1%', roi: '$1.42' },
      'Healthcare': { responseRate: '3.8%', roi: '$1.31' },
      'B2B': { responseRate: '2.9%', roi: '$1.27' }
    },
    postal: {
      'First-Class': { delivery: '1-5 days', cost: 'Higher', tracking: 'Available' },
      'Standard Mail': { delivery: '3-10 days', cost: 'Lower', tracking: 'Limited' },
      'EDDM': { delivery: '1-2 days', cost: 'Lowest', tracking: 'None' }
    }
  }
};

/**
 * Get mail piece specifications
 */
export function getMailPieceSpecs(mailType) {
  return directMailTemplates.mailTypes[mailType.toLowerCase()] || null;
}

/**
 * Calculate direct mail ROI
 */
export function calculateDirectMailROI(revenue, totalCost) {
  if (!totalCost || totalCost === 0) return 0;
  const roi = ((revenue - totalCost) / totalCost * 100).toFixed(2);
  return {
    percentage: roi + '%',
    ratio: (revenue / totalCost).toFixed(2) + ':1'
  };
}