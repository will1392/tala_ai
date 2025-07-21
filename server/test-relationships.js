/**
 * Test script for Document Relationship Mapping
 * 
 * Tests the relationship mapper, document matcher, and trip builder functionality
 */

import { v4 as uuidv4 } from 'uuid';
import relationshipMapper from './services/documents/RelationshipMapper.js';
import documentMatcher from './services/documents/DocumentMatcher.js';
import tripBuilder from './services/documents/TripBuilder.js';
import relationshipVisualizer from './utils/relationshipVisualizer.js';
import { DocumentRelationship, RelationshipTypes } from './models/documentRelationships.js';

// Create test documents
const testDocuments = [
  {
    id: uuidv4(),
    type: 'flight',
    name: 'AA1234 NYC-LAX Flight',
    content: 'Flight AA1234 from New York (JFK) to Los Angeles (LAX) on March 15, 2025. Booking reference: ABC123. Passenger: John Doe',
    metadata: {
      flightNumber: 'AA1234',
      bookingReference: 'ABC123',
      departureDate: '2025-03-15T10:00:00Z',
      arrivalDate: '2025-03-15T13:00:00Z',
      origin: 'JFK',
      destination: 'LAX',
      airline: 'American Airlines',
      passengerName: 'John Doe'
    },
    createdAt: new Date('2025-01-10')
  },
  {
    id: uuidv4(),
    type: 'confirmation',
    name: 'Flight Confirmation Email',
    content: 'Your flight booking is confirmed. Reference: ABC123. Flight AA1234 on March 15, 2025.',
    metadata: {
      bookingReference: 'ABC123',
      emailDate: '2025-01-10T15:30:00Z'
    },
    createdAt: new Date('2025-01-10')
  },
  {
    id: uuidv4(),
    type: 'hotel',
    name: 'Hilton LAX Reservation',
    content: 'Hotel reservation at Hilton LAX from March 15-18, 2025. Confirmation: HTL456. Guest: John Doe',
    metadata: {
      hotelName: 'Hilton LAX',
      confirmationNumber: 'HTL456',
      checkInDate: '2025-03-15',
      checkOutDate: '2025-03-18',
      guestName: 'John Doe',
      destination: 'Los Angeles'
    },
    createdAt: new Date('2025-01-12')
  },
  {
    id: uuidv4(),
    type: 'passport',
    name: 'John Doe Passport',
    content: 'Passport Number: US1234567. Name: John Doe. Expiry: Dec 2030',
    metadata: {
      passportNumber: 'US1234567',
      holderName: 'John Doe',
      issueDate: '2020-12-01',
      expiryDate: '2030-12-01',
      nationality: 'US'
    },
    createdAt: new Date('2024-12-01')
  },
  {
    id: uuidv4(),
    type: 'flight',
    name: 'AA5678 LAX-NYC Return',
    content: 'Return flight AA5678 from Los Angeles (LAX) to New York (JFK) on March 18, 2025. Booking reference: ABC123. Passenger: John Doe',
    metadata: {
      flightNumber: 'AA5678',
      bookingReference: 'ABC123',
      departureDate: '2025-03-18T14:00:00Z',
      arrivalDate: '2025-03-18T22:00:00Z',
      origin: 'LAX',
      destination: 'JFK',
      airline: 'American Airlines',
      passengerName: 'John Doe'
    },
    createdAt: new Date('2025-01-10')
  },
  {
    id: uuidv4(),
    type: 'insurance',
    name: 'Travel Insurance Policy',
    content: 'Travel insurance for trip March 15-18, 2025. Policy: INS789. Insured: John Doe',
    metadata: {
      policyNumber: 'INS789',
      insuredName: 'John Doe',
      coverageStart: '2025-03-15',
      coverageEnd: '2025-03-18',
      provider: 'TravelGuard',
      coverageAmount: 100000
    },
    createdAt: new Date('2025-01-20')
  },
  {
    id: uuidv4(),
    type: 'amendment',
    name: 'Flight Change Notice',
    content: 'Your flight AA1234 has been changed. New departure time: 11:00 AM. Booking reference: ABC123',
    metadata: {
      bookingReference: 'ABC123',
      originalFlightNumber: 'AA1234',
      changeType: 'schedule',
      amendmentDate: '2025-02-01'
    },
    createdAt: new Date('2025-02-01')
  },
  {
    id: uuidv4(),
    type: 'visa',
    name: 'Business Visa - China',
    content: 'China Business Visa for John Doe. Valid from Jan 2025 to Jan 2026',
    metadata: {
      visaType: 'Business',
      country: 'CN',
      holderName: 'John Doe',
      issueDate: '2025-01-05',
      expiryDate: '2026-01-05',
      passportNumber: 'US1234567'
    },
    createdAt: new Date('2025-01-05')
  }
];

