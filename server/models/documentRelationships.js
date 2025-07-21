/**
 * Document Relationships Model
 * 
 * Defines relationship types and structures for document connections
 */

export const RelationshipTypes = {
  // Primary relationship types
  BOOKING_CONFIRMATION: {
    id: 'BOOKING_CONFIRMATION',
    name: 'Booking Confirmation',
    description: 'Links a booking to its confirmation',
    bidirectional: true,
    icon: 'link',
    color: '#10b981',
    examples: [
      { source: 'flight booking', target: 'confirmation email' },
      { source: 'hotel reservation', target: 'booking confirmation' }
    ]
  },

  TRIP_DOCUMENT: {
    id: 'TRIP_DOCUMENT',
    name: 'Trip Document',
    description: 'Documents belonging to the same trip',
    bidirectional: true,
    icon: 'map-pin',
    color: '#3b82f6',
    examples: [
      { source: 'flight ticket', target: 'hotel booking' },
      { source: 'itinerary', target: 'boarding pass' }
    ]
  },

  PREREQUISITE: {
    id: 'PREREQUISITE',
    name: 'Prerequisite',
    description: 'Document required before another',
    bidirectional: false,
    icon: 'arrow-right',
    color: '#f59e0b',
    examples: [
      { source: 'passport', target: 'visa application' },
      { source: 'visa', target: 'flight booking' }
    ]
  },

  AMENDMENT: {
    id: 'AMENDMENT',
    name: 'Amendment',
    description: 'Changes or updates to original document',
    bidirectional: false,
    icon: 'edit',
    color: '#ef4444',
    examples: [
      { source: 'flight change', target: 'original booking' },
      { source: 'updated itinerary', target: 'original itinerary' }
    ]
  },

  SUPPLEMENT: {
    id: 'SUPPLEMENT',
    name: 'Supplement',
    description: 'Additional document supporting another',
    bidirectional: false,
    icon: 'plus-circle',
    color: '#8b5cf6',
    examples: [
      { source: 'travel insurance', target: 'flight booking' },
      { source: 'visa support letter', target: 'visa application' }
    ]
  },

  TRANSLATION: {
    id: 'TRANSLATION',
    name: 'Translation',
    description: 'Translated version of document',
    bidirectional: true,
    icon: 'globe',
    color: '#06b6d4',
    examples: [
      { source: 'passport translation', target: 'original passport' },
      { source: 'translated visa', target: 'original visa' }
    ]
  },

  // Additional relationship types
  CANCELLATION: {
    id: 'CANCELLATION',
    name: 'Cancellation',
    description: 'Cancellation of original document',
    bidirectional: false,
    icon: 'x-circle',
    color: '#dc2626',
    examples: [
      { source: 'cancellation notice', target: 'original booking' }
    ]
  },

  REPLACEMENT: {
    id: 'REPLACEMENT',
    name: 'Replacement',
    description: 'Replaces an earlier document',
    bidirectional: false,
    icon: 'refresh',
    color: '#059669',
    examples: [
      { source: 'new passport', target: 'expired passport' },
      { source: 'reissued ticket', target: 'lost ticket' }
    ]
  },

  RELATED_BOOKING: {
    id: 'RELATED_BOOKING',
    name: 'Related Booking',
    description: 'Related but separate bookings',
    bidirectional: true,
    icon: 'link-2',
    color: '#7c3aed',
    examples: [
      { source: 'outbound flight', target: 'return flight' },
      { source: 'connecting flight', target: 'main flight' }
    ]
  },

  COMPANION_DOCUMENT: {
    id: 'COMPANION_DOCUMENT',
    name: 'Companion Document',
    description: 'Documents for traveling companions',
    bidirectional: true,
    icon: 'users',
    color: '#2563eb',
    examples: [
      { source: 'spouse passport', target: 'primary traveler passport' }
    ]
  }
};

/**
 * Document Relationship Model
 */
export class DocumentRelationship {
  constructor(data = {}) {
    this.id = data.id;
    this.type = data.type;
    this.sourceId = data.sourceId;
    this.targetId = data.targetId;
    this.confidence = data.confidence || 0;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.userId = data.userId;
    this.isAutoDetected = data.isAutoDetected || false;
    this.isConfirmed = data.isConfirmed || false;
  }

