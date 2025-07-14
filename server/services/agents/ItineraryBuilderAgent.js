/**
 * ItineraryBuilderAgent - Specialized agent for creating detailed travel itineraries
 * 
 * Handles complex multi-city routes, scheduling optimization, and comprehensive
 * travel planning with consideration for logistics and preferences.
 */

import BaseAgent from './BaseAgent.js';

export class ItineraryBuilderAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      preferredLLM: 'claude-opus-4',
      confidence_threshold: 0.75,
      temperature: 0.5,
      maxExecutionTime: 30000
    });
    
    // Travel optimization parameters
    this.optimizationParams = {
      minLayoverTime: 90, // minutes
      maxLayoverTime: 360, // minutes
      preferredArrivalTime: { start: 9, end: 22 }, // 9 AM - 10 PM
      maxDailyActivities: 4,
      bufferBetweenActivities: 30, // minutes
      transportationModes: ['flight', 'train', 'car', 'bus', 'ferry', 'walk']
    };
  }

  /**
   * Get agent capabilities
   */
  getCapabilities() {
    return [
      'itinerary-creation',
      'route-optimization',
      'multi-city-planning',
      'schedule-optimization',
      'transportation-planning',
      'accommodation-scheduling',
      'activity-planning',
      'time-zone-handling',
      'budget-allocation'
    ];
  }

  /**
   * Get agent specialization
   */
  getSpecialization() {
    return 'complex-itinerary-planning';
  }

  /**
   * Get preferred LLM
   */
  getPreferredLLM() {
    return 'claude-opus-4';
  }

  /**
   * Get supported task types
   */
  getSupportedTaskTypes() {
    return [
      'build-itinerary',
      'optimize-route',
      'schedule-activities',
      'plan-transportation',
      'multi-city-itinerary'
    ];
  }

  /**
   * Evaluate if agent can handle task
   */
  async evaluateTask(task) {
    // High confidence for itinerary tasks
    if (task.type && task.type.includes('itinerary')) {
      return 0.95;
    }
    
    // Check for travel planning keywords
    const keywords = ['itinerary', 'schedule', 'route', 'plan', 'trip', 'travel', 'multi-city'];
    const taskText = JSON.stringify(task).toLowerCase();
    
    const matches = keywords.filter(keyword => taskText.includes(keyword));
    if (matches.length >= 2) {
      return 0.85;
    }
    
    // Check if task has travel components
    if (task.data?.destinations || task.data?.dates || task.data?.activities) {
      return 0.8;
    }
    
    return 0.4;
  }

  /**
   * Validate task
   */
  async validateTask(task) {
    const required = [];
    
    if (!task.data?.destinations && !task.data?.destination) {
      required.push('destinations');
    }
    
    if (!task.data?.dates && !task.data?.startDate) {
      required.push('travel dates');
    }
    
    if (required.length > 0) {
      return { 
        valid: false, 
        reason: `Missing required information: ${required.join(', ')}`
      };
    }
    
    return { valid: true };
  }

  /**
   * Perform the itinerary building task
   */
  async performTask(task, context) {
    const taskType = task.type || 'build-itinerary';
    
    console.log(`✈️ Building itinerary: ${taskType}`);
    
    let result;
    
    switch (taskType) {
      case 'build-itinerary':
        result = await this.buildCompleteItinerary(task.data, context);
        break;
        
      case 'optimize-route':
        result = await this.optimizeRoute(task.data, context);
        break;
        
      case 'schedule-activities':
        result = await this.scheduleActivities(task.data, context);
        break;
        
      case 'plan-transportation':
        result = await this.planTransportation(task.data, context);
        break;
        
      case 'multi-city-itinerary':
        result = await this.buildMultiCityItinerary(task.data, context);
        break;
        
      default:
        result = await this.buildCompleteItinerary(task.data, context);
    }
    
    return result;
  }

  /**
   * Build a complete itinerary
   */
  async buildCompleteItinerary(data, context) {
    // Prepare itinerary data
    const itineraryData = {
      destinations: this.normalizeDestinations(data.destinations || [data.destination]),
      dates: this.normalizeDates(data.dates || { start: data.startDate, end: data.endDate }),
      travelers: data.travelers || 1,
      preferences: data.preferences || {},
      budget: data.budget,
      activities: data.activities || [],
      accommodations: data.accommodations || []
    };
    
    const prompt = `Create a detailed travel itinerary with the following requirements:

Destinations: ${itineraryData.destinations.join(' → ')}
Travel Dates: ${itineraryData.dates.start} to ${itineraryData.dates.end}
Number of Travelers: ${itineraryData.travelers}
Budget: ${itineraryData.budget ? `$${itineraryData.budget}` : 'Flexible'}
Preferences: ${JSON.stringify(itineraryData.preferences)}

Please create a day-by-day itinerary including:
1. Transportation between cities (with specific times and options)
2. Accommodation recommendations for each location
3. Daily activities and attractions (morning, afternoon, evening)
4. Meal recommendations
5. Estimated costs for each component
6. Important logistical notes (visa requirements, local transportation, etc.)
7. Alternative options for weather or preference changes

Format as a structured JSON with the following schema:
{
  "overview": { "totalDays", "totalCost", "destinations", "highlights" },
  "days": [
    {
      "date": "YYYY-MM-DD",
      "day": 1,
      "location": "city",
      "accommodation": { "name", "type", "cost", "checkIn", "checkOut" },
      "activities": [
        { "time", "duration", "name", "description", "cost", "location", "bookingRequired" }
      ],
      "meals": [
        { "type", "time", "restaurant", "cuisine", "cost" }
      ],
      "transportation": [
        { "type", "from", "to", "time", "duration", "cost", "notes" }
      ],
      "notes": []
    }
  ],
  "logistics": {
    "visaRequirements": [],
    "vaccinations": [],
    "currency": [],
    "weather": [],
    "packingList": []
  },
  "alternatives": []
}`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.5,
        maxTokens: 3000,
        responseFormat: { type: 'json_object' }
      });
      
      const itinerary = this.parseAIResponse(response);
      
      // Optimize and validate the itinerary
      const optimized = await this.optimizeItinerary(itinerary, itineraryData);
      
      // Calculate totals and summaries
      const enhanced = this.enhanceItinerary(optimized, itineraryData);
      
      return {
        itinerary: enhanced,
        metadata: {
          confidence: 0.85,
          optimizationApplied: true,
          alternativesIncluded: enhanced.alternatives?.length > 0
        }
      };
      
    } catch (error) {
      console.error('Itinerary building error:', error);
      throw error;
    }
  }

  /**
   * Optimize travel route for multiple destinations
   */
  async optimizeRoute(data, context) {
    const destinations = data.destinations || [];
    const startPoint = data.startPoint || destinations[0];
    const endPoint = data.endPoint || data.returnToStart ? startPoint : destinations[destinations.length - 1];
    
    const prompt = `Optimize this multi-destination travel route:

Starting Point: ${startPoint}
Destinations to Visit: ${destinations.join(', ')}
Ending Point: ${endPoint}
Travel Dates: ${data.dates?.start} to ${data.dates?.end}
Preferences: ${JSON.stringify(data.preferences || {})}

Consider:
1. Geographic efficiency (minimize total travel distance/time)
2. Transportation options and costs between each point
3. Seasonal factors (weather, events, peak seasons)
4. Visa requirements and border crossings
5. Logical flow for the type of trip

Provide:
1. Optimal route order with reasoning
2. Transportation recommendations between each segment
3. Recommended days in each location
4. Total distance and estimated transportation time
5. Alternative routes if applicable

Format as structured JSON.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.4,
        maxTokens: 1500
      });
      
      const optimizedRoute = this.parseAIResponse(response);
      
      // Validate route optimization
      const validated = this.validateRoute(optimizedRoute, destinations);
      
      // Calculate route metrics
      const metrics = await this.calculateRouteMetrics(validated);
      
      return {
        route: validated,
        metrics,
        savings: this.calculateRouteSavings(destinations, validated.optimizedOrder)
      };
      
    } catch (error) {
      console.error('Route optimization error:', error);
      throw error;
    }
  }

  /**
   * Schedule activities within the itinerary
   */
  async scheduleActivities(data, context) {
    const activities = data.activities || [];
    const days = data.days || [];
    const preferences = data.preferences || {};
    
    const prompt = `Schedule these activities optimally within the travel itinerary:

Activities to Schedule:
${activities.map((a, i) => `${i + 1}. ${a.name} - Duration: ${a.duration || '2-3 hours'}, Type: ${a.type}`).join('\n')}

Available Days:
${days.map(d => `${d.date} - ${d.location}`).join('\n')}

Traveler Preferences:
- Pace: ${preferences.pace || 'moderate'}
- Interests: ${preferences.interests?.join(', ') || 'general'}
- Physical ability: ${preferences.physicalAbility || 'average'}

Consider:
1. Opening hours and best visit times
2. Geographic proximity (minimize travel between activities)
3. Activity type variety (mix of cultural, active, relaxation)
4. Meal times and breaks
5. Energy levels throughout the day
6. Weather/season considerations

Create an optimized schedule with specific times and logistics.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.5,
        maxTokens: 2000
      });
      
      const schedule = this.parseAIResponse(response);
      
      // Validate scheduling constraints
      const validated = this.validateSchedule(schedule, activities);
      
      // Add logistics and timing details
      const detailed = await this.addScheduleDetails(validated, data.location);
      
      return {
        schedule: detailed,
        summary: this.generateScheduleSummary(detailed),
        warnings: this.identifySchedulingConflicts(detailed)
      };
      
    } catch (error) {
      console.error('Activity scheduling error:', error);
      throw error;
    }
  }

  /**
   * Plan transportation for the itinerary
   */
  async planTransportation(data, context) {
    const segments = data.segments || this.createSegments(data.destinations);
    const dates = data.dates || {};
    const budget = data.budget;
    const preferences = data.preferences || {};
    
    const prompt = `Plan transportation for these travel segments:

${segments.map((s, i) => `Segment ${i + 1}: ${s.from} to ${s.to} on ${s.date || 'TBD'}`).join('\n')}

Budget: ${budget ? `$${budget} for transportation` : 'Flexible'}
Preferences: 
- Comfort level: ${preferences.comfort || 'standard'}
- Time vs Cost priority: ${preferences.priority || 'balanced'}
- Preferred modes: ${preferences.modes?.join(', ') || 'all options'}

For each segment provide:
1. Recommended transportation mode with reasoning
2. Specific options (airlines/trains/buses) with times and costs
3. Booking tips and advance purchase recommendations  
4. Alternative options
5. Total journey time including connections
6. Important notes (baggage, documentation, etc.)

Consider connections, layovers, and local transportation needs.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.4,
        maxTokens: 2000
      });
      
      const transportation = this.parseAIResponse(response);
      
      // Enhance with real-time availability if possible
      const enhanced = await this.enhanceTransportationOptions(transportation, segments);
      
      // Calculate total costs and times
      const summary = this.summarizeTransportation(enhanced);
      
      return {
        transportation: enhanced,
        summary,
        bookingPriority: this.prioritizeBookings(enhanced)
      };
      
    } catch (error) {
      console.error('Transportation planning error:', error);
      throw error;
    }
  }

  /**
   * Build multi-city itinerary with complex routing
   */
  async buildMultiCityItinerary(data, context) {
    // First optimize the route
    const routeResult = await this.optimizeRoute(data, context);
    
    // Then build detailed itinerary for optimized route
    const itineraryData = {
      ...data,
      destinations: routeResult.route.optimizedOrder
    };
    
    const itineraryResult = await this.buildCompleteItinerary(itineraryData, context);
    
    // Plan transportation between cities
    const transportData = {
      segments: this.createSegments(routeResult.route.optimizedOrder),
      dates: data.dates,
      budget: data.budget,
      preferences: data.preferences
    };
    
    const transportResult = await this.planTransportation(transportData, context);
    
    // Combine all results
    return {
      route: routeResult.route,
      itinerary: itineraryResult.itinerary,
      transportation: transportResult.transportation,
      summary: {
        totalDays: itineraryResult.itinerary.overview.totalDays,
        totalCost: this.calculateTotalCost(itineraryResult, transportResult),
        destinations: routeResult.route.optimizedOrder,
        highlights: itineraryResult.itinerary.overview.highlights
      },
      metadata: {
        confidence: 0.9,
        optimized: true,
        completeness: 'full'
      }
    };
  }

  // Helper methods

  /**
   * Normalize destinations input
   */
  normalizeDestinations(destinations) {
    if (Array.isArray(destinations)) {
      return destinations;
    }
    if (typeof destinations === 'string') {
      return destinations.split(/[,;→]/).map(d => d.trim());
    }
    return [];
  }

  /**
   * Normalize dates input
   */
  normalizeDates(dates) {
    if (typeof dates === 'object' && dates.start && dates.end) {
      return dates;
    }
    
    // Try to parse various date formats
    return {
      start: this.parseDate(dates.start || dates),
      end: this.parseDate(dates.end || dates)
    };
  }

  /**
   * Parse date string
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Date parsing error:', error);
    }
    
    return dateStr;
  }

  /**
   * Optimize itinerary structure
   */
  async optimizeItinerary(itinerary, originalData) {
    // Check for optimization opportunities
    const optimizations = [];
    
    // Check activity clustering
    itinerary.days?.forEach(day => {
      const activityLocations = day.activities?.map(a => a.location) || [];
      const clusters = this.identifyClusters(activityLocations);
      
      if (clusters.length > 1) {
        // Reorder activities by location cluster
        day.activities = this.reorderByCluster(day.activities, clusters);
        optimizations.push(`Reordered activities on ${day.date} for efficiency`);
      }
    });
    
    // Check transportation timing
    this.optimizeTransportationTiming(itinerary);
    
    return itinerary;
  }

  /**
   * Enhance itinerary with calculations
   */
  enhanceItinerary(itinerary, originalData) {
    // Calculate totals
    let totalCost = 0;
    let totalActivities = 0;
    
    itinerary.days?.forEach(day => {
      // Sum costs
      const dayCost = 
        (day.accommodation?.cost || 0) +
        (day.activities?.reduce((sum, a) => sum + (a.cost || 0), 0) || 0) +
        (day.meals?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0) +
        (day.transportation?.reduce((sum, t) => sum + (t.cost || 0), 0) || 0);
      
      day.totalCost = dayCost;
      totalCost += dayCost;
      
      // Count activities
      totalActivities += day.activities?.length || 0;
    });
    
    // Update overview
    itinerary.overview = {
      ...itinerary.overview,
      totalCost,
      totalActivities,
      averageDailyCost: totalCost / (itinerary.days?.length || 1),
      costPerPerson: totalCost / (originalData.travelers || 1)
    };
    
    return itinerary;
  }

  /**
   * Create travel segments from destinations
   */
  createSegments(destinations) {
    const segments = [];
    
    for (let i = 0; i < destinations.length - 1; i++) {
      segments.push({
        from: destinations[i],
        to: destinations[i + 1],
        sequence: i + 1
      });
    }
    
    return segments;
  }

  /**
   * Calculate total cost across components
   */
  calculateTotalCost(itineraryResult, transportResult) {
    const itineraryCost = itineraryResult.itinerary.overview.totalCost || 0;
    const transportCost = transportResult.summary?.totalCost || 0;
    
    return itineraryCost + transportCost;
  }

  /**
   * Validate route optimization
   */
  validateRoute(route, originalDestinations) {
    // Ensure all destinations are included
    const routeSet = new Set(route.optimizedOrder);
    const originalSet = new Set(originalDestinations);
    
    if (routeSet.size !== originalSet.size) {
      console.warn('Route optimization missing destinations');
    }
    
    return route;
  }

  /**
   * Calculate route metrics
   */
  async calculateRouteMetrics(route) {
    // This would ideally use a real distance/time API
    return {
      totalDistance: route.totalDistance || 'TBD',
      totalTravelTime: route.totalTime || 'TBD',
      segmentCount: route.optimizedOrder.length - 1,
      efficiency: route.efficiency || 0.85
    };
  }

  /**
   * Generate schedule summary
   */
  generateScheduleSummary(schedule) {
    const totalActivities = schedule.days?.reduce((sum, day) => 
      sum + (day.activities?.length || 0), 0) || 0;
    
    const activityTypes = {};
    schedule.days?.forEach(day => {
      day.activities?.forEach(activity => {
        const type = activity.type || 'other';
        activityTypes[type] = (activityTypes[type] || 0) + 1;
      });
    });
    
    return {
      totalActivities,
      activityTypes,
      averagePerDay: totalActivities / (schedule.days?.length || 1),
      busiest

: schedule.days?.reduce((max, day) => 
        day.activities?.length > (max.activities?.length || 0) ? day : max, {})
    };
  }

  /**
   * Get required result fields
   */
  getRequiredResultFields() {
    return ['itinerary'];
  }

  /**
   * Perform result validation
   */
  async performResultValidation(result) {
    if (!result.itinerary && !result.route && !result.schedule) {
      return { valid: false, reason: 'No itinerary, route, or schedule in result' };
    }
    
    // Validate itinerary structure if present
    if (result.itinerary) {
      if (!result.itinerary.days || result.itinerary.days.length === 0) {
        return { valid: false, reason: 'Itinerary missing days' };
      }
    }
    
    return { valid: true };
  }

  /**
   * Optimize transportation timing in itinerary
   */
  optimizeTransportationTiming(itinerary) {
    if (!itinerary.days) return;
    
    itinerary.days.forEach((day, index) => {
      if (day.transportation && day.transportation.length > 0) {
        // Sort transportation by time
        day.transportation.sort((a, b) => {
          const timeA = this.parseTime(a.time);
          const timeB = this.parseTime(b.time);
          return timeA - timeB;
        });
        
        // Check for conflicts with activities
        if (day.activities && day.activities.length > 0) {
          day.activities.forEach(activity => {
            const activityTime = this.parseTime(activity.time);
            
            // Check if any transportation conflicts with activities
            day.transportation.forEach(transport => {
              const transportTime = this.parseTime(transport.time);
              const transportEndTime = transportTime + (this.parseDuration(transport.duration) || 60);
              
              if (activityTime >= transportTime && activityTime < transportEndTime) {
                // Adjust activity time to after transportation
                const newTime = this.formatTime(transportEndTime + 30); // 30 min buffer
                activity.time = newTime;
                activity.adjustedForTransport = true;
              }
            });
          });
        }
      }
    });
  }

  /**
   * Parse time string to minutes since midnight
   */
  parseTime(timeStr) {
    if (!timeStr) return 0;
    
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      return hours * 60 + minutes;
    }
    
    return 0;
  }

  /**
   * Parse duration string to minutes
   */
  parseDuration(durationStr) {
    if (!durationStr) return 60;
    
    const hours = durationStr.match(/(\d+)\s*h/);
    const minutes = durationStr.match(/(\d+)\s*m/);
    
    let total = 0;
    if (hours) total += parseInt(hours[1]) * 60;
    if (minutes) total += parseInt(minutes[1]);
    
    return total || 60;
  }

  /**
   * Format minutes to time string
   */
  formatTime(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Identify location clusters
   */
  identifyClusters(locations) {
    // Simple clustering by location similarity
    const clusters = [];
    const processed = new Set();
    
    locations.forEach((loc, i) => {
      if (processed.has(i)) return;
      
      const cluster = [i];
      processed.add(i);
      
      // Find similar locations
      for (let j = i + 1; j < locations.length; j++) {
        if (processed.has(j)) continue;
        
        if (this.areLocationsSimilar(loc, locations[j])) {
          cluster.push(j);
          processed.add(j);
        }
      }
      
      clusters.push(cluster);
    });
    
    return clusters;
  }

  /**
   * Check if two locations are similar/nearby
   */
  areLocationsSimilar(loc1, loc2) {
    if (!loc1 || !loc2) return false;
    
    // Simple string similarity check
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalize(loc1).includes(normalize(loc2)) || normalize(loc2).includes(normalize(loc1));
  }

  /**
   * Reorder activities by cluster
   */
  reorderByCluster(activities, clusters) {
    const reordered = [];
    
    clusters.forEach(cluster => {
      cluster.forEach(index => {
        if (activities[index]) {
          reordered.push(activities[index]);
        }
      });
    });
    
    return reordered;
  }

  /**
   * Calculate route savings
   */
  calculateRouteSavings(original, optimized) {
    // This would calculate actual distance/time savings
    // For now, return a mock calculation
    return {
      distanceSaved: '~15%',
      timeSaved: '~2 hours',
      efficiencyGain: 0.15
    };
  }

  /**
   * Validate schedule constraints
   */
  validateSchedule(schedule, activities) {
    // Check that all activities are scheduled
    const scheduledIds = new Set();
    
    schedule.days?.forEach(day => {
      day.activities?.forEach(activity => {
        if (activity.id) scheduledIds.add(activity.id);
      });
    });
    
    const missing = activities.filter(a => a.id && !scheduledIds.has(a.id));
    
    if (missing.length > 0) {
      console.warn(`Missing activities in schedule: ${missing.map(a => a.name).join(', ')}`);
    }
    
    return schedule;
  }

  /**
   * Add schedule details
   */
  async addScheduleDetails(schedule, location) {
    // Add detailed information to schedule
    schedule.days?.forEach(day => {
      day.activities?.forEach(activity => {
        // Add default details if missing
        if (!activity.duration) {
          activity.duration = '2-3 hours';
        }
        
        if (!activity.bookingRequired) {
          activity.bookingRequired = this.requiresBooking(activity.type);
        }
        
        if (!activity.bestTime) {
          activity.bestTime = this.getBestTime(activity.type, location);
        }
      });
    });
    
    return schedule;
  }

  /**
   * Check if activity type typically requires booking
   */
  requiresBooking(activityType) {
    const bookingRequired = ['tour', 'show', 'restaurant', 'experience', 'workshop'];
    return bookingRequired.includes(activityType?.toLowerCase());
  }

  /**
   * Get best time for activity type
   */
  getBestTime(activityType, location) {
    const bestTimes = {
      'museum': 'Morning (fewer crowds)',
      'outdoor': 'Morning or late afternoon',
      'restaurant': 'Local meal times',
      'shopping': 'Afternoon',
      'nightlife': 'Evening/Night'
    };
    
    return bestTimes[activityType?.toLowerCase()] || 'Flexible';
  }

  /**
   * Identify scheduling conflicts
   */
  identifySchedulingConflicts(schedule) {
    const conflicts = [];
    
    schedule.days?.forEach(day => {
      const timeSlots = [];
      
      // Collect all time slots
      day.activities?.forEach(activity => {
        const start = this.parseTime(activity.time);
        const duration = this.parseDuration(activity.duration);
        const end = start + duration;
        
        // Check for overlaps
        timeSlots.forEach(slot => {
          if ((start >= slot.start && start < slot.end) ||
              (end > slot.start && end <= slot.end)) {
            conflicts.push({
              date: day.date,
              conflict: `${activity.name} overlaps with ${slot.name}`,
              suggestion: 'Adjust timing or reduce duration'
            });
          }
        });
        
        timeSlots.push({ start, end, name: activity.name });
      });
    });
    
    return conflicts;
  }

  /**
   * Enhance transportation options
   */
  async enhanceTransportationOptions(transportation, segments) {
    // Add practical details to transportation options
    if (transportation.segments) {
      transportation.segments.forEach((segment, i) => {
        if (!segment.bookingWindow) {
          segment.bookingWindow = this.getBookingWindow(segment.mode);
        }
        
        if (!segment.documentation) {
          segment.documentation = this.getRequiredDocuments(segment.mode, segments[i]);
        }
      });
    }
    
    return transportation;
  }

  /**
   * Get typical booking window for transportation mode
   */
  getBookingWindow(mode) {
    const windows = {
      'flight': '2-3 months in advance for best prices',
      'train': '1-2 months in advance',
      'bus': '1-2 weeks in advance',
      'ferry': '1 month in advance',
      'car': '2-4 weeks in advance'
    };
    
    return windows[mode?.toLowerCase()] || '1 month in advance';
  }

  /**
   * Get required documents for transportation
   */
  getRequiredDocuments(mode, segment) {
    const docs = ['Valid ID'];
    
    if (mode === 'flight' && segment?.international) {
      docs.push('Passport', 'Visa (if required)');
    }
    
    if (mode === 'car') {
      docs.push('Driver\'s license', 'International driving permit (if applicable)');
    }
    
    return docs;
  }

  /**
   * Summarize transportation plan
   */
  summarizeTransportation(transportation) {
    let totalCost = 0;
    let totalTime = 0;
    const modes = new Set();
    
    transportation.segments?.forEach(segment => {
      totalCost += segment.estimatedCost || 0;
      totalTime += this.parseDuration(segment.duration) || 0;
      if (segment.mode) modes.add(segment.mode);
    });
    
    return {
      totalCost,
      totalTime: `${Math.floor(totalTime / 60)}h ${totalTime % 60}m`,
      transportModes: Array.from(modes),
      segmentCount: transportation.segments?.length || 0
    };
  }

  /**
   * Prioritize bookings by importance
   */
  prioritizeBookings(transportation) {
    const priorities = [];
    
    transportation.segments?.forEach(segment => {
      const priority = {
        segment: `${segment.from} to ${segment.to}`,
        mode: segment.mode,
        priority: this.calculateBookingPriority(segment),
        reason: segment.limitedAvailability ? 'Limited availability' : 'Standard booking'
      };
      
      priorities.push(priority);
    });
    
    // Sort by priority
    priorities.sort((a, b) => b.priority - a.priority);
    
    return priorities;
  }

  /**
   * Calculate booking priority score
   */
  calculateBookingPriority(segment) {
    let score = 5; // Base score
    
    if (segment.mode === 'flight') score += 3;
    if (segment.international) score += 2;
    if (segment.limitedAvailability) score += 4;
    if (segment.peakSeason) score += 2;
    if (segment.popularRoute) score += 1;
    
    return score;
  }
}

export default ItineraryBuilderAgent;