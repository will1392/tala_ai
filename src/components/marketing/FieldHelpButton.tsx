/**
 * FieldHelpButton - Interactive "Not Sure?" button with popup explanations
 * Replaces TalaFieldAssistant with a simpler, faster help system
 */

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { HelpCircle, X, Info } from 'lucide-react';

interface FieldHelpContent {
  title: string;
  explanation: string;
  examples?: string[];
  tips?: string[];
}

// Help content for each field
const FIELD_HELP_CONTENT: Record<string, FieldHelpContent> = {
  travel_specialty: {
    title: "Choosing Your Travel Specialty",
    explanation: "Select the type of travel that makes up the majority of your bookings or the area where you have the most expertise. This helps us tailor your direct mail campaign to attract the right clients.",
    examples: [
      "Luxury Cruises - High-end ocean and expedition cruises",
      "River Cruises - European, Asian, or American river journeys",
      "All-Inclusive Resorts - Caribbean, Mexico, etc.",
      "Guided Tours - Escorted group travel experiences"
    ],
    tips: [
      "Choose your primary specialty even if you book other types",
      "Think about where you make the most profit",
      "Consider what your current clients know you for"
    ]
  },
  business_goals: {
    title: "Setting Your Business Goals",
    explanation: "Your goals help us design a campaign that delivers real results. Be specific about what success looks like for your agency.",
    examples: [
      "Grow from $300k to $500k in annual bookings",
      "Book 10 more river cruises per month",
      "Fill slow season (Oct-Feb) with 20+ bookings monthly",
      "Attract 25 new luxury clients this year"
    ],
    tips: [
      "Include specific numbers when possible",
      "Set a realistic timeframe (6-12 months)",
      "Focus on what matters most to your business",
      "Think revenue, bookings, or client count"
    ]
  },
  target_audience: {
    title: "Identifying Your Target Audience",
    explanation: "The more specific you are about your ideal client, the better we can target your direct mail campaign for maximum response.",
    examples: [
      "Retired couples 55-70 who take 2+ luxury trips annually",
      "Professional women 35-50 interested in wellness retreats",
      "Empty nesters seeking adventure travel experiences",
      "Affluent families looking for multi-generational trips"
    ],
    tips: [
      "Think about your best current clients",
      "Include age range and lifestyle details",
      "Consider income level and travel frequency",
      "Be specific but not too narrow"
    ]
  },
  campaign_budget: {
    title: "Selecting Your Campaign Budget",
    explanation: "Your budget determines how many potential clients we can reach. Direct mail has predictable costs and measurable results.",
    examples: [
      "$2,500-$5,000 = 2,500-5,000 postcards (good for testing)",
      "$5,000-$10,000 = 5,000-10,000 postcards (solid campaign)",
      "$10,000+ = 10,000+ postcards (maximum impact)"
    ],
    tips: [
      "Start with what you're comfortable investing",
      "Consider the lifetime value of a new client",
      "Factor in design and mailing costs",
      "You can always scale up based on results"
    ]
  },
  compelling_offer: {
    title: "Creating a Compelling Offer",
    explanation: "Your offer is what motivates recipients to take action. The best offers provide value without eating into your profits.",
    examples: [
      "Free airport transfers on European river cruises",
      "Complimentary room upgrade (subject to availability)",
      "$100 onboard credit for new clients",
      "Exclusive access to group departure dates"
    ],
    tips: [
      "Offer something valuable but cost-effective",
      "Create urgency with a deadline",
      "Make it exclusive to direct mail recipients",
      "Ensure you can fulfill the offer"
    ]
  },
  mailing_timeframe: {
    title: "Choosing Your Mailing Timeframe",
    explanation: "Timing impacts response rates. Consider when your audience plans trips and when you need the business.",
    examples: [
      "January - Wave Season for cruise bookings",
      "September - Fall planning for winter escapes",
      "March-April - Summer vacation planning",
      "October - Early bird holiday travel"
    ],
    tips: [
      "Mail 60-90 days before peak booking periods",
      "Avoid major holidays when mail gets lost",
      "Consider your slow seasons",
      "Allow time for design and printing"
    ]
  },
  campaign_name: {
    title: "Naming Your Campaign",
    explanation: "A clear campaign name helps you track and manage your marketing efforts.",
    examples: [
      "Spring 2024 Luxury Cruise Promotion",
      "Winter Europe River Cruise Special",
      "Fall Caribbean All-Inclusive Campaign",
      "Summer Alaska Adventure Mailer"
    ],
    tips: [
      "Include the season/year for tracking",
      "Mention your main offer or destination",
      "Keep it concise but descriptive",
      "Use names you'll remember later"
    ]
  },
  // Section 1: Business & Marketing Objectives
  previous_direct_mail: {
    title: "Previous Direct Mail Experience",
    explanation: "Have you used direct mail marketing before? Your experience helps us tailor recommendations.",
    examples: ["Yes - I've sent postcards or brochures", "No - This would be my first campaign"],
    tips: ["Be honest about your experience", "Previous results help inform strategy"]
  },
  previous_results: {
    title: "Previous Campaign Results",
    explanation: "Share what happened with your past direct mail efforts.",
    examples: [
      "Generated 15 new bookings from 5,000 postcards",
      "2% response rate with $50,000 in bookings",
      "Mixed results - some inquiries but few bookings"
    ],
    tips: ["Include specific numbers if you have them", "Even unsuccessful campaigns provide valuable insights"]
  },
  primary_campaign_goal: {
    title: "Primary Campaign Goal",
    explanation: "What's the main thing you want this campaign to achieve?",
    examples: [
      "Generate New Leads",
      "Reactivate Past Clients", 
      "Promote Specific Destinations",
      "Fill Group Departures",
      "Build Brand Awareness"
    ],
    tips: ["Choose the goal that matters most", "This shapes your entire campaign strategy"]
  },

  // Section 2: Target Audience Discovery
  ideal_client: {
    title: "Describing Your Ideal Client",
    explanation: "Paint a picture of the perfect customer for your travel services.",
    examples: [
      "Retired couples who love luxury cruises and have time to travel",
      "Busy professionals seeking stress-free all-inclusive vacations",
      "Adventure-seeking empty nesters with disposable income"
    ],
    tips: [
      "Be specific about demographics and lifestyle",
      "Think about your most profitable clients",
      "Consider both who they are and what they want"
    ]
  },
  audience_type: {
    title: "Audience Type Selection",
    explanation: "Who should receive your direct mail piece?",
    examples: [
      "Past Clients - People who've booked with you before",
      "Lookalike Prospects - Similar to your best clients",
      "Geographic Targeting - Specific neighborhoods",
      "Interest-Based - Cruise enthusiasts, luxury travelers"
    ],
    tips: ["Past clients often have the highest response rates", "New prospects help grow your business"]
  },
  demographics: {
    title: "Demographic Details",
    explanation: "Specific characteristics help us target the right households.",
    tips: ["These details improve mailing list accuracy", "Better targeting means higher response rates"]
  },
  age_range: {
    title: "Selecting Age Range",
    explanation: "What age group best represents your ideal clients?",
    examples: ["55-64 - Peak travel years", "65+ - Retirees with time", "45-54 - High earners"],
    tips: ["Consider who has both time and money", "Different ages prefer different destinations"]
  },
  income_level: {
    title: "Household Income Level",
    explanation: "Income level helps ensure recipients can afford your services.",
    examples: [
      "$75,000-$100,000 - Middle market travelers",
      "$100,000-$150,000 - Premium travel budget",
      "$150,000+ - Luxury travel buyers"
    ],
    tips: ["Match income to your average booking value", "Higher income areas often yield better results"]
  },
  location: {
    title: "Geographic Location",
    explanation: "Where do your best clients live?",
    examples: ["Within 25 miles of my office", "Specific zip codes", "Entire metro area"],
    tips: ["Closer often means higher response", "Consider drive time to your office"]
  },
  mailing_list: {
    title: "Mailing List Strategy",
    explanation: "How will you get addresses for your campaign?",
    examples: [
      "I have my own client list",
      "I need to purchase a targeted list",
      "Combination of both"
    ],
    tips: ["Your own list usually performs best", "Purchased lists expand your reach"]
  },
  list_size: {
    title: "Estimated List Size",
    explanation: "How many addresses do you expect to mail to?",
    examples: ["500-1,000", "2,500-5,000", "10,000+"],
    tips: ["Bigger isn't always better", "Start with quality over quantity"]
  },

  // Section 3: Offer & Message Strategy
  campaign_offer: {
    title: "Creating Your Campaign Offer",
    explanation: "What incentive will motivate people to contact you?",
    examples: [
      "$100 off per person on European river cruises",
      "Free travel planning consultation ($200 value)",
      "Exclusive group departure with special perks",
      "Complimentary travel protection on bookings over $5,000"
    ],
    tips: [
      "Make it valuable but protect your margins",
      "Time-limited offers create urgency",
      "Exclusive offers feel special"
    ]
  },
  value_proposition: {
    title: "Your Value Proposition",
    explanation: "Why should someone book with you instead of online or with competitors?",
    examples: [
      "Personal expertise from 20+ years of travel experience",
      "24/7 support when things go wrong",
      "Exclusive perks and upgrades from preferred suppliers",
      "Custom itineraries tailored to your interests"
    ],
    tips: [
      "Focus on benefits clients can't get elsewhere",
      "Emphasize personal service and expertise",
      "Show how you save them time and stress"
    ]
  },
  common_objections: {
    title: "Common Client Objections",
    explanation: "What concerns stop people from booking with a travel agent?",
    examples: [
      "It costs more than booking online",
      "I can plan my own trips",
      "I don't know if I can trust an agent",
      "It seems complicated"
    ],
    tips: ["Address objections directly in your messaging", "Turn concerns into selling points"]
  },
  differentiators: {
    title: "What Makes You Different",
    explanation: "What sets you apart from other travel agents?",
    examples: [
      "Certified specialist in luxury cruises",
      "Personally visited 50+ destinations",
      "Exclusive partnerships with top suppliers",
      "Specialized in accessible travel"
    ],
    tips: ["Be specific about your expertise", "Credentials and experience matter"]
  },
  featured_destinations: {
    title: "Featured Destinations",
    explanation: "Which destinations or types of travel will you highlight?",
    examples: [
      "European River Cruises - Rhine, Danube",
      "Alaska Inside Passage Cruises",
      "All-Inclusive Caribbean Resorts",
      "Guided Tours of Italy"
    ],
    tips: ["Feature your most profitable products", "Seasonal relevance increases response"]
  },

  // Section 4: Design & Format
  format_preference: {
    title: "Choosing Your Format",
    explanation: "What type of direct mail piece works best for your message?",
    examples: [
      "Postcard - Simple, cost-effective, high visibility",
      "Letter - More personal, detailed information",
      "Brochure - Showcase multiple offerings"
    ],
    tips: ["Postcards work well for simple offers", "Letters allow for storytelling"]
  },
  design_assets: {
    title: "Design Assets Available",
    explanation: "What materials do you have for the design?",
    examples: [
      "Professional photos from recent trips",
      "Company logo and brand colors",
      "Client testimonials and reviews",
      "Supplier-provided images"
    ],
    tips: ["High-quality images are crucial", "Personal photos build trust"]
  },
  imagery_style: {
    title: "Imagery Style Preference",
    explanation: "What visual style appeals to your target audience?",
    examples: [
      "Luxury/Aspirational - Premium experiences",
      "Authentic/Personal - Real travelers, real experiences",
      "Destination-Focused - Beautiful locations",
      "People-Focused - Happy travelers enjoying trips"
    ],
    tips: ["Match imagery to your brand", "Show experiences, not just places"]
  },
  personalization: {
    title: "Personalization Options",
    explanation: "How personalized should your mail piece be?",
    examples: [
      "Basic - Dear Valued Client",
      "Name only - Dear John,",
      "Full personalization - Reference past trips or interests"
    ],
    tips: ["More personalization usually increases response", "But also increases cost"]
  },
  call_to_action: {
    title: "Call to Action",
    explanation: "What specific action do you want recipients to take?",
    examples: [
      "Call to book your free consultation",
      "Visit our website for exclusive offers",
      "RSVP for our travel presentation night",
      "Email for your personalized quote"
    ],
    tips: ["Make it clear and specific", "One strong CTA is better than multiple weak ones"]
  },

  // Section 5: Timing & Frequency
  arrival_date: {
    title: "Target Arrival Date",
    explanation: "When should your mail piece reach recipients?",
    examples: [
      "January (Wave Season)",
      "September (Fall planning)",
      "60 days before departure dates"
    ],
    tips: ["Allow 2-3 weeks for production and mailing", "Avoid major holidays"]
  },
  seasonal_targeting: {
    title: "Seasonal Considerations",
    explanation: "Are you promoting seasonal travel?",
    examples: [
      "Summer Europe trips - mail in January",
      "Fall foliage cruises - mail in June",
      "Winter escapes - mail in September"
    ],
    tips: ["People book vacations 3-6 months in advance", "Earlier for international or cruises"]
  },
  booking_window: {
    title: "Typical Booking Window",
    explanation: "How far in advance do your clients typically book?",
    examples: [
      "2-3 months for domestic",
      "4-6 months for international",
      "6-12 months for cruises"
    ],
    tips: ["This helps time your mailings", "Luxury travel books further out"]
  },
  campaign_frequency: {
    title: "Campaign Frequency",
    explanation: "How often will you mail to your list?",
    examples: [
      "One-time campaign",
      "Quarterly mailings",
      "Monthly to different segments"
    ],
    tips: ["Consistency builds recognition", "But don't overwhelm recipients"]
  },
  followup_plan: {
    title: "Follow-up Strategy",
    explanation: "How will you follow up with people who respond?",
    examples: [
      "Call within 24 hours",
      "Email drip campaign",
      "Send additional information packet"
    ],
    tips: ["Fast follow-up is crucial", "Have a system ready before mailing"]
  },

  // Section 6: Budget & ROI Expectations
  campaign_budget: {
    title: "Setting Your Campaign Budget",
    explanation: "Your budget determines campaign size and options.",
    examples: [
      "$2,500-$5,000 - Starter campaign (2,500-5,000 pieces)",
      "$5,000-$10,000 - Standard campaign (5,000-10,000 pieces)",
      "$10,000+ - Large campaign (10,000+ pieces)"
    ],
    tips: [
      "Include design, printing, and postage",
      "Start smaller to test effectiveness",
      "Plan for 50¢-$1 per piece all-in"
    ]
  },
  mail_volume: {
    title: "Mail Volume",
    explanation: "How many pieces will you send?",
    examples: ["1,000", "5,000", "10,000"],
    tips: ["Larger volumes reduce per-piece cost", "But start with what you can follow up on"]
  },
  customer_value: {
    title: "Average Customer Value",
    explanation: "What's a typical client worth to your business?",
    examples: [
      "$5,000 - Average booking value",
      "$500 - Commission on average booking",
      "$2,500 - Annual client value"
    ],
    tips: ["Include repeat business value", "This helps calculate ROI"]
  },
  success_metrics: {
    title: "Defining Success",
    explanation: "How will you measure campaign success?",
    examples: [
      "Number of new bookings",
      "Revenue generated",
      "Response rate percentage",
      "Cost per acquisition"
    ],
    tips: ["Set specific, measurable goals", "Track both leads and bookings"]
  },
  tracking_methods: {
    title: "Response Tracking",
    explanation: "How will you know the mail is working?",
    examples: [
      "Unique phone number",
      "Special booking code",
      "Dedicated landing page",
      "Ask how they heard about you"
    ],
    tips: ["Multiple tracking methods are best", "Make it easy to measure results"]
  },

  // Section 7: Campaign Optimization
  response_rate: {
    title: "Response Rate",
    explanation: "What percentage of recipients contacted you?",
    examples: ["0.5%", "1%", "2%"],
    tips: ["1-2% is typical for direct mail", "Your list quality affects this greatly"]
  },
  conversion_rate: {
    title: "Conversion Rate",
    explanation: "What percentage of responses became bookings?",
    examples: ["10%", "20%", "30%"],
    tips: ["This measures your follow-up effectiveness", "Higher value trips may convert lower"]
  },
  roi: {
    title: "Return on Investment",
    explanation: "Revenue generated compared to campaign cost.",
    examples: ["200%", "300%", "500%"],
    tips: ["Include lifetime value, not just first booking", "Factor in all costs"]
  },
  performance_analysis: {
    title: "What Worked Well",
    explanation: "What elements of past campaigns were successful?",
    examples: [
      "Strong offer drove responses",
      "Personalization increased opens",
      "Timing was perfect for bookings"
    ],
    tips: ["Build on what works", "Every campaign teaches something"]
  },
  testing_history: {
    title: "Previous Testing",
    explanation: "What have you tested in past campaigns?",
    examples: [
      "Different offers",
      "Various formats",
      "Multiple headlines",
      "Design variations"
    ],
    tips: ["Testing improves results over time", "Small tests can yield big insights"]
  },
  improvement_areas: {
    title: "Areas for Improvement",
    explanation: "Where could past campaigns have been better?",
    examples: [
      "Better list targeting",
      "Stronger call to action",
      "More compelling offer",
      "Improved follow-up process"
    ],
    tips: ["Honest assessment helps growth", "Every weakness is an opportunity"]
  },

  // Section 8: Logistics & Fulfillment
  design_responsibility: {
    title: "Design Responsibility",
    explanation: "Who will create your mail piece design?",
    examples: [
      "I'll provide ready designs",
      "I need professional design help",
      "I have a designer but need guidance"
    ],
    tips: ["Professional design improves response", "Budget for design if needed"]
  },
  print_partner: {
    title: "Printing Partner",
    explanation: "Do you have a preferred printer?",
    examples: [
      "Yes - I have a relationship",
      "No - Need recommendations",
      "Want to compare options"
    ],
    tips: ["Local printers offer control", "Online services may be cheaper"]
  },
  mail_class: {
    title: "Mail Class Selection",
    explanation: "What postal service level do you need?",
    examples: [
      "Standard Mail - Most economical",
      "First Class - Faster delivery, forwarding",
      "Every Door Direct Mail - Saturation mailing"
    ],
    tips: ["Standard mail is usually sufficient", "First class for time-sensitive offers"]
  },
  list_support: {
    title: "List Building Support",
    explanation: "Do you need help building your mailing list?",
    examples: [
      "Help selecting purchased lists",
      "Assistance cleaning my list",
      "Guidance on list segmentation"
    ],
    tips: ["Clean lists improve deliverability", "Segmentation increases relevance"]
  },
  crm_integration: {
    title: "CRM Integration",
    explanation: "How will you manage responses in your system?",
    examples: [
      "Manual entry into CRM",
      "Automated capture system",
      "Spreadsheet tracking"
    ],
    tips: ["Plan response handling before mailing", "Quick data entry is crucial"]
  }
};

interface FieldHelpButtonProps {
  fieldId: string;
  position?: 'inline' | 'absolute';
}

// Portal component for rendering content outside the DOM hierarchy
function FieldHelpPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;
  
  return ReactDOM.createPortal(children, document.body);
}

export function FieldHelpButton({ fieldId, position = 'inline' }: FieldHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  
  const helpContent = FIELD_HELP_CONTENT[fieldId] || {
    title: "Getting Help",
    explanation: "This field helps us understand your needs better so we can create the most effective direct mail campaign for your travel agency.",
    tips: ["Be specific and detailed", "Think about your ideal outcome", "Consider your current situation"]
  };

  // Calculate popup position based on button location
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      
      // Position popup to the right of the button
      const top = rect.top + scrollY;
      const left = rect.right + scrollX + 8; // 8px gap
      
      // Check if popup would go off screen
      const popupWidth = 320; // estimated width
      const popupHeight = 400; // estimated max height
      
      let adjustedLeft = left;
      let adjustedTop = top;
      
      // If popup would go off right edge, position to the left of button
      if (left + popupWidth > window.innerWidth) {
        adjustedLeft = rect.left + scrollX - popupWidth - 8;
      }
      
      // If popup would go off bottom, align with bottom of button
      if (top + popupHeight > window.innerHeight + scrollY) {
        adjustedTop = Math.max(scrollY + 20, rect.bottom + scrollY - popupHeight);
      }
      
      setPopupPosition({ top: adjustedTop, left: adjustedLeft });
    }
  }, [isOpen]);

  // Close popup when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className={position === 'absolute' ? 'absolute right-2 top-2' : 'relative inline-block ml-2'}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center gap-1 p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
        title="Get help for this field"
      >
        <Info size={18} />
      </button>

      <FieldHelpPortal>
        {isOpen && (
          <div 
            ref={popupRef} 
            className="fixed z-[9999] w-80 bg-white rounded-lg shadow-2xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
            style={{
              top: `${popupPosition.top}px`,
              left: `${popupPosition.left}px`,
            }}
          >
            <div className="p-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {helpContent.title}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {helpContent.explanation}
              </p>

              {helpContent.examples && helpContent.examples.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Examples:</h4>
                  <ul className="space-y-1">
                    {helpContent.examples.map((example, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                        <span className="text-blue-500 dark:text-blue-400 mr-2">•</span>
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {helpContent.tips && helpContent.tips.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Quick Tips:</h4>
                  <ul className="space-y-1">
                    {helpContent.tips.map((tip, index) => (
                      <li key={index} className="text-sm text-blue-800 dark:text-blue-300 flex items-start">
                        <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </FieldHelpPortal>
    </div>
  );
}