  /**
   * Validate relationship
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.type || !RelationshipTypes[this.type]) {
      errors.push('Invalid relationship type');
    }

    if (!this.sourceId) {
      errors.push('Source document ID is required');
    }

    if (!this.targetId) {
      errors.push('Target document ID is required');
    }

    if (this.sourceId === this.targetId) {
      errors.push('Source and target cannot be the same document');
    }

    if (this.confidence < 0 || this.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get relationship type info
   * @returns {Object} Type information
   */
  getTypeInfo() {
    return RelationshipTypes[this.type] || null;
  }

  /**
   * Check if relationship is bidirectional
   * @returns {boolean}
   */
  isBidirectional() {
    const typeInfo = this.getTypeInfo();
    return typeInfo ? typeInfo.bidirectional : false;
  }

  /**
   * Get inverse relationship (if bidirectional)
   * @returns {DocumentRelationship|null}
   */
  getInverse() {
    if (!this.isBidirectional()) return null;

    return new DocumentRelationship({
      ...this,
      id: undefined, // New ID will be generated
      sourceId: this.targetId,
      targetId: this.sourceId
    });
  }

  /**
   * Convert to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      sourceId: this.sourceId,
      targetId: this.targetId,
      confidence: this.confidence,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      userId: this.userId,
      isAutoDetected: this.isAutoDetected,
      isConfirmed: this.isConfirmed,
      typeInfo: this.getTypeInfo()
    };
  }
}

/**
 * Document Cluster Model
 */
export class DocumentCluster {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type || 'unknown';
    this.documents = data.documents || [];
    this.confidence = data.confidence || 0;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.userId = data.userId;
    this.isAutoDetected = data.isAutoDetected || false;
    this.isConfirmed = data.isConfirmed || false;
  }

  /**
   * Add document to cluster
   * @param {string} documentId
   */
  addDocument(documentId) {
    if (!this.documents.includes(documentId)) {
      this.documents.push(documentId);
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove document from cluster
   * @param {string} documentId
   */
  removeDocument(documentId) {
    const index = this.documents.indexOf(documentId);
    if (index > -1) {
      this.documents.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  /**
   * Check if cluster contains document
   * @param {string} documentId
   * @returns {boolean}
   */
  containsDocument(documentId) {
    return this.documents.includes(documentId);
  }

  /**
   * Get cluster size
   * @returns {number}
   */
  getSize() {
    return this.documents.length;
  }

  /**
   * Merge with another cluster
   * @param {DocumentCluster} otherCluster
   */
  merge(otherCluster) {
    // Add all documents from other cluster
    otherCluster.documents.forEach(docId => this.addDocument(docId));
    
    // Update confidence (take minimum)
    this.confidence = Math.min(this.confidence, otherCluster.confidence);
    
    // Merge metadata
    this.metadata = {
      ...this.metadata,
      ...otherCluster.metadata,
      mergedFrom: [
        ...(this.metadata.mergedFrom || []),
        otherCluster.id
      ]
    };
    
    this.updatedAt = new Date();
  }

  /**
   * Validate cluster
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.name && this.type === 'custom') {
      errors.push('Custom clusters require a name');
    }

    if (this.documents.length === 0) {
      errors.push('Cluster must contain at least one document');
    }

    if (this.confidence < 0 || this.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }

    // Check for duplicate documents
    const uniqueDocs = new Set(this.documents);
    if (uniqueDocs.size !== this.documents.length) {
      errors.push('Cluster contains duplicate documents');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      documents: this.documents,
      documentCount: this.documents.length,
      confidence: this.confidence,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      userId: this.userId,
      isAutoDetected: this.isAutoDetected,
      isConfirmed: this.isConfirmed
    };
  }
}

/**
 * Trip Document Model
 */
export class TripDocument {
  constructor(data = {}) {
    this.id = data.id;
    this.tripId = data.tripId;
    this.documentId = data.documentId;
    this.role = data.role || 'supporting'; // primary, supporting, optional
    this.sequence = data.sequence || 0;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Validate trip document
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];
    const validRoles = ['primary', 'supporting', 'optional'];

    if (!this.tripId) {
      errors.push('Trip ID is required');
    }

    if (!this.documentId) {
      errors.push('Document ID is required');
    }

    if (!validRoles.includes(this.role)) {
      errors.push('Invalid document role');
    }

    if (this.sequence < 0) {
      errors.push('Sequence must be non-negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      tripId: this.tripId,
      documentId: this.documentId,
      role: this.role,
      sequence: this.sequence,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

/**
 * Relationship statistics
 */
export class RelationshipStatistics {
  constructor(relationships = []) {
    this.relationships = relationships;
  }

  /**
   * Get total relationship count
   * @returns {number}
   */
  getTotalCount() {
    return this.relationships.length;
  }

  /**
   * Get count by type
   * @returns {Object}
   */
  getCountByType() {
    const counts = {};
    
    this.relationships.forEach(rel => {
      counts[rel.type] = (counts[rel.type] || 0) + 1;
    });
    
    return counts;
  }

  /**
   * Get average confidence
   * @returns {number}
   */
  getAverageConfidence() {
    if (this.relationships.length === 0) return 0;
    
    const sum = this.relationships.reduce((acc, rel) => acc + rel.confidence, 0);
    return sum / this.relationships.length;
  }

  /**
   * Get confidence distribution
   * @returns {Object}
   */
  getConfidenceDistribution() {
    const distribution = {
      high: 0,      // >= 0.8
      medium: 0,    // >= 0.6
      low: 0,       // >= 0.4
      veryLow: 0    // < 0.4
    };
    
    this.relationships.forEach(rel => {
      if (rel.confidence >= 0.8) distribution.high++;
      else if (rel.confidence >= 0.6) distribution.medium++;
      else if (rel.confidence >= 0.4) distribution.low++;
      else distribution.veryLow++;
    });
    
    return distribution;
  }

  /**
   * Get auto-detected vs confirmed
   * @returns {Object}
   */
  getDetectionStats() {
    const stats = {
      autoDetected: 0,
      userConfirmed: 0,
      pending: 0
    };
    
    this.relationships.forEach(rel => {
      if (rel.isConfirmed) {
        stats.userConfirmed++;
      } else if (rel.isAutoDetected) {
        stats.autoDetected++;
      } else {
        stats.pending++;
      }
    });
    
    return stats;
  }

  /**
   * Get most connected documents
   * @param {number} limit
   * @returns {Array}
   */
  getMostConnectedDocuments(limit = 10) {
    const connectionCount = {};
    
    this.relationships.forEach(rel => {
      connectionCount[rel.sourceId] = (connectionCount[rel.sourceId] || 0) + 1;
      connectionCount[rel.targetId] = (connectionCount[rel.targetId] || 0) + 1;
    });
    
    return Object.entries(connectionCount)
      .map(([documentId, count]) => ({ documentId, connectionCount: count }))
      .sort((a, b) => b.connectionCount - a.connectionCount)
      .slice(0, limit);
  }

  /**
   * Get relationship chains
   * @returns {Array}
   */
  getRelationshipChains() {
    const chains = [];
    const visited = new Set();
    
    this.relationships.forEach(rel => {
      if (!visited.has(rel.id)) {
        const chain = this.buildChain(rel, visited);
        if (chain.length > 1) {
          chains.push(chain);
        }
      }
    });
    
    return chains.sort((a, b) => b.length - a.length);
  }

  /**
   * Build relationship chain
   * @param {Object} startRel
   * @param {Set} visited
   * @returns {Array}
   */
  buildChain(startRel, visited) {
    const chain = [startRel];
    visited.add(startRel.id);
    
    // Find relationships connected to the target
    const connected = this.relationships.filter(rel => 
      !visited.has(rel.id) && rel.sourceId === startRel.targetId
    );
    
    connected.forEach(rel => {
      chain.push(...this.buildChain(rel, visited));
    });
    
    return chain;
  }

  /**
   * Convert to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      totalCount: this.getTotalCount(),
      byType: this.getCountByType(),
      averageConfidence: this.getAverageConfidence(),
      confidenceDistribution: this.getConfidenceDistribution(),
      detectionStats: this.getDetectionStats(),
      mostConnected: this.getMostConnectedDocuments()
    };
  }
}

/**
 * Export all models and types
 */
export default {
  RelationshipTypes,
  DocumentRelationship,
  DocumentCluster,
  TripDocument,
  RelationshipStatistics
};