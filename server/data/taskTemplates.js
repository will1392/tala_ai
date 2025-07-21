/**
 * Task Templates for Common Travel Scenarios
 * 
 * Pre-defined task templates that can be used to quickly create
 * standardized tasks for common travel agency operations.
 */

export const taskTemplates = {
  // Flight-related templates
  flight: {
    booking: {
      id: 'flight_booking',
      name: 'Flight Booking Process',
      category: 'flight',
      description: 'Complete flight booking for client',
      estimatedDuration: 45,
      priority: 'high',
      tags: ['booking', 'flight'],
      subtasks: [
        {
          title: 'Search available flights',
          description: 'Find flights matching client preferences',
          estimatedDuration: 15,
          priority: 'high'
        },
        {
          title: 'Compare prices and options',
          description: 'Compare airlines, routes, and prices',
          estimatedDuration: 10,
          priority: 'high'
        },
        {
          title: 'Confirm client selection',
          description: 'Get client approval on selected flight',
          estimatedDuration: 10,
          priority: 'high'
        },
        {
          title: 'Complete booking',
          description: 'Finalize booking and payment',
          estimatedDuration: 5,
          priority: 'high'
        },
        {
          title: 'Send confirmation',
          description: 'Email booking confirmation to client',
          estimatedDuration: 5,
          priority: 'medium'
        }
      ]
    },
    
    checkin: {
      id: 'flight_checkin',
      name: 'Flight Check-in Reminder',
      category: 'flight',
      description: 'Remind client to check in for flight',
      estimatedDuration: 10,
      priority: 'high',
      tags: ['checkin', 'flight', 'reminder'],
      reminderOffsets: [1440, 60] // 24 hours and 1 hour before
    },
    
    changes: {
      id: 'flight_changes',
      name: 'Flight Change Request',
      category: 'flight',
      description: 'Process flight change or cancellation',
      estimatedDuration: 30,
      priority: 'urgent',
      tags: ['change', 'flight', 'urgent'],
      subtasks: [
        {
          title: 'Review change policy',
          description: 'Check airline change/cancellation policy',
          estimatedDuration: 5,
          priority: 'urgent'
        },
        {
          title: 'Calculate fees',
          description: 'Determine any change or cancellation fees',
          estimatedDuration: 5,
          priority: 'urgent'
        },
        {
          title: 'Process change',
          description: 'Submit change request to airline',
          estimatedDuration: 15,
          priority: 'urgent'
        },
        {
          title: 'Update client',
          description: 'Inform client of changes and any fees',
          estimatedDuration: 5,
          priority: 'high'
        }
      ]
    }
  },
  
  // Hotel-related templates
  hotel: {
    booking: {
      id: 'hotel_booking',
      name: 'Hotel Reservation',
      category: 'hotel',
      description: 'Book hotel accommodation',
      estimatedDuration: 30,
      priority: 'high',
      tags: ['booking', 'hotel', 'accommodation'],
      subtasks: [
        {
          title: 'Search hotels',
          description: 'Find hotels in desired location',
          estimatedDuration: 10,
          priority: 'high'
        },
        {
          title: 'Check availability',
          description: 'Verify room availability for dates',
          estimatedDuration: 5,
          priority: 'high'
        },
        {
          title: 'Compare options',
          description: 'Compare amenities and prices',
          estimatedDuration: 5,
          priority: 'medium'
        },
        {
          title: 'Make reservation',
          description: 'Complete hotel booking',
          estimatedDuration: 5,
          priority: 'high'
        },
        {
          title: 'Arrange transfers',
          description: 'Book airport transfers if needed',
          estimatedDuration: 5,
          priority: 'low'
        }
      ]
    },
    
    specialRequests: {
      id: 'hotel_special_requests',
      name: 'Hotel Special Requests',
      category: 'hotel',
      description: 'Arrange special requests for hotel stay',
      estimatedDuration: 20,
      priority: 'medium',
      tags: ['hotel', 'special-request'],
      subtasks: [
        {
          title: 'Document requests',
          description: 'List all special requirements',
          estimatedDuration: 5,
          priority: 'medium'
        },
        {
          title: 'Contact hotel',
          description: 'Communicate requests to hotel',
          estimatedDuration: 10,
          priority: 'medium'
        },
        {
          title: 'Confirm arrangements',
          description: 'Get confirmation from hotel',
          estimatedDuration: 5,
          priority: 'medium'
        }
      ]
    }
  },
  
  // Visa and document templates
  visa: {
    tourist: {
      id: 'visa_tourist',
      name: 'Tourist Visa Application',
      category: 'document',
      description: 'Process tourist visa application',
      estimatedDuration: 180,
      priority: 'urgent',
      tags: ['visa', 'document', 'tourist'],
      subtasks: [
        {
          title: 'Check visa requirements',
          description: 'Verify visa requirements for destination',
          estimatedDuration: 15,
          priority: 'urgent',
          daysBeforeDue: 60
        },
        {
          title: 'Gather documents',
          description: 'Collect passport, photos, and supporting documents',
          estimatedDuration: 60,
          priority: 'urgent',
          daysBeforeDue: 45
        },
        {
          title: 'Fill application form',
          description: 'Complete visa application form',
          estimatedDuration: 30,
          priority: 'high',
          daysBeforeDue: 40
        },
        {
          title: 'Schedule appointment',
          description: 'Book visa appointment',
          estimatedDuration: 15,
          priority: 'high',
          daysBeforeDue: 35
        },
        {
          title: 'Attend appointment',
          description: 'Submit application and biometrics',
          estimatedDuration: 60,
          priority: 'urgent',
          daysBeforeDue: 30
        },
        {
          title: 'Track application',
          description: 'Monitor visa processing status',
          estimatedDuration: 15,
          priority: 'medium',
          recurring: 'weekly'
        },
        {
          title: 'Collect passport',
          description: 'Retrieve passport with visa',
          estimatedDuration: 30,
          priority: 'high'
        }
      ]
    },
    
    business: {
      id: 'visa_business',
      name: 'Business Visa Application',
      category: 'document',
      description: 'Process business visa application',
      estimatedDuration: 240,
      priority: 'urgent',
      tags: ['visa', 'document', 'business'],
      subtasks: [
        {
          title: 'Obtain invitation letter',
          description: 'Get business invitation from host company',
          estimatedDuration: 30,
          priority: 'urgent',
          daysBeforeDue: 75
        },
        {
          title: 'Gather business documents',
          description: 'Collect company registration, employment letter',
          estimatedDuration: 45,
          priority: 'urgent',
          daysBeforeDue: 60
        },
        {
          title: 'Prepare financial documents',
          description: 'Bank statements and financial proof',
          estimatedDuration: 30,
          priority: 'high',
          daysBeforeDue: 55
        },
        // ... additional steps similar to tourist visa
      ]
    }
  },
  
  // Travel insurance templates
  insurance: {
    standard: {
      id: 'insurance_standard',
      name: 'Travel Insurance',
      category: 'document',
      description: 'Arrange travel insurance coverage',
      estimatedDuration: 30,
      priority: 'medium',
      tags: ['insurance', 'document'],
      subtasks: [
        {
          title: 'Assess coverage needs',
          description: 'Determine required coverage levels',
          estimatedDuration: 10,
          priority: 'medium'
        },
        {
          title: 'Compare policies',
          description: 'Compare insurance providers and policies',
          estimatedDuration: 10,
          priority: 'medium'
        },
        {
          title: 'Purchase policy',
          description: 'Complete insurance purchase',
          estimatedDuration: 5,
          priority: 'medium'
        },
        {
          title: 'Send policy details',
          description: 'Email policy information to client',
          estimatedDuration: 5,
          priority: 'medium'
        }
      ]
    }
  },
  
  // Activity and tour templates
  activities: {
    tours: {
      id: 'activity_tours',
      name: 'Book Tours and Activities',
      category: 'activity',
      description: 'Reserve tours and activities',
      estimatedDuration: 45,
      priority: 'low',
      tags: ['activity', 'tour', 'booking'],
      subtasks: [
        {
          title: 'Research activities',
          description: 'Find suitable tours and activities',
          estimatedDuration: 20,
          priority: 'low'
        },
        {
          title: 'Check availability',
          description: 'Verify tour availability for dates',
          estimatedDuration: 10,
          priority: 'low'
        },
        {
          title: 'Make reservations',
          description: 'Book selected activities',
          estimatedDuration: 10,
          priority: 'low'
        },
        {
          title: 'Send confirmations',
          description: 'Email activity details to client',
          estimatedDuration: 5,
          priority: 'low'
        }
      ]
    },
    
    dining: {
      id: 'activity_dining',
      name: 'Restaurant Reservations',
      category: 'activity',
      description: 'Book restaurant reservations',
      estimatedDuration: 20,
      priority: 'low',
      tags: ['dining', 'restaurant', 'booking'],
      subtasks: [
        {
          title: 'Select restaurants',
          description: 'Choose restaurants based on preferences',
          estimatedDuration: 10,
          priority: 'low'
        },
        {
          title: 'Make reservations',
          description: 'Book tables at selected restaurants',
          estimatedDuration: 10,
          priority: 'low'
        }
      ]
    }
  },
  
  // Complete trip planning
  trips: {
    leisureTrip: {
      id: 'trip_leisure',
      name: 'Complete Leisure Trip Planning',
      category: 'trip',
      description: 'Plan complete leisure vacation',
      estimatedDuration: 300,
      priority: 'high',
      tags: ['trip', 'leisure', 'complete'],
      phases: [
        {
          name: 'Initial Planning',
          daysBeforeTrip: 90,
          tasks: ['visa_tourist', 'insurance_standard']
        },
        {
          name: 'Bookings',
          daysBeforeTrip: 60,
          tasks: ['flight_booking', 'hotel_booking']
        },
        {
          name: 'Activities',
          daysBeforeTrip: 30,
          tasks: ['activity_tours', 'activity_dining']
        },
        {
          name: 'Pre-departure',
          daysBeforeTrip: 7,
          tasks: ['flight_checkin']
        }
      ]
    },
    
    businessTrip: {
      id: 'trip_business',
      name: 'Business Trip Arrangement',
      category: 'trip',
      description: 'Arrange business travel',
      estimatedDuration: 180,
      priority: 'urgent',
      tags: ['trip', 'business', 'urgent'],
      phases: [
        {
          name: 'Documentation',
          daysBeforeTrip: 75,
          tasks: ['visa_business']
        },
        {
          name: 'Travel Arrangements',
          daysBeforeTrip: 30,
          tasks: ['flight_booking', 'hotel_booking', 'insurance_standard']
        },
        {
          name: 'Ground Transportation',
          daysBeforeTrip: 14,
          tasks: ['transfer_airport']
        }
      ]
    }
  },
  
  // Emergency templates
  emergency: {
    lostPassport: {
      id: 'emergency_lost_passport',
      name: 'Lost Passport Assistance',
      category: 'emergency',
      description: 'Help with lost passport',
      estimatedDuration: 120,
      priority: 'urgent',
      tags: ['emergency', 'passport', 'urgent'],
      subtasks: [
        {
          title: 'Report to police',
          description: 'File police report for lost passport',
          estimatedDuration: 30,
          priority: 'urgent'
        },
        {
          title: 'Contact embassy',
          description: 'Report loss to embassy/consulate',
          estimatedDuration: 20,
          priority: 'urgent'
        },
        {
          title: 'Gather documents',
          description: 'Collect required documents for replacement',
          estimatedDuration: 30,
          priority: 'urgent'
        },
        {
          title: 'Apply for replacement',
          description: 'Submit emergency passport application',
          estimatedDuration: 30,
          priority: 'urgent'
        },
        {
          title: 'Arrange travel docs',
          description: 'Get temporary travel documents',
          estimatedDuration: 10,
          priority: 'urgent'
        }
      ]
    },
    
    medicalEmergency: {
      id: 'emergency_medical',
      name: 'Medical Emergency Support',
      category: 'emergency',
      description: 'Assist with medical emergency',
      estimatedDuration: 60,
      priority: 'urgent',
      tags: ['emergency', 'medical', 'urgent'],
      subtasks: [
        {
          title: 'Contact insurance',
          description: 'Notify travel insurance provider',
          estimatedDuration: 15,
          priority: 'urgent'
        },
        {
          title: 'Arrange medical care',
          description: 'Find appropriate medical facility',
          estimatedDuration: 15,
          priority: 'urgent'
        },
        {
          title: 'Communication support',
          description: 'Help with language/communication',
          estimatedDuration: 20,
          priority: 'urgent'
        },
        {
          title: 'Document for claims',
          description: 'Collect documentation for insurance',
          estimatedDuration: 10,
          priority: 'high'
        }
      ]
    }
  }
};

// Helper function to get template by ID
export function getTaskTemplate(templateId) {
  for (const category of Object.values(taskTemplates)) {
    for (const template of Object.values(category)) {
      if (template.id === templateId) {
        return template;
      }
    }
  }
  return null;
}

// Helper function to get templates by category
export function getTemplatesByCategory(category) {
  return taskTemplates[category] || {};
}

// Helper function to create task data from template
export function createTaskFromTemplate(template, overrides = {}) {
  const baseTask = {
    title: template.name,
    description: template.description,
    priority: template.priority,
    estimatedDuration: template.estimatedDuration,
    tags: template.tags,
    travelType: template.category,
    ...overrides
  };
  
  // Handle subtasks if present
  if (template.subtasks) {
    baseTask.subtasks = template.subtasks.map(subtask => ({
      ...subtask,
      travelType: template.category,
      tags: [...(template.tags || []), 'subtask']
    }));
  }
  
  return baseTask;
}

// Helper function for trip templates with phases
export function createTripTasks(tripTemplate, tripData) {
  const { startDate, endDate, destination, travelers } = tripData;
  const tasks = [];
  
  if (!tripTemplate.phases) return tasks;
  
  for (const phase of tripTemplate.phases) {
    const phaseDate = new Date(startDate);
    phaseDate.setDate(phaseDate.getDate() - phase.daysBeforeTrip);
    
    for (const taskTemplateId of phase.tasks) {
      const template = getTaskTemplate(taskTemplateId);
      if (template) {
        const taskData = createTaskFromTemplate(template, {
          dueDate: phaseDate,
          customFields: {
            tripStartDate: startDate,
            tripEndDate: endDate,
            destination,
            travelers,
            phase: phase.name
          }
        });
        
        tasks.push(taskData);
      }
    }
  }
  
  return tasks;
}

export default taskTemplates;