// Additional orphaned document
const orphanedDocument = {
  id: uuidv4(),
  type: 'hotel',
  name: 'Marriott Tokyo Booking',
  content: 'Hotel reservation at Marriott Tokyo for June 2025',
  metadata: {
    hotelName: 'Marriott Tokyo',
    checkInDate: '2025-06-10',
    checkOutDate: '2025-06-15',
    destination: 'Tokyo'
  },
  createdAt: new Date('2025-01-25')
};

async function testRelationshipMapping() {
  console.log('🔍 Testing Document Relationship Mapping\n');
  console.log('=' .repeat(60));

  // Test 1: Document Matching
  console.log('\n1️⃣ Testing Document Matcher');
  console.log('-'.repeat(40));
  
  const bookingMatches = await documentMatcher.matchByBookingReferences(testDocuments);
  console.log(`✅ Found ${bookingMatches.length} booking reference matches`);
  bookingMatches.forEach(match => {
    console.log(`   - ${match.matchedValue}: ${match.documents.length} documents (confidence: ${match.confidence})`);
  });

  const tripDocuments = await documentMatcher.identifySameTripDocuments(testDocuments);
  console.log(`✅ Identified ${tripDocuments.length} trip groups`);
  
  // Test passport linking
  const passports = testDocuments.filter(d => d.type === 'passport');
  const bookings = testDocuments.filter(d => ['flight', 'hotel'].includes(d.type));
  const passportLinks = await documentMatcher.linkPassportsToBookings(passports, bookings);
  console.log(`✅ Linked ${passportLinks.length} passports to bookings`);

  // Test 2: Relationship Identification
  console.log('\n2️⃣ Testing Relationship Mapper');
  console.log('-'.repeat(40));
  
  const relationships = await relationshipMapper.identifyRelationships(testDocuments);
  console.log(`✅ Identified ${relationships.relationships.length} relationships`);
  console.log(`✅ Created ${relationships.clusters.length} document clusters`);
  console.log(`✅ Found ${relationships.dependencies.dependencies.length} dependencies`);
  
  console.log('\n📊 Relationship Statistics:');
  Object.entries(relationships.statistics.relationshipTypes).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count}`);
  });
  
  console.log(`\n🎯 Average Confidence: ${relationships.statistics.averageConfidence.toFixed(2)}`);

  // Test 3: Trip Building
  console.log('\n3️⃣ Testing Trip Builder');
  console.log('-'.repeat(40));
  
  const allDocs = [...testDocuments, orphanedDocument];
  const tripResults = await tripBuilder.buildTrips(allDocs, relationships.relationships);
  
  console.log(`✅ Built ${tripResults.trips.length} trips`);
  console.log(`⚠️  Found ${tripResults.orphanedDocuments.length} orphaned documents`);
  
  tripResults.trips.forEach((trip, index) => {
    console.log(`\n🧳 Trip ${index + 1}: ${trip.name}`);
    console.log(`   Type: ${trip.type}`);
    console.log(`   Status: ${trip.status}`);
    console.log(`   Documents: ${trip.documents.length}`);
    console.log(`   Duration: ${trip.metadata.duration} days`);
    console.log(`   Completeness: ${trip.completeness.overall}%`);
    
    if (trip.missingDocuments.length > 0) {
      console.log(`   ⚠️  Missing Documents:`);
      trip.missingDocuments.forEach(missing => {
        console.log(`      - ${missing.type}: ${missing.reason}`);
      });
    }
  });

  if (tripResults.orphanedDocuments.length > 0) {
    console.log('\n🔍 Orphaned Documents:');
    tripResults.orphanedDocuments.forEach(doc => {
      console.log(`   - ${doc.type}: ${doc.name}`);
    });
  }

  // Test 4: Visualization
  console.log('\n4️⃣ Testing Relationship Visualizer');
  console.log('-'.repeat(40));
  
  const graph = relationshipVisualizer.generateRelationshipGraph(
    testDocuments, 
    relationships.relationships,
    { calculateLayout: true, showClusters: true }
  );
  
  console.log(`✅ Generated graph with ${graph.nodes.length} nodes and ${graph.edges.length} edges`);
  console.log(`✅ Identified ${graph.clusters.length} visual clusters`);
  
  // Create timeline
  const timeline = relationshipVisualizer.createTimelineVisualization(
    testDocuments,
    tripResults.trips[0]
  );
  
  console.log(`✅ Created timeline with ${timeline.events.length} events across ${timeline.lanes.length} lanes`);
  
  // Test hierarchy
  const hierarchy = relationshipVisualizer.buildDocumentHierarchy(
    testDocuments,
    relationships.relationships
  );
  
  console.log(`✅ Built hierarchy with depth ${hierarchy.metadata.depth} and ${hierarchy.metadata.totalNodes} nodes`);

  // Test orphan analysis
  const orphanAnalysis = relationshipVisualizer.identifyOrphanedDocuments(
    allDocs,
    relationships.relationships,
    relationships.clusters
  );
  
  console.log(`\n📈 Orphan Analysis:`);
  console.log(`   - Total orphaned: ${orphanAnalysis.count} (${orphanAnalysis.percentage.toFixed(1)}%)`);
  console.log(`   - Suggestions generated: ${orphanAnalysis.suggestions.length}`);

  // Test 5: Export Formats
  console.log('\n5️⃣ Testing Export Formats');
  console.log('-'.repeat(40));
  
  const exportFormats = ['json', 'dot', 'graphml', 'cytoscape'];
  exportFormats.forEach(format => {
    const exported = relationshipVisualizer.exportRelationshipMap(
      testDocuments,
      relationships.relationships,
      { format }
    );
    console.log(`✅ Exported to ${format} format (${typeof exported === 'string' ? exported.length + ' chars' : 'object'})`);
  });

  // Test 6: Specific Relationship Types
  console.log('\n6️⃣ Testing Specific Relationships');
  console.log('-'.repeat(40));
  
  const bookingConfirmations = relationships.relationships.filter(r => r.type === 'BOOKING_CONFIRMATION');
  const prerequisites = relationships.relationships.filter(r => r.type === 'PREREQUISITE');
  const amendments = relationships.relationships.filter(r => r.type === 'AMENDMENT');
  const supplements = relationships.relationships.filter(r => r.type === 'SUPPLEMENT');
  
  console.log(`✅ Booking Confirmations: ${bookingConfirmations.length}`);
  console.log(`✅ Prerequisites: ${prerequisites.length}`);
  console.log(`✅ Amendments: ${amendments.length}`);
  console.log(`✅ Supplements: ${supplements.length}`);

  // Display detailed relationships
  console.log('\n📋 Detailed Relationships:');
  relationships.relationships.slice(0, 5).forEach(rel => {
    const source = testDocuments.find(d => d.id === rel.sourceId);
    const target = testDocuments.find(d => d.id === rel.targetId);
    console.log(`\n   ${source?.name || 'Unknown'} → ${target?.name || 'Unknown'}`);
    console.log(`   Type: ${rel.type}`);
    console.log(`   Confidence: ${(rel.confidence * 100).toFixed(0)}%`);
    if (rel.metadata && Object.keys(rel.metadata).length > 0) {
      console.log(`   Metadata:`, rel.metadata);
    }
  });

  // Test fuzzy matching
  console.log('\n7️⃣ Testing Fuzzy Matching');
  console.log('-'.repeat(40));
  
  const fuzzyResults = await documentMatcher.performFuzzyMatching(testDocuments, {
    threshold: 0.7
  });
  
  console.log(`✅ Exact matches: ${fuzzyResults.exactMatches.length}`);
  console.log(`✅ Fuzzy matches: ${fuzzyResults.fuzzyMatches.length}`);
  console.log(`✅ Potential matches: ${fuzzyResults.potentialMatches.length}`);
  
  console.log('\n🔤 Extracted Entities:');
  Object.entries(fuzzyResults.entities).forEach(([type, values]) => {
    if (values.length > 0) {
      console.log(`   ${type}: ${values.length} unique values`);
      console.log(`      Examples: ${values.slice(0, 3).join(', ')}`);
    }
  });

  console.log('\n\n✨ Document Relationship Mapping Test Complete!');
  console.log('=' .repeat(60));
}

// Run the test
testRelationshipMapping().catch(console.error);