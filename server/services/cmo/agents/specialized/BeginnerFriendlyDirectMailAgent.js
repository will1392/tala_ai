/**
 * BeginnerFriendlyDirectMailAgent - Provides step-by-step guidance for first-timers
 * 
 * Focuses on simplicity, clear action steps, and building confidence
 */

export class BeginnerFriendlyDirectMailAgent {
  
  /**
   * Detect if user is a beginner
   */
  detectBeginnerQuery(query) {
    const beginnerSignals = [
      /first time/i,
      /never done/i,
      /new to/i,
      /help me/i,
      /how do i/i,
      /where do i start/i,
      /no experience/i,
      /beginner/i,
      /get started/i
    ];
    
    return beginnerSignals.some(pattern => pattern.test(query));
  }
  
  /**
   * Generate beginner-friendly postcard campaign response
   */
  generateBeginnerPostcardResponse(query) {
    return `## Your First Postcard Campaign - Let's Make This Simple! 

I'll walk you through launching your first postcard campaign step-by-step. Don't worry - it's easier than you think, and I'll explain everything along the way.

### 🎯 Start Here: Your First Postcard Campaign

**What we're going to do:** Send 500 postcards to past clients promoting a specific destination or cruise. This is the safest, most proven way to start.

**Why this works:** Your past clients already trust you. They're 3x more likely to book than strangers. We'll expand later, but let's start where success is almost guaranteed.

### 📝 Step 1: Choose ONE Thing to Promote (This Week)

Pick your best-selling or most exciting trip:
- A specific cruise departure (example: "Alaska Cruise - July 2024")
- One destination (example: "Tuscany Food & Wine Tour")
- A special offer (example: "Europe River Cruises - Save $500")

**✅ Action:** Write down your choice. Just one. We'll do more campaigns later.

### 👥 Step 2: Gather Your List (This Week)

You need addresses for past clients. Here's how:
1. Export from your booking system (last 2 years of clients)
2. Or use your email list - services like **TrueNCOA** ($50) can append addresses
3. Aim for 300-500 names to start

**Don't have 500?** That's okay! Even 100 is enough to start.

**✅ Action:** Export your client list to a spreadsheet with names and addresses.

### 🎨 Step 3: Create Your Postcard (Next Week)

**Front Side (The Pretty Side):**
- One stunning photo of your destination/ship
- Short headline: "You're Invited to Alaska!" or "Save $500 on Your Dream Cruise"
- Your logo

**Back Side (The Info Side):**
- 3-4 bullet points about the trip
- The special offer or dates
- How to book: "Call Susan at 555-1234" 
- "Book by [date] for this special rate"

**✅ Action:** Use **Canva** (free) or **VistaPrint** (they'll design for $99) to create your postcard.

### 📮 Step 4: Print and Mail (Week 3)

**Easiest Option for Beginners:**
Go to **VistaPrint** or **PostcardMania**:
- Upload your design (or use theirs)
- Upload your mailing list
- They print, address, and mail everything
- Cost: About $375 for 500 postcards all-in

**✅ Action:** Upload your design and list. Schedule mailing for Tuesday or Wednesday (best response days).

### 📊 Step 5: Track Your Results (Week 4+)

**Simple Tracking Setup:**
1. Create a special phone number (free with Google Voice)
2. Or add "Mention code ALASKA24" to your postcard
3. Keep a simple tally sheet by your phone

**What to Expect:**
- First calls: 3-5 days after mailing
- Total responses: 25-40 calls (5-8% of 500)
- Bookings: 8-12 (about 30% of callers)
- Revenue: $25,000-40,000 (if average trip is $3,000)

### 💰 Your First Campaign Budget

Here's exactly what you'll spend:
- **Design:** $0 (Canva) or $99 (VistaPrint)
- **Printing:** $125 (500 postcards)
- **Mailing List Prep:** $0-50
- **Postage:** $200
- **Total:** $375-475

**ROI Example:** Spend $400 → Get 10 bookings → Earn $3,000 in commissions = 750% return!

### ⚡ Quick Start Checklist

**This Week:**
- [ ] Choose ONE trip/cruise to promote
- [ ] Export your past client list
- [ ] Set aside $500 budget

**Next Week:**
- [ ] Design your postcard (or have VistaPrint do it)
- [ ] Clean up your mailing list
- [ ] Set up tracking (phone or code)

**Week 3:**
- [ ] Upload everything to printer
- [ ] Schedule mailing
- [ ] Alert your team to expect calls

**Week 4+:**
- [ ] Track responses daily
- [ ] Follow up fast (within 24 hours)
- [ ] Book those trips!

### 🚨 Common Beginner Mistakes to Avoid

1. **Too much information** - Keep it simple, one offer
2. **Tiny images** - Go big and beautiful
3. **No urgency** - Always include a deadline
4. **Mailing on Monday** - Tuesday/Wednesday get better response
5. **Not following up** - Call responders within 24 hours!

### 🎯 Your Next Steps

1. **Today:** Choose your trip and start gathering addresses
2. **This Week:** Get your list ready and pick a printer
3. **Next Week:** Create and submit your campaign

Remember: Your first campaign won't be perfect, and that's okay! The goal is to get started, learn what works, and improve each time.

**Need specific help?** Tell me:
- What trip/cruise you chose
- How many past clients you have
- Your budget

I'll give you specific advice for YOUR situation.

You've got this! 🌟`;
  }
  
  /**
   * Generate response for "what should I promote" question
   */
  generateWhatToPromoteResponse() {
    return `## Choosing What to Promote in Your First Postcard

Great question! Picking the right trip to promote is crucial. Let me make this simple.

### 🏆 Best Bets for Your First Campaign

**1. Your Best Seller (Safest Choice)**
Promote what already works. If you sold 20 Caribbean cruises last year, promote Caribbean cruises. People trust what's popular.

**2. High-Commission Trip (Most Profitable)**
- River cruises (15-20% commission)
- Escorted tours (12-16% commission)  
- All-inclusives with air (10-14% commission)

**3. Time-Sensitive Departure (Creates Urgency)**
- A specific cruise sailing in 4-6 months
- A group tour with limited space
- Early booking bonus ending soon

### 📊 Quick Decision Framework

Ask yourself these 3 questions:
1. **What did my best clients book last year?** → Promote that
2. **What has the best commission?** → Consider that
3. **What has a natural deadline?** → That creates urgency

### 💡 Specific Examples That Work

**For Cruise-Heavy Agencies:**
"2024 Alaska Cruises - Save $500 per Cabin"
*Why it works: Specific year, popular destination, clear savings*

**For Tour Specialists:**
"Tuscany Small Group Tour - Only 6 Spots Left"
*Why it works: Scarcity, specific destination, implies exclusivity*

**For All-Inclusive Sellers:**
"Adults-Only Cancun - Kids Stay Free Dates Inside"
*Why it works: Clear audience, surprise twist, curiosity*

### ✅ Make Your Choice Now

Don't overthink this! Pick one and move forward:
- **Option A:** Your most popular trip from last year
- **Option B:** Your highest commission product
- **Option C:** Something departing in 4-6 months

Write it down: "My first postcard will promote: ___________"

Now let's design your postcard! What did you choose?`;
  }
}

export default BeginnerFriendlyDirectMailAgent;