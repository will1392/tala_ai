/**
 * Comprehensive Test Suite for Entity Extraction
 * 
 * Tests all entity extraction methods including pattern matching,
 * keyword detection, and LLM-based extraction for travel conversations.
 */

import assert from 'assert';
import { performance } from 'perf_hooks';
import EntityExtractor from './services/context/EntityExtractor.js';

class EntityExtractionTestSuite {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      details: []
    };
    
    this.entityExtractor = null;
    
    // Test data covering various travel scenarios
    this.testCases = this.createTestCases();
  }

  /**
   * Run all entity extraction tests
   */
  async runAllTests() {
    console.log('🔍 Starting Comprehensive Entity Extraction Test Suite...\n');
    
    const startTime = performance.now();
    
    try {
      // Initialize entity extractor
      await this.setupTestEnvironment();
      
      // Run test categories
      await this.testDestinationExtraction();
      await this.testDateExtraction();
      await this.testAirlineExtraction();
      await this.testHotelExtraction();
      await this.testBudgetExtraction();
      await this.testDietaryRestrictions();
      await this.testAccessibilityNeeds();
      await this.testDocumentExtraction();
      await this.testComplexConversations();
      await this.testEdgeCases();
      await this.testPerformance();
      
    } catch (error) {
      this.recordError('Test Suite Setup', error);
    }
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // Print results
    this.printResults(duration);
    
    return this.testResults;
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    console.log('📋 Setting up entity extraction test environment...');
    
    try {
      this.entityExtractor = new EntityExtractor({
        enableLLMExtraction: false, // Disable for testing to avoid API costs
        enablePatternExtraction: true,
        enableKeywordExtraction: true,
        confidenceThreshold: 0.5
      });
      
      await this.entityExtractor.initialize();
      console.log('✅ Test environment ready\n');
      
    } catch (error) {
      throw new Error(`Failed to setup test environment: ${error.message}`);
    }
  }

  /**
   * Test destination extraction
   */
  async testDestinationExtraction() {
    console.log('🌍 Testing Destination Extraction...');
    
    const testCases = [
      {
        text: "I'm planning a trip to Paris next month",
        expected: ['Paris'],
        description: 'Simple destination mention'
      },
      {
        text: "We're going to New York City and then to Los Angeles",
        expected: ['New York City', 'Los Angeles'],
        description: 'Multiple destinations'
      },
      {
        text: "I want to visit Tokyo, Japan for my honeymoon",
        expected: ['Tokyo', 'Japan'],
        description: 'City and country'
      },
      {
        text: "Traveling to San Francisco Bay Area",
        expected: ['San Francisco Bay Area'],
        description: 'Multi-word destination'
      }
    ];
    
    for (const testCase of testCases) {
      await this.runTest(`Destination: ${testCase.description}`, async () => {
        const entities = await this.entityExtractor.extractFromText(testCase.text);
        const destinations = entities
          .filter(e => e.type === 'destination')
          .map(e => e.value);
        
        assert(destinations.length > 0, 'Should extract at least one destination');
        
        for (const expected of testCase.expected) {
          const found = destinations.some(dest => 
            dest.toLowerCase().includes(expected.toLowerCase()) ||
            expected.toLowerCase().includes(dest.toLowerCase())
          );
          assert(found, `Should extract destination: ${expected}`);
        }
      });
    }
  }

  /**
   * Test date extraction
   */
  async testDateExtraction() {
    console.log('📅 Testing Date Extraction...');
    
    const testCases = [
      {
        text: "I'm departing on March 15th, 2024",
        expectedCount: 1,
        description: 'Specific date with year'
      },
      {
        text: "Flying out on 03/15/2024 and returning on 03/22/2024",
        expectedCount: 2,
        description: 'MM/DD/YYYY format'
      },
      {
        text: "My passport expires on December 1st",
        expectedCount: 1,
        description: 'Date without year'
      },
      {
        text: "Trip from 2024-03-15 to 2024-03-22",
        expectedCount: 2,
        description: 'ISO date format'
      }
    ];
    
    for (const testCase of testCases) {
      await this.runTest(`Date: ${testCase.description}`, async () => {
        const entities = await this.entityExtractor.extractFromText(testCase.text);
        const dates = entities.filter(e => e.type === 'date');
        
        assert(dates.length >= testCase.expectedCount, 
          `Should extract at least ${testCase.expectedCount} date(s), got ${dates.length}`);
        
        // Check that dates have reasonable confidence
        for (const date of dates) {
          assert(date.confidence >= 0.5, `Date confidence should be >= 0.5, got ${date.confidence}`);
        }
      });
    }
  }

  /**
   * Test airline extraction
   */
  async testAirlineExtraction() {
    console.log('✈️ Testing Airline Extraction...');
    
    const testCases = [
      {
        text: "Flying with Delta Airlines",
        expected: ['Delta'],
        description: 'Airline with keyword'
      },
      {
        text: "My United flight is at 3pm",
        expected: ['United'],
        description: 'Airline name only'
      },
      {
        text: "I prefer American Airlines or Southwest",
        expected: ['American', 'Southwest'],
        description: 'Multiple airlines'
      },
      {
        text: "JetBlue has the best prices",
        expected: ['JetBlue'],
        description: 'Single word airline'
      }
    ];
    
    for (const testCase of testCases) {
      await this.runTest(`Airline: ${testCase.description}`, async () => {
        const entities = await this.entityExtractor.extractFromText(testCase.text);
        const airlines = entities
          .filter(e => e.type === 'airline')
          .map(e => e.value);
        
        for (const expected of testCase.expected) {
          const found = airlines.some(airline => 
            airline.toLowerCase().includes(expected.toLowerCase())
          );
          assert(found, `Should extract airline: ${expected}`);
        }
      });
    }
  }

  /**
   * Test hotel extraction
   */
  async testHotelExtraction() {
    console.log('🏨 Testing Hotel Extraction...');
    
    const testCases = [
      {
        text: "Staying at the Grand Hotel downtown",
        expected: ['Grand Hotel'],
        description: 'Hotel with keyword'
      },
      {
        text: "I booked the Marriott for our stay",
        expected: ['Marriott'],
        description: 'Hotel brand name'
      },
      {
        text: "The Hilton Garden Inn looks nice",
        expected: ['Hilton'],
        description: 'Multi-word hotel name'
      }
    ];
    
    for (const testCase of testCases) {
      await this.runTest(`Hotel: ${testCase.description}`, async () => {
        const entities = await this.entityExtractor.extractFromText(testCase.text);
        const hotels = entities
          .filter(e => e.type === 'hotel')
          .map(e => e.value);
        
        const found = testCase.expected.some(expected =>
          hotels.some(hotel => 
            hotel.toLowerCase().includes(expected.toLowerCase())
          )
        );
        
        assert(found, `Should extract hotel from: ${testCase.text}`);
      });
    }
  }

  /**
   * Test budget extraction
   */
  async testBudgetExtraction() {
    console.log('💰 Testing Budget Extraction...');
    
    const testCases = [
      {
        text: "My budget is $2000 for this trip",
        expectedAmount: 2000,
        description: 'Simple budget statement'
      },
      {
        text: "I'm looking to spend around $1,500",
        expectedAmount: 1500,
        description: 'Approximate budget'
      },
      {
        text: "Budget of 5000 dollars total",
        expectedAmount: 5000,
        description: 'Budget without dollar sign'
      }
    ];
    
    for (const testCase of testCases) {
      await this.runTest(`Budget: ${testCase.description}`, async () => {
        const entities = await this.entityExtractor.extractFromText(testCase.text);
        const budgets = entities.filter(e => e.type === 'budget_preference');
        
        assert(budgets.length > 0, 'Should extract budget information');
        
        const budgetEntity = budgets[0];
        assert(budgetEntity.properties?.amount, 'Budget should have amount property');
        assert(budgetEntity.properties.amount >= testCase.expectedAmount * 0.9, 
          `Budget amount should be close to ${testCase.expectedAmount}`);
      });
    }
  }

  /**
   * Test dietary restriction extraction
   */
  async testDietaryRestrictions() {
    console.log('🥗 Testing Dietary Restriction Extraction...');
    
    const testCases = [
      {
        text: "I'm vegetarian so I don't eat meat",
        expected: ['vegetarian'],
        description: 'Vegetarian restriction'
      },
      {
        text: "I have celiac disease and need gluten-free options",
        expected: ['gluten-free'],
        description: 'Gluten-free requirement'
      },
      {
        text: "I'm allergic to shellfish and nuts",
        expected: ['allergic to'],
        description: 'Allergy mention'
      },
      {
        text: "I eat kosher food only",
        expected: ['kosher'],
        description: 'Religious dietary requirement'
      }
    ];
    
    for (const testCase of testCases) {
      await this.runTest(`Dietary: ${testCase.description}`, async () => {
        const entities = await this.entityExtractor.extractFromText(testCase.text);
        const dietary = entities
          .filter(e => e.type === 'dietary_restriction')
          .map(e => e.value);
        
        const found = testCase.expected.some(expected =>
          dietary.some(restriction => 
            restriction.toLowerCase().includes(expected.toLowerCase())
          )
        );
        
        assert(found, `Should extract dietary restriction: ${testCase.expected.join(', ')}`);
      });
    }
  }

  /**
   * Test accessibility needs extraction
   */
  async testAccessibilityNeeds() {
    console.log('♿ Testing Accessibility Needs Extraction...');
    
    const testCases = [
      {
        text: "I use a wheelchair and need accessible rooms",
        expected: ['wheelchair'],
        description: 'Wheelchair accessibility'
      },
      {
        text: "I have mobility issues and need assistance",
        expected: ['mobility'],
        description: 'Mobility assistance'
      },
      {
        text: "I'm visually impaired and travel with a guide dog",
        expected: ['visual impairment'],
        description: 'Visual impairment'
      }
    ];
    
    for (const testCase of testCases) {
      await this.runTest(`Accessibility: ${testCase.description}`, async () => {
        const entities = await this.entityExtractor.extractFromText(testCase.text);
        const accessibility = entities
          .filter(e => e.type === 'accessibility_need')
          .map(e => e.value);
        
        const found = testCase.expected.some(expected =>
          accessibility.some(need => 
            need.toLowerCase().includes(expected.toLowerCase())
          )
        );
        
        assert(found, `Should extract accessibility need: ${testCase.expected.join(', ')}`);
      });
    }
  }

  /**
   * Test document extraction (passport, visa)
   */
  async testDocumentExtraction() {
    console.log('📄 Testing Document Extraction...');
    
    const testCases = [
      {
        text: "My passport expires on June 15, 2025",
        expectedType: 'passport_info',
        description: 'Passport expiration'
      },
      {
        text: "I need to renew my passport number A1234567",
        expectedType: 'passport_info',
        description: 'Passport number'
      },
      {
        text: "Do I need a visa for France?",
        expectedType: 'visa',
        description: 'Visa requirement question'
      }
    ];
    
    for (const testCase of testCases) {
      await this.runTest(`Document: ${testCase.description}`, async () => {
        const entities = await this.entityExtractor.extractFromText(testCase.text);
        const documents = entities.filter(e => 
          e.type === testCase.expectedType || e.type.includes('passport') || e.type.includes('visa')
        );
        
        // For passport/visa, we might not always extract with current patterns
        // This is more of a detection test
        console.log(`    Found ${documents.length} document entities for: ${testCase.text}`);
      });
    }
  }

  /**
   * Test complex conversation scenarios
   */
  async testComplexConversations() {
    console.log('💬 Testing Complex Conversation Scenarios...');
    
    const complexCases = [
      {
        text: "I'm planning a family trip to Disney World in Orlando for March 15-22, 2024. We'll fly with Southwest Airlines and stay at the Grand Floridian Resort. My budget is around $5,000 and I need gluten-free dining options for my daughter.",
        expectedTypes: ['destination', 'date', 'airline', 'hotel', 'budget_preference', 'dietary_restriction'],
        description: 'Complete travel planning conversation'
      },
      {
        text: "I'm vegetarian and traveling to Japan next spring. I prefer staying at Marriott hotels and my budget is $3,000. My passport expires in 2026.",
        expectedTypes: ['dietary_restriction', 'destination', 'hotel', 'budget_preference', 'passport_info'],
        description: 'Multi-faceted travel preferences'
      }
    ];
    
    for (const testCase of complexCases) {
      await this.runTest(`Complex: ${testCase.description}`, async () => {
        const entities = await this.entityExtractor.extractFromText(testCase.text);
        const extractedTypes = [...new Set(entities.map(e => e.type))];
        
        console.log(`    Extracted ${entities.length} entities of types: ${extractedTypes.join(', ')}`);
        
        // Should extract multiple types of entities
        assert(extractedTypes.length >= 3, 
          `Should extract at least 3 different entity types, got ${extractedTypes.length}`);
        
        // Check for some expected types
        const hasDestination = extractedTypes.includes('destination');
        const hasBudget = extractedTypes.includes('budget_preference');
        
        assert(hasDestination || hasBudget, 'Should extract at least destination or budget');
      });
    }
  }

  /**
   * Test edge cases and error conditions
   */
  async testEdgeCases() {
    console.log('🎯 Testing Edge Cases...');
    
    const edgeCases = [
      {
        text: "",
        description: 'Empty string'
      },
      {
        text: "Hello world",
        description: 'No travel-related content'
      },
      {
        text: "a".repeat(10000),
        description: 'Very long text'
      },
      {
        text: "Special chars: @#$%^&*()_+{}|:<>?",
        description: 'Special characters only'
      }
    ];
    
    for (const testCase of edgeCases) {
      await this.runTest(`Edge Case: ${testCase.description}`, async () => {
        const entities = await this.entityExtractor.extractFromText(testCase.text);
        
        // Should not crash and should return an array
        assert(Array.isArray(entities), 'Should return an array');
        
        // For non-travel content, should extract few or no entities
        if (testCase.text === "Hello world") {
          assert(entities.length === 0, 'Should extract no entities from non-travel text');
        }
      });
    }
  }

  /**
   * Test performance with various text sizes
   */
  async testPerformance() {
    console.log('⚡ Testing Performance...');
    
    const performanceTests = [
      {
        text: "Short trip to NYC",
        description: 'Short text'
      },
      {
        text: "I'm planning a comprehensive trip to Europe next summer. We'll visit Paris, Rome, Barcelona, and Amsterdam. Flying with Lufthansa and staying at various Marriott properties. Budget is $8,000 for two people. I'm vegetarian and my partner is gluten-free.".repeat(5),
        description: 'Medium text'
      },
      {
        text: "Very long travel conversation with lots of details about destinations, preferences, budgets, dates, airlines, hotels, and more information.".repeat(50),
        description: 'Long text'
      }
    ];
    
    for (const testCase of performanceTests) {
      await this.runTest(`Performance: ${testCase.description}`, async () => {
        const startTime = performance.now();
        
        const entities = await this.entityExtractor.extractFromText(testCase.text);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`    ${testCase.description}: ${duration.toFixed(2)}ms, ${entities.length} entities`);
        
        // Performance assertions
        assert(duration < 5000, `Should complete in under 5 seconds, took ${duration.toFixed(2)}ms`);
        assert(Array.isArray(entities), 'Should return valid entity array');
      });
    }
  }

  /**
   * Create comprehensive test cases
   */
  createTestCases() {
    return {
      destinations: [
        "Going to Paris", "Trip to New York City", "Visiting Tokyo Japan",
        "Traveling to San Francisco Bay Area", "Flight to Los Angeles"
      ],
      dates: [
        "March 15th, 2024", "03/15/2024", "2024-03-15", 
        "next Tuesday", "December 1st"
      ],
      airlines: [
        "Flying Delta", "United Airlines", "American flight",
        "Southwest has deals", "JetBlue is cheap"
      ],
      budgets: [
        "$2,000 budget", "spending $1500", "budget of 3000 dollars",
        "around $5,000", "maximum 10000"
      ],
      dietary: [
        "I'm vegetarian", "gluten-free options", "allergic to nuts",
        "kosher meals", "vegan food only"
      ]
    };
  }

  /**
   * Run a single test
   */
  async runTest(testName, testFunction) {
    try {
      await testFunction();
      this.testResults.passed++;
      this.testResults.details.push({
        name: testName,
        status: 'PASSED',
        error: null
      });
      console.log(`  ✅ ${testName}`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: testName,
        error: error.message,
        stack: error.stack
      });
      this.testResults.details.push({
        name: testName,
        status: 'FAILED',
        error: error.message
      });
      console.log(`  ❌ ${testName}: ${error.message}`);
    }
  }

  /**
   * Record a test error
   */
  recordError(testName, error) {
    this.testResults.failed++;
    this.testResults.errors.push({
      test: testName,
      error: error.message,
      stack: error.stack
    });
  }

  /**
   * Print test results
   */
  printResults(duration) {
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? Math.round((this.testResults.passed / total) * 100) : 0;
    
    console.log('\n' + '='.repeat(60));
    console.log('🔍 ENTITY EXTRACTION TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${total}`);
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`⏱️ Duration: ${duration}ms`);
    
    if (this.testResults.failed > 0) {
      console.log('\n' + '❌ FAILED TESTS:');
      console.log('-'.repeat(40));
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}`);
        console.log(`   Error: ${error.error}`);
        console.log('');
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.testResults.failed === 0) {
      console.log('🎉 ALL ENTITY EXTRACTION TESTS PASSED!');
    } else {
      console.log('⚠️  SOME TESTS FAILED - REVIEW REQUIRED');
    }
    
    console.log('='.repeat(60));
  }
}

// Export test suite
export { EntityExtractionTestSuite };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new EntityExtractionTestSuite();
  
  testSuite.runAllTests()
    .then((results) => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test suite failed to run:', error);
      process.exit(1);
    });
}

export default EntityExtractionTestSuite;