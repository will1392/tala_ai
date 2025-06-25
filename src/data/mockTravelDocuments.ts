/**
 * Realistic Travel Document Database for Tala AI Demo
 * 
 * Contains authentic-looking travel documents across all categories:
 * - Visa Policies and Requirements
 * - Airline Policies and Procedures
 * - Destination Guides and Information
 * - Travel Agency Documents
 */

export interface MockDocument {
  id: string;
  title: string;
  category: 'visa' | 'airline' | 'destination' | 'agency';
  fileType: 'pdf' | 'docx' | 'xlsx' | 'txt';
  content: string;
  excerpt: string;
  metadata: {
    author?: string;
    uploadedAt: string;
    fileSize: number;
    wordCount: number;
    pageCount?: number;
    lastModified: string;
    tags: string[];
  };
  searchableTerms: string[];
}

export const mockTravelDocuments: MockDocument[] = [
  // VISA DOCUMENTS
  {
    id: 'visa_japan_2024',
    title: 'Japan Tourist Visa Requirements 2024',
    category: 'visa',
    fileType: 'pdf',
    excerpt: 'Complete guide to Japan tourist visa application process, including required documents, fees, processing times, and embassy procedures.',
    content: `Japan Tourist Visa Requirements 2024

    OVERVIEW
    Japan offers visa-free entry for citizens of many countries for short-term visits. However, certain nationalities require a tourist visa before arrival.

    VISA-FREE COUNTRIES
    Citizens of the following countries can enter Japan without a visa for tourism purposes:
    - United States: 90 days
    - Canada: 90 days  
    - United Kingdom: 90 days
    - Australia: 90 days
    - European Union countries: 90 days
    - South Korea: 90 days

    REQUIRED DOCUMENTS
    For tourist visa applications, applicants must submit:
    
    1. Valid passport with at least 6 months validity
    2. Completed visa application form
    3. Recent passport-size photograph (4.5cm x 4.5cm)
    4. Flight itinerary or confirmed round-trip tickets
    5. Hotel reservations or accommodation proof
    6. Bank statements (last 3 months)
    7. Employment certificate or proof of enrollment
    8. Travel insurance coverage (minimum $50,000)

    PROCESSING TIME
    - Standard processing: 5-7 business days
    - Express processing: 2-3 business days (additional fee required)
    - Peak season: Up to 10 business days

    FEES
    - Single entry visa: $35
    - Multiple entry visa: $70
    - Express processing fee: $25

    EMBASSY LOCATIONS
    Applications must be submitted to Japanese consulates or authorized visa application centers.

    IMPORTANT NOTES
    - Visa validity: 90 days from issue date
    - Maximum stay: 15-30 days (as determined by immigration officer)
    - No visa extensions available for tourist visas
    - Working is strictly prohibited on tourist visas`,
    metadata: {
      author: 'Japanese Consulate General',
      uploadedAt: '2024-01-15T10:30:00Z',
      fileSize: 245760,
      wordCount: 287,
      pageCount: 3,
      lastModified: '2024-01-15T10:30:00Z',
      tags: ['visa', 'japan', 'tourist', 'requirements', 'embassy']
    },
    searchableTerms: ['japan', 'visa', 'tourist', 'passport', 'embassy', 'requirements', 'processing time', 'fees']
  },

  {
    id: 'visa_schengen_2024',
    title: 'Schengen Visa Application Guide',
    category: 'visa',
    fileType: 'pdf',
    excerpt: 'Comprehensive guide for applying to Schengen Area countries including requirements, documentation, and processing procedures.',
    content: `Schengen Visa Application Guide 2024

    ABOUT SCHENGEN AREA
    The Schengen Area comprises 27 European countries that have abolished passport controls at their mutual borders, allowing free movement within the zone.

    SCHENGEN COUNTRIES
    Austria, Belgium, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Iceland, Italy, Latvia, Liechtenstein, Lithuania, Luxembourg, Malta, Netherlands, Norway, Poland, Portugal, Slovakia, Slovenia, Spain, Sweden, Switzerland.

    VISA TYPES
    - Type C (Short-stay): Maximum 90 days within 180-day period
    - Type D (Long-stay): National visa for stays exceeding 90 days

    REQUIRED DOCUMENTS
    1. Completed Schengen visa application form
    2. Valid passport (issued within last 10 years, valid 3+ months beyond return)
    3. Two recent passport photographs
    4. Travel insurance (minimum €30,000 coverage)
    5. Proof of accommodation (hotel bookings, invitation letter)
    6. Flight reservations (round-trip)
    7. Proof of financial means (bank statements, sponsorship letter)
    8. Cover letter explaining purpose of visit
    9. Employment letter or business registration
    10. Criminal background check (if required)

    FINANCIAL REQUIREMENTS
    Applicants must demonstrate sufficient funds:
    - Germany: €45 per day
    - France: €65 per day  
    - Spain: €73 per day
    - Italy: €31 per day
    - Netherlands: €34 per day

    PROCESSING TIMES
    - Standard: 15 calendar days
    - Complex cases: Up to 30 days
    - Exceptional circumstances: Up to 60 days

    APPLICATION FEES
    - Adults: €80
    - Children (6-12 years): €40
    - Children under 6: Free

    BIOMETRIC DATA
    First-time applicants must provide fingerprints and digital photograph at visa application center.

    INTERVIEW
    Consular interviews may be required for certain applicants or nationalities.

    IMPORTANT NOTES
    - Apply to consulate of main destination country
    - Apply 15 days to 6 months before travel
    - Visa allows travel throughout Schengen Area
    - Entry/exit must be through issuing country when possible`,
    metadata: {
      author: 'European Commission',
      uploadedAt: '2024-01-20T14:15:00Z',
      fileSize: 312480,
      wordCount: 356,
      pageCount: 4,
      lastModified: '2024-01-20T14:15:00Z',
      tags: ['schengen', 'visa', 'europe', 'travel', 'requirements']
    },
    searchableTerms: ['schengen', 'visa', 'europe', 'requirements', 'biometric', 'financial', 'processing']
  },

  // AIRLINE DOCUMENTS
  {
    id: 'united_baggage_2024',
    title: 'United Airlines Baggage Policy 2024',
    category: 'airline',
    fileType: 'pdf',
    excerpt: 'Current United Airlines baggage allowances, fees, restrictions, and policies for domestic and international flights.',
    content: `United Airlines Baggage Policy 2024

    CARRY-ON BAGGAGE

    Standard Allowance:
    - 1 carry-on bag: 22" x 14" x 9" (56cm x 36cm x 23cm)
    - 1 personal item: 17" x 10" x 9" (43cm x 25cm x 22cm)
    - Maximum weight: 40 lbs (18kg) for carry-on

    Free Carry-On:
    - All fare types except Basic Economy
    - Basic Economy: Carry-on fee applies ($35-60 depending on route)

    CHECKED BAGGAGE

    First Checked Bag:
    - Basic Economy & Economy: $35 domestic, $70 international
    - Economy Plus: Free domestic, $70 international  
    - Premium Plus & Business: Free worldwide
    - First Class: Free worldwide

    Second Checked Bag:
    - $45 domestic, $100 international (all fare types except Premium/Business/First)

    Size & Weight Limits:
    - Maximum dimensions: 62 linear inches (158cm)
    - Maximum weight: 50 lbs (23kg) standard
    - Overweight fees: $100 (51-70 lbs), $200 (71-100 lbs)
    - Oversized fees: $200 (63-115 linear inches)

    SPECIAL ITEMS

    Sports Equipment:
    - Golf bags: $35-150 depending on destination
    - Ski equipment: $35-150 depending on destination  
    - Surfboards: $150-300 depending on route
    - Bicycles: $150-300 depending on route

    Musical Instruments:
    - Small instruments: Can be carried on if fits in overhead bin
    - Large instruments: Must purchase seat or check as baggage
    - Checked instrument fee: $150-300

    RESTRICTED ITEMS

    Prohibited in Carry-On:
    - Liquids over 3.4oz (100ml)
    - Sharp objects (knives, scissors over 4 inches)
    - Firearms and ammunition
    - Flammable items
    - Tools longer than 7 inches

    Prohibited in Checked Bags:
    - Lithium batteries over 100Wh
    - Flammable liquids and gases
    - Explosives and fireworks
    - Compressed gas cylinders

    INTERNATIONAL CONSIDERATIONS
    - Different weight/size limits may apply on partner airlines
    - Some countries have additional restrictions
    - Agricultural products restricted on certain routes
    - Duty-free liquids allowed in carry-on with proper documentation

    MILEAGEPLUS BENEFITS
    - Premier Silver: First bag free domestic
    - Premier Gold: First bag free worldwide  
    - Premier Platinum: Two bags free worldwide
    - Premier 1K: Three bags free worldwide

    EXCESS BAGGAGE
    Additional bags beyond the second bag: $150-400 depending on route and destination.

    For most current information, check united.com or contact customer service.`,
    metadata: {
      author: 'United Airlines',
      uploadedAt: '2024-01-10T09:45:00Z',
      fileSize: 198720,
      wordCount: 421,
      pageCount: 5,
      lastModified: '2024-01-10T09:45:00Z',
      tags: ['united', 'airlines', 'baggage', 'policy', 'fees', 'restrictions']
    },
    searchableTerms: ['united', 'airlines', 'baggage', 'carry-on', 'checked', 'fees', 'weight', 'size', 'restrictions']
  },

  {
    id: 'delta_cancellation_2024',
    title: 'Delta Air Lines Cancellation and Change Policy',
    category: 'airline',
    fileType: 'pdf',
    excerpt: 'Delta Air Lines ticket cancellation, change fees, refund policies, and rebooking procedures for all fare types.',
    content: `Delta Air Lines Cancellation and Change Policy 2024

    CHANGE FEES ELIMINATED
    Delta has permanently eliminated change fees for domestic and international flights (except Basic Economy).

    FARE TYPE POLICIES

    Basic Economy:
    - No changes allowed after 24 hours
    - No refunds (except within 24 hours of booking)
    - No upgrades permitted
    - Seat assignment at check-in

    Main Cabin:
    - No change fees (fare difference applies)
    - Refundable within 24 hours of booking
    - Same-day confirmed changes: $75
    - Same-day standby: Free

    Comfort+:
    - No change fees (fare difference applies)  
    - Priority boarding included
    - Same-day confirmed changes: $75
    - Same-day standby: Free

    First Class/Delta One:
    - No change fees
    - Same-day confirmed changes: Free
    - Same-day standby: Free
    - Refundable tickets available

    24-HOUR CANCELLATION RULE
    All tickets can be cancelled for full refund within 24 hours of booking if:
    - Booked at least 7 days before departure
    - Cancelled within 24 hours of purchase

    REFUND PROCESSING
    - Credit card refunds: 7-20 business days
    - Cash/check refunds: 20 business days
    - eCredit refunds: Immediate

    REBOOKING OPTIONS
    - eCredit: Valid for one year from original issue date
    - Travel vouchers: Valid for one year from issue
    - Future flight credit: Valid for one year, transferable

    WEATHER DISRUPTIONS
    - No penalties for changes due to weather
    - Difference in fare waived for rebooking
    - Hotel/meal vouchers provided when appropriate
    - Automatic rebooking on next available flight

    MEDICAL EMERGENCIES
    - Documentation required (doctor's note)
    - Change fees waived with proper documentation
    - Refunds considered on case-by-case basis

    MILITARY PERSONNEL
    - Active duty military: No change fees
    - Emergency leave: Special considerations
    - PCS moves: Flexible rebooking options

    INTERNATIONAL CONSIDERATIONS
    - EU261 regulations apply for EU departures
    - Different policies may apply for partner airlines
    - Currency exchange rates affect refund amounts

    SAME-DAY CHANGES
    Available for flights departing the same calendar day:
    - Confirmed changes: $75 (waived for premium cabins)
    - Standby: Free for all fare types
    - Must be same origin/destination
    - Available up to same calendar day

    GROUP BOOKINGS
    - 10+ passengers: Special group policies apply
    - Deposit requirements vary by group size
    - Custom cancellation terms available

    CONTACT INFORMATION
    - Customer service: 800-221-1212
    - International: +1-404-209-3434
    - SkyMiles members: Dedicated phone lines available

    Important: Policies subject to change. Always check delta.com for most current information.`,
    metadata: {
      author: 'Delta Air Lines',
      uploadedAt: '2024-01-12T16:20:00Z',
      fileSize: 276480,
      wordCount: 467,
      pageCount: 6,
      lastModified: '2024-01-12T16:20:00Z',
      tags: ['delta', 'airlines', 'cancellation', 'change', 'refund', 'policy']
    },
    searchableTerms: ['delta', 'airlines', 'cancellation', 'change', 'fees', 'refund', 'basic economy', 'weather']
  },

  // DESTINATION DOCUMENTS  
  {
    id: 'tokyo_travel_guide',
    title: 'Tokyo Travel Guide: Essential Information',
    category: 'destination',
    fileType: 'docx',
    excerpt: 'Comprehensive Tokyo travel guide covering transportation, attractions, culture, dining, and practical travel tips.',
    content: `Tokyo Travel Guide: Essential Information

    OVERVIEW
    Tokyo, Japan's bustling capital, seamlessly blends traditional culture with cutting-edge technology. Home to over 14 million people, it's one of the world's most dynamic cities.

    BEST TIME TO VISIT
    - Spring (March-May): Cherry blossom season, mild weather
    - Summer (June-August): Hot and humid, festival season
    - Autumn (September-November): Comfortable temperatures, beautiful foliage
    - Winter (December-February): Cold but clear, fewer crowds

    TRANSPORTATION

    JR Pass:
    - 7-day pass: ¥29,650 (~$200)
    - 14-day pass: ¥47,250 (~$320)  
    - 21-day pass: ¥60,450 (~$410)
    - Must be purchased outside Japan

    Tokyo Metro:
    - 24-hour ticket: ¥800
    - 48-hour ticket: ¥1,200
    - 72-hour ticket: ¥1,500

    Airport Access:
    - Narita Express: ¥3,070, 60 minutes to city center
    - Airport Limousine Bus: ¥1,000, 90 minutes
    - Haneda Monorail: ¥500, 30 minutes

    TOP ATTRACTIONS

    Traditional Sites:
    - Sensoji Temple (Asakusa): Tokyo's oldest temple
    - Meiji Shrine: Dedicated to Emperor Meiji
    - Imperial Palace Gardens: Former Edo Castle grounds
    - Toshogu Shrine: Elaborate Shinto shrine

    Modern Attractions:
    - Tokyo Skytree: World's second tallest structure
    - Shibuya Crossing: World's busiest pedestrian crossing
    - Tokyo Tower: Iconic red communication tower
    - Teamlab Borderless: Digital art museum

    Neighborhoods:
    - Harajuku: Youth culture and fashion
    - Ginza: Upscale shopping and dining
    - Shinjuku: Business district and nightlife
    - Akihabara: Electronics and anime culture

    DINING

    Must-Try Foods:
    - Sushi: Tsukiji Outer Market, Ginza
    - Ramen: Ichiran, Ippudo chains
    - Tempura: Daikokuya (since 1887)
    - Yakiniku: Japanese BBQ
    - Kaiseki: Multi-course haute cuisine

    Price Ranges:
    - Budget meals: ¥500-1,000
    - Mid-range restaurants: ¥2,000-5,000
    - High-end dining: ¥10,000+

    CULTURAL ETIQUETTE
    - Bow slightly when greeting
    - Remove shoes when entering homes/temples
    - Don't eat or drink while walking
    - Be quiet on public transportation
    - No tipping (it's included in service)

    SHOPPING
    - Ginza: Luxury brands and department stores
    - Harajuku: Trendy fashion and accessories  
    - Akihabara: Electronics and anime merchandise
    - Tsukiji: Fresh seafood and kitchen tools

    PRACTICAL TIPS
    - Cash is still king - many places don't accept cards
    - Free WiFi available in convenience stores and stations
    - IC cards (Suica/Pasmo) for easy transit payment
    - Convenience stores (konbini) are everywhere and very useful
    - English signage increasing but Japanese phrases helpful

    EMERGENCY INFORMATION
    - Police: 110
    - Fire/Ambulance: 119
    - Tourist Hotline: 050-3816-2787 (24/7, multilingual)

    ACCOMMODATION
    Budget (¥3,000-8,000/night):
    - Hostels, capsule hotels, business hotels

    Mid-range (¥8,000-20,000/night):
    - Business hotels, ryokan, boutique hotels

    Luxury (¥20,000+/night):
    - International hotel chains, luxury ryokan

    SEASONAL EVENTS
    - Cherry Blossom Festival (March-April)
    - Golden Week (Late April-Early May)
    - Obon Festival (August)
    - Autumn Leaves (November)

    Tokyo offers endless discovery - from ancient temples to futuristic technology, traditional arts to modern pop culture.`,
    metadata: {
      author: 'Tokyo Tourism Board',
      uploadedAt: '2024-01-18T11:30:00Z',
      fileSize: 387200,
      wordCount: 598,
      pageCount: 8,
      lastModified: '2024-01-18T11:30:00Z',
      tags: ['tokyo', 'japan', 'travel', 'guide', 'attractions', 'culture']
    },
    searchableTerms: ['tokyo', 'japan', 'travel', 'attractions', 'transportation', 'culture', 'food', 'shopping', 'temples']
  },

  // AGENCY DOCUMENTS
  {
    id: 'travel_insurance_guide',
    title: 'Travel Insurance Coverage Guide',
    category: 'agency',
    fileType: 'pdf',
    excerpt: 'Comprehensive guide to travel insurance options, coverage types, exclusions, and recommendations for different travel scenarios.',
    content: `Travel Insurance Coverage Guide 2024

    OVERVIEW
    Travel insurance protects against unexpected events that could disrupt or cancel your trip, providing financial protection and peace of mind.

    TYPES OF COVERAGE

    Trip Cancellation/Interruption:
    - Covers non-refundable trip costs if you must cancel or cut short your trip
    - Covered reasons: illness, injury, death, weather, job loss, jury duty
    - Coverage limit: Up to total trip cost

    Emergency Medical:
    - Covers medical expenses while traveling
    - Includes emergency evacuation if needed
    - Typical coverage: $50,000-$1,000,000
    - Essential for international travel

    Baggage Protection:
    - Covers lost, stolen, or damaged luggage
    - Includes personal items and electronics
    - Coverage limit: $1,000-$3,000 per person
    - Deductibles typically apply

    Travel Delay:
    - Reimburses additional expenses due to covered delays
    - Includes meals, accommodation, transportation
    - Minimum delay period: 6-12 hours
    - Coverage limit: $500-$2,000

    COVERAGE CATEGORIES

    Basic Plans ($50-100 per trip):
    - Trip cancellation/interruption
    - Emergency medical coverage
    - Baggage protection
    - 24/7 assistance

    Comprehensive Plans ($100-300 per trip):
    - All basic coverage
    - Higher coverage limits
    - Pre-existing medical conditions (with waiver)
    - Cancel for Any Reason (CFAR) add-on available

    Annual Plans ($300-800 per year):
    - Coverage for multiple trips
    - Cost-effective for frequent travelers
    - Per-trip limits apply
    - Medical coverage often primary benefit

    EXCLUSIONS

    Common Exclusions:
    - Pre-existing medical conditions (unless waiver purchased)
    - High-risk activities (mountaineering, extreme sports)
    - War and terrorism (some policies)
    - Alcohol or drug-related incidents
    - Pregnancy-related issues (unless complications)

    COVID-19 Considerations:
    - Coverage varies significantly between insurers
    - Some cover trip cancellation due to COVID-19 diagnosis
    - Medical coverage usually included
    - Travel advisories may affect coverage

    SPECIAL CONSIDERATIONS

    Adventure Travel:
    - Standard policies may exclude adventure sports
    - Specialized adventure travel insurance available
    - Activities covered: skiing, scuba diving, trekking
    - Higher premiums but comprehensive coverage

    Business Travel:
    - Many policies cover business trips
    - Business equipment coverage available
    - Shorter trip cancellation reasons may apply
    - Corporate policies often more cost-effective

    Senior Travelers (65+):
    - Age limits may apply to some coverage
    - Pre-existing medical condition waivers important
    - Higher medical coverage limits recommended
    - Annual plans often good value

    WHEN TO PURCHASE

    Optimal Timing:
    - Within 14-21 days of initial trip deposit
    - Earlier purchase enables pre-existing condition waivers
    - CFAR coverage requires purchase within specific timeframe
    - Last-minute purchases limit coverage options

    CLAIM PROCESS

    Filing Claims:
    1. Contact insurer immediately when incident occurs
    2. Keep all receipts and documentation
    3. Obtain required medical reports if applicable
    4. Submit claim forms within specified timeframe
    5. Provide requested supporting documentation

    Required Documentation:
    - Original receipts for all expenses
    - Medical reports and discharge summaries
    - Police reports for theft/criminal acts
    - Airline documentation for delays/cancellations
    - Trip cancellation verification from providers

    CHOOSING THE RIGHT POLICY

    Factors to Consider:
    - Trip cost and duration
    - Destination (domestic vs international)
    - Age and health status
    - Activities planned
    - Existing coverage (health insurance, credit cards)

    Cost Factors:
    - Trip cost: 4-10% of total trip cost
    - Age: Increases with traveler age
    - Destination: Some countries cost more to cover
    - Coverage limits: Higher limits increase premium
    - Add-ons: CFAR, adventure sports coverage

    RECOMMENDED MINIMUMS
    - Emergency medical: $100,000 (international), $25,000 (domestic)
    - Emergency evacuation: $1,000,000
    - Trip cancellation: 100% of trip cost
    - Baggage: $1,500 per person

    TOP INSURERS
    - Allianz Global Assistance
    - Travel Guard (AIG)
    - World Nomads
    - Travelex Insurance
    - InsureMyTrip (comparison site)

    Always read policy details carefully and compare coverage options before purchasing.`,
    metadata: {
      author: 'Travel Safety Associates',
      uploadedAt: '2024-01-14T13:45:00Z',
      fileSize: 298240,
      wordCount: 712,
      pageCount: 9,
      lastModified: '2024-01-14T13:45:00Z',
      tags: ['travel', 'insurance', 'coverage', 'protection', 'claims', 'medical']
    },
    searchableTerms: ['travel', 'insurance', 'coverage', 'medical', 'cancellation', 'baggage', 'claims', 'protection']
  },

  {
    id: 'passport_renewal_guide',
    title: 'US Passport Renewal Process Guide',
    category: 'agency',
    fileType: 'pdf',
    excerpt: 'Step-by-step guide for US passport renewal including requirements, forms, fees, processing times, and expedited options.',
    content: `US Passport Renewal Process Guide 2024

    ELIGIBILITY FOR RENEWAL
    You can renew your passport by mail if:
    - Your most recent passport is undamaged and in your possession
    - You were at least 16 years old when your most recent passport was issued
    - Your most recent passport was issued less than 15 years ago
    - Your most recent passport was issued in your current name (or you can document name change)

    REQUIRED DOCUMENTS

    Form DS-82:
    - Complete application for passport renewal
    - Available online at travel.state.gov
    - Must be printed on white 8.5" x 11" paper
    - Black ink signatures required

    Current Passport:
    - Must be submitted with application
    - Will be cancelled and returned separately
    - Keep a photocopy for your records

    Passport Photo:
    - 2" x 2" color photograph
    - Taken within last 6 months
    - White or off-white background
    - Clear front view, no hat or headwear (religious exceptions apply)

    Payment:
    - Passport book: $130
    - Passport card: $30  
    - Both book and card: $160
    - Check or money order payable to "U.S. Department of State"

    PROCESSING TIMES

    Routine Processing:
    - 6-8 weeks from receipt
    - Includes shipping time to and from facility
    - No additional fee

    Expedited Processing:
    - 2-3 weeks from receipt
    - Additional $60 expedite fee
    - Recommended for urgent travel

    Emergency Travel:
    - Life-or-death situations only
    - Requires proof of emergency
    - Contact National Passport Information Center
    - Additional documentation required

    MAILING INSTRUCTIONS

    Address:
    National Passport Processing Center
    Post Office Box 90155
    Philadelphia, PA 19190-0155

    For Expedited Service:
    National Passport Processing Center
    Post Office Box 90955
    Philadelphia, PA 19190-0955

    Shipping:
    - Use trackable mail service (certified mail, UPS, FedEx)
    - Include prepaid trackable return envelope
    - USPS Express Mail: 1-2 business days
    - UPS/FedEx overnight recommended for expedited applications

    SPECIAL CIRCUMSTANCES

    Name Changes:
    If your current name differs from passport name:
    - Certified marriage certificate
    - Certified divorce decree
    - Court order for legal name change
    - Original or certified copy required

    Lost or Stolen Passports:
    - Cannot renew by mail
    - Must apply in person using Form DS-11
    - Police report recommended for stolen passports
    - Statement regarding lost/stolen passport required

    Damaged Passports:
    - Significantly damaged passports require in-person application
    - Minor damage may qualify for mail renewal
    - Contact NPIC for guidance: 1-877-487-2778

    INTERNATIONAL CONSIDERATIONS

    Renewing While Abroad:
    - Contact nearest U.S. embassy or consulate
    - Different procedures and fees may apply
    - Processing times vary by location
    - Emergency services available for urgent travel

    PASSPORT CARDS
    Valid for:
    - Land and sea travel to Canada, Mexico, Caribbean, Bermuda
    - NOT valid for air travel
    - Wallet-sized alternative to passport book
    - Enhanced security features

    CHILDREN'S PASSPORTS
    Children under 16:
    - Cannot renew by mail
    - Must apply in person with both parents
    - Form DS-11 required
    - Parental consent requirements apply

    TIPS FOR SUCCESS
    - Apply early - don't wait until last minute
    - Double-check all information for accuracy
    - Use black ink only on forms
    - Keep copies of all documents
    - Track your application online
    - Update emergency contact information

    PASSPORT PHOTO REQUIREMENTS
    - Head size: 1" to 1 3/8" from bottom of chin to top of head
    - Eye level: 1 1/8" to 1 3/8" from bottom of photo
    - No glasses (changed in 2016)
    - Natural expression, eyes open
    - Both ears visible (preferred)

    TRACKING YOUR APPLICATION
    Online status check available at:
    travel.state.gov
    - Requires last 4 digits of SSN
    - Application locator number from receipt
    - Updates every business day

    CONTACT INFORMATION
    National Passport Information Center:
    - Phone: 1-877-487-2778
    - TDD/TTY: 1-888-874-7793
    - Hours: Monday-Friday 8am-10pm ET
    - Automated service available 24/7

    IMPORTANT NOTES
    - Passport books valid for 10 years (adults)
    - Some countries require 6 months validity beyond travel dates
    - Allow extra time during peak travel seasons
    - Consider applying for both book and card for flexibility

    For most current information and forms, visit travel.state.gov`,
    metadata: {
      author: 'US Department of State',
      uploadedAt: '2024-01-16T15:10:00Z',
      fileSize: 341760,
      wordCount: 823,
      pageCount: 11,
      lastModified: '2024-01-16T15:10:00Z',
      tags: ['passport', 'renewal', 'US', 'travel', 'documents', 'state department']
    },
    searchableTerms: ['passport', 'renewal', 'US', 'application', 'processing', 'expedited', 'form', 'requirements']
  }
];

export const mockCategories = [
  { id: 'all', label: 'All Documents', icon: '📄', count: mockTravelDocuments.length },
  { id: 'visa', label: 'Visa Policies', icon: '🛂', count: mockTravelDocuments.filter(d => d.category === 'visa').length },
  { id: 'airline', label: 'Airline Rules', icon: '✈️', count: mockTravelDocuments.filter(d => d.category === 'airline').length },
  { id: 'destination', label: 'Destinations', icon: '🗺️', count: mockTravelDocuments.filter(d => d.category === 'destination').length },
  { id: 'agency', label: 'Agency Docs', icon: '📋', count: mockTravelDocuments.filter(d => d.category === 'agency').length },
];

// Helper functions for mock search
export const searchMockDocuments = (query: string, category: string = 'all', limit: number = 10): MockDocument[] => {
  const lowerQuery = query.toLowerCase();
  
  let filtered = mockTravelDocuments;
  
  // Filter by category
  if (category !== 'all') {
    filtered = filtered.filter(doc => doc.category === category);
  }
  
  // Search in content and terms
  if (query.trim()) {
    filtered = filtered.filter(doc => 
      doc.searchableTerms.some(term => term.toLowerCase().includes(lowerQuery)) ||
      doc.title.toLowerCase().includes(lowerQuery) ||
      doc.content.toLowerCase().includes(lowerQuery) ||
      doc.excerpt.toLowerCase().includes(lowerQuery)
    );
    
    // Sort by relevance (simple scoring)
    filtered.sort((a, b) => {
      const scoreA = calculateRelevanceScore(a, lowerQuery);
      const scoreB = calculateRelevanceScore(b, lowerQuery);
      return scoreB - scoreA;
    });
  }
  
  return filtered.slice(0, limit);
};

const calculateRelevanceScore = (doc: MockDocument, query: string): number => {
  let score = 0;
  
  // Title matches are most important
  if (doc.title.toLowerCase().includes(query)) score += 10;
  
  // Exact term matches
  const exactMatches = doc.searchableTerms.filter(term => 
    term.toLowerCase().includes(query)
  ).length;
  score += exactMatches * 5;
  
  // Content matches
  const contentMatches = (doc.content.toLowerCase().match(new RegExp(query, 'g')) || []).length;
  score += contentMatches * 2;
  
  // Recent documents get slight boost
  const uploadDate = new Date(doc.metadata.uploadedAt);
  const daysSinceUpload = (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpload < 30) score += 1;
  
  return score;
};