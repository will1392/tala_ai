/**
 * Relationship Visualizer Utility
 * 
 * Generates visualization data for document relationships,
 * timelines, hierarchies, and relationship maps
 */

import { v4 as uuidv4 } from 'uuid';

class RelationshipVisualizer {
  constructor() {
    // Visualization configurations
    this.config = {
      graph: {
        nodeSize: {
          default: 30,
          byType: {
            flight: 40,
            hotel: 35,
            passport: 45,
            visa: 40,
            insurance: 30,
            itinerary: 35
          }
        },
        nodeColors: {
          flight: '#3b82f6',
          hotel: '#10b981',
          passport: '#f59e0b',
          visa: '#ef4444',
          insurance: '#8b5cf6',
          booking: '#06b6d4',
          confirmation: '#14b8a6',
          default: '#6b7280'
        },
        edgeColors: {
          BOOKING_CONFIRMATION: '#10b981',
          TRIP_DOCUMENT: '#3b82f6',
          PREREQUISITE: '#f59e0b',
          AMENDMENT: '#ef4444',
          SUPPLEMENT: '#8b5cf6',
          TRANSLATION: '#06b6d4',
          default: '#9ca3af'
        }
      },
      timeline: {
        eventHeight: 60,
        laneHeight: 80,
        padding: 20,
        colors: {
          past: '#9ca3af',
          present: '#3b82f6',
          future: '#10b981'
        }
      },
      hierarchy: {
        levelHeight: 100,
        nodeWidth: 200,
        nodeHeight: 60,
        horizontalSpacing: 50,
        verticalSpacing: 30
      }
    };
  }

  /**
   * Generate relationship graph data
   * @param {Array} documents - Documents to visualize
   * @param {Array} relationships - Document relationships
   * @param {Object} options - Visualization options
   * @returns {Object} Graph visualization data
   */
  generateRelationshipGraph(documents, relationships, options = {}) {
    const graph = {
      nodes: [],
      edges: [],
      clusters: [],
      metadata: {
        totalNodes: 0,
        totalEdges: 0,
        layout: options.layout || 'force-directed'
      }
    };

    // Create nodes from documents
    documents.forEach(doc => {
      graph.nodes.push(this.createGraphNode(doc, options));
    });

    // Create edges from relationships
    relationships.forEach(rel => {
      const edge = this.createGraphEdge(rel, documents, options);
      if (edge) graph.edges.push(edge);
    });

    // Identify clusters
    if (options.showClusters) {
      graph.clusters = this.identifyGraphClusters(graph.nodes, graph.edges);
    }

    // Calculate layout positions
    if (options.calculateLayout) {
      this.calculateGraphLayout(graph, options);
    }

    // Update metadata
    graph.metadata.totalNodes = graph.nodes.length;
    graph.metadata.totalEdges = graph.edges.length;
    graph.metadata.stats = this.calculateGraphStats(graph);

    return graph;
  }

  /**
   * Create timeline visualization
   * @param {Array} documents - Documents to visualize
   * @param {Object} trip - Trip information
   * @param {Object} options - Timeline options
   * @returns {Object} Timeline visualization data
   */
  createTimelineVisualization(documents, trip = null, options = {}) {
    const timeline = {
      events: [],
      lanes: [],
      dateRange: null,
      milestones: [],
      metadata: {}
    };

    // Extract events from documents
    const events = this.extractTimelineEvents(documents, options);
    
    // Sort events by date
    events.sort((a, b) => a.date - b.date);

    // Determine date range
    if (events.length > 0) {
      timeline.dateRange = {
        start: events[0].date,
        end: events[events.length - 1].date
      };
    }

    // Assign events to lanes
    timeline.lanes = this.assignEventLanes(events, options);

    // Process events for visualization
    timeline.events = events.map(event => ({
      ...event,
      x: this.calculateTimelineX(event.date, timeline.dateRange),
      y: this.calculateTimelineY(event.lane, timeline.lanes),
      color: this.getEventColor(event, timeline.dateRange),
      size: this.getEventSize(event)
    }));

    // Add milestones
    if (trip) {
      timeline.milestones = this.createTripMilestones(trip, timeline.dateRange);
    }

    // Add metadata
    timeline.metadata = {
      duration: this.calculateDuration(timeline.dateRange),
      eventCount: timeline.events.length,
      laneCount: timeline.lanes.length,
      density: this.calculateTimelineDensity(timeline)
    };

    return timeline;
  }

  /**
   * Build document hierarchy
   * @param {Array} documents - Documents to organize
   * @param {Array} relationships - Document relationships
   * @param {Object} options - Hierarchy options
   * @returns {Object} Hierarchy visualization data
   */
  buildDocumentHierarchy(documents, relationships, options = {}) {
    const hierarchy = {
      root: null,
      nodes: new Map(),
      levels: [],
      metadata: {}
    };

    // Build node map
    documents.forEach(doc => {
      hierarchy.nodes.set(doc.id, {
        id: doc.id,
        data: doc,
        children: [],
        parents: [],
        level: -1,
        position: null
      });
    });

    // Build parent-child relationships
    relationships.forEach(rel => {
      if (this.isHierarchicalRelationship(rel)) {
        const parentNode = hierarchy.nodes.get(rel.sourceId);
        const childNode = hierarchy.nodes.get(rel.targetId);
        
        if (parentNode && childNode) {
          parentNode.children.push(childNode.id);
          childNode.parents.push(parentNode.id);
        }
      }
    });

    // Find root nodes (nodes with no parents)
    const rootNodes = Array.from(hierarchy.nodes.values())
      .filter(node => node.parents.length === 0);

    if (rootNodes.length === 0) {
      // If no clear root, use the most connected node
      hierarchy.root = this.findMostConnectedNode(hierarchy.nodes);
    } else if (rootNodes.length === 1) {
      hierarchy.root = rootNodes[0].id;
    } else {
      // Multiple roots - create a virtual root
      hierarchy.root = this.createVirtualRoot(rootNodes, hierarchy);
    }

    // Assign levels
    this.assignHierarchyLevels(hierarchy);

    // Calculate positions
    this.calculateHierarchyPositions(hierarchy, options);

    // Build level arrays
    hierarchy.levels = this.buildHierarchyLevels(hierarchy);

    // Add metadata
    hierarchy.metadata = {
      depth: hierarchy.levels.length,
      totalNodes: hierarchy.nodes.size,
      rootCount: rootNodes.length,
      leafCount: this.countLeafNodes(hierarchy)
    };

    return hierarchy;
  }

  /**
   * Export relationship map
   * @param {Array} documents - Documents to map
   * @param {Array} relationships - Document relationships
   * @param {Object} options - Export options
   * @returns {Object} Exportable relationship map
   */
  exportRelationshipMap(documents, relationships, options = {}) {
    const format = options.format || 'json';

    const map = {
      metadata: {
        exportDate: new Date().toISOString(),
        documentCount: documents.length,
        relationshipCount: relationships.length,
        format: format
      },
      documents: documents.map(doc => ({
        id: doc.id,
        type: doc.type,
        name: doc.name,
        metadata: this.filterMetadata(doc.metadata, options)
      })),
      relationships: relationships.map(rel => ({
        id: rel.id,
        type: rel.type,
        source: rel.sourceId,
        target: rel.targetId,
        confidence: rel.confidence,
        metadata: this.filterMetadata(rel.metadata, options)
      }))
    };

    // Convert to requested format
    switch (format) {
      case 'graphml':
        return this.convertToGraphML(map);
      case 'dot':
        return this.convertToDOT(map);
      case 'csv':
        return this.convertToCSV(map);
      case 'cytoscape':
        return this.convertToCytoscape(map);
      default:
        return map;
    }
  }

  /**
   * Identify orphaned documents
   * @param {Array} documents - All documents
   * @param {Array} relationships - All relationships
   * @param {Array} clusters - Document clusters
   * @returns {Object} Orphaned document analysis
   */
  identifyOrphanedDocuments(documents, relationships, clusters = []) {
    const connected = new Set();
    const clustered = new Set();

    // Mark connected documents
    relationships.forEach(rel => {
      connected.add(rel.sourceId);
      connected.add(rel.targetId);
    });

    // Mark clustered documents
    clusters.forEach(cluster => {
      cluster.documents.forEach(docId => clustered.add(docId));
    });

    // Find orphaned documents
    const orphaned = documents.filter(doc => 
      !connected.has(doc.id) && !clustered.has(doc.id)
    );

    // Analyze orphaned documents
    const analysis = {
      orphanedDocuments: orphaned,
      count: orphaned.length,
      percentage: (orphaned.length / documents.length) * 100,
      byType: this.groupByType(orphaned),
      suggestions: this.generateOrphanSuggestions(orphaned, documents)
    };

    return analysis;
  }

  /**
   * Generate cluster visualization
   * @param {Array} clusters - Document clusters
   * @param {Array} documents - All documents
   * @param {Object} options - Visualization options
   * @returns {Object} Cluster visualization data
   */
  generateClusterVisualization(clusters, documents, options = {}) {
    const visualization = {
      clusters: [],
      links: [],
      metadata: {}
    };

    // Create document map for quick lookup
    const docMap = new Map(documents.map(doc => [doc.id, doc]));

    // Process each cluster
    clusters.forEach(cluster => {
      const clusterViz = {
        id: cluster.id,
        name: cluster.name || `Cluster ${cluster.id.substring(0, 8)}`,
        type: cluster.type,
        documents: [],
        center: null,
        radius: 0,
        color: this.getClusterColor(cluster.type)
      };

      // Add documents to cluster
      cluster.documents.forEach(docId => {
        const doc = docMap.get(docId);
        if (doc) {
          clusterViz.documents.push({
            id: doc.id,
            type: doc.type,
            name: doc.name,
            position: null // Will be calculated
          });
        }
      });

      // Calculate cluster layout
      if (options.calculateLayout) {
        this.calculateClusterLayout(clusterViz, options);
      }

      visualization.clusters.push(clusterViz);
    });

    // Find inter-cluster links
    if (options.showInterClusterLinks) {
      visualization.links = this.findInterClusterLinks(clusters, documents);
    }

    // Add metadata
    visualization.metadata = {
      totalClusters: clusters.length,
      averageClusterSize: clusters.reduce((sum, c) => sum + c.documents.length, 0) / clusters.length,
      largestCluster: Math.max(...clusters.map(c => c.documents.length)),
      clusterTypes: this.countClusterTypes(clusters)
    };

    return visualization;
  }

  // Helper methods for graph generation

  createGraphNode(document, options) {
    const node = {
      id: document.id,
      label: document.name || document.type,
      type: document.type,
      size: this.getNodeSize(document.type),
      color: this.getNodeColor(document.type),
      metadata: {
        documentType: document.type,
        createdAt: document.createdAt,
        fileSize: document.fileSize
      }
    };

    // Add position if provided
    if (document.position) {
      node.x = document.position.x;
      node.y = document.position.y;
    }

    // Add custom attributes
    if (options.includeMetadata) {
      node.metadata = { ...node.metadata, ...document.metadata };
    }

    return node;
  }

  createGraphEdge(relationship, documents, options) {
    const sourceDoc = documents.find(d => d.id === relationship.sourceId);
    const targetDoc = documents.find(d => d.id === relationship.targetId);

    if (!sourceDoc || !targetDoc) return null;

    const edge = {
      id: relationship.id,
      source: relationship.sourceId,
      target: relationship.targetId,
      type: relationship.type,
      label: this.getEdgeLabel(relationship),
      color: this.getEdgeColor(relationship.type),
      weight: relationship.confidence,
      style: this.getEdgeStyle(relationship),
      metadata: {
        relationshipType: relationship.type,
        confidence: relationship.confidence,
        isAutoDetected: relationship.isAutoDetected
      }
    };

    // Add curve for bidirectional relationships
    if (this.isBidirectionalRelationship(relationship.type)) {
      edge.curved = true;
    }

    return edge;
  }

  calculateGraphLayout(graph, options) {
    const layout = options.layout || 'force-directed';

    switch (layout) {
      case 'force-directed':
        this.applyForceDirectedLayout(graph);
        break;
      case 'hierarchical':
        this.applyHierarchicalLayout(graph);
        break;
      case 'circular':
        this.applyCircularLayout(graph);
        break;
      case 'grid':
        this.applyGridLayout(graph);
        break;
      default:
        this.applyForceDirectedLayout(graph);
    }
  }

  applyForceDirectedLayout(graph) {
    // Simplified force-directed layout
    const width = 1000;
    const height = 800;
    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize positions randomly
    graph.nodes.forEach(node => {
      if (!node.x || !node.y) {
        node.x = centerX + (Math.random() - 0.5) * width * 0.8;
        node.y = centerY + (Math.random() - 0.5) * height * 0.8;
      }
    });

    // Apply forces (simplified)
    const iterations = 50;
    for (let i = 0; i < iterations; i++) {
      // Apply repulsion between nodes
      graph.nodes.forEach((nodeA, indexA) => {
        graph.nodes.forEach((nodeB, indexB) => {
          if (indexA !== indexB) {
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0 && distance < 200) {
              const force = 100 / (distance * distance);
              nodeA.x -= (dx / distance) * force;
              nodeA.y -= (dy / distance) * force;
            }
          }
        });
      });

      // Apply attraction along edges
      graph.edges.forEach(edge => {
        const source = graph.nodes.find(n => n.id === edge.source);
        const target = graph.nodes.find(n => n.id === edge.target);
        
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const force = distance * 0.1;
            source.x += (dx / distance) * force * 0.5;
            source.y += (dy / distance) * force * 0.5;
            target.x -= (dx / distance) * force * 0.5;
            target.y -= (dy / distance) * force * 0.5;
          }
        }
      });

      // Apply centering force
      graph.nodes.forEach(node => {
        node.x += (centerX - node.x) * 0.01;
        node.y += (centerY - node.y) * 0.01;
      });
    }
  }

  applyCircularLayout(graph) {
    const centerX = 500;
    const centerY = 400;
    const radius = 300;

    graph.nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / graph.nodes.length;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
    });
  }

  applyGridLayout(graph) {
    const columns = Math.ceil(Math.sqrt(graph.nodes.length));
    const spacing = 100;
    const startX = 100;
    const startY = 100;

    graph.nodes.forEach((node, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      node.x = startX + col * spacing;
      node.y = startY + row * spacing;
    });
  }

  // Helper methods for timeline

  extractTimelineEvents(documents, options) {
    const events = [];

    documents.forEach(doc => {
      // Extract dates from document
      const dates = this.extractDocumentDates(doc);
      
      dates.forEach(dateInfo => {
        events.push({
          id: uuidv4(),
          documentId: doc.id,
          documentType: doc.type,
          date: dateInfo.date,
          type: dateInfo.type,
          title: this.getEventTitle(doc, dateInfo),
          description: this.getEventDescription(doc, dateInfo),
          icon: this.getEventIcon(doc.type, dateInfo.type),
          lane: null // Will be assigned
        });
      });
    });

    return events;
  }

  extractDocumentDates(document) {
    const dates = [];

    // Check metadata for dates
    const dateFields = [
      'date', 'departureDate', 'arrivalDate', 'checkInDate', 
      'checkOutDate', 'issueDate', 'expiryDate', 'bookingDate'
    ];

    dateFields.forEach(field => {
      if (document.metadata?.[field]) {
        dates.push({
          date: new Date(document.metadata[field]),
          type: field,
          field: field
        });
      }
    });

    // Add creation date if no other dates
    if (dates.length === 0 && document.createdAt) {
      dates.push({
        date: new Date(document.createdAt),
        type: 'created',
        field: 'createdAt'
      });
    }

    return dates;
  }

  assignEventLanes(events, options) {
    const lanes = [];
    const laneAssignments = new Map();

    // Group by document type
    const typeGroups = new Map();
    events.forEach(event => {
      if (!typeGroups.has(event.documentType)) {
        typeGroups.set(event.documentType, []);
      }
      typeGroups.get(event.documentType).push(event);
    });

    // Create lanes for each document type
    let laneIndex = 0;
    typeGroups.forEach((typeEvents, type) => {
      lanes.push({
        id: laneIndex,
        name: this.getDocumentTypeName(type),
        type: type,
        eventCount: typeEvents.length
      });

      typeEvents.forEach(event => {
        event.lane = laneIndex;
      });

      laneIndex++;
    });

    return lanes;
  }

  calculateTimelineX(date, dateRange) {
    if (!dateRange || !dateRange.start || !dateRange.end) return 0;

    const totalDuration = dateRange.end - dateRange.start;
    const eventOffset = date - dateRange.start;
    const percentage = eventOffset / totalDuration;

    return percentage * 800 + 100; // Timeline width of 800px with 100px margin
  }

  calculateTimelineY(lane, lanes) {
    const laneHeight = this.config.timeline.laneHeight;
    const padding = this.config.timeline.padding;
    
    return padding + (lane * laneHeight) + (laneHeight / 2);
  }

  getEventColor(event, dateRange) {
    const now = new Date();
    
    if (event.date < now) {
      return this.config.timeline.colors.past;
    } else if (event.date.toDateString() === now.toDateString()) {
      return this.config.timeline.colors.present;
    } else {
      return this.config.timeline.colors.future;
    }
  }

  // Helper methods for hierarchy

  isHierarchicalRelationship(relationship) {
    const hierarchicalTypes = [
      'PREREQUISITE', 'AMENDMENT', 'SUPPLEMENT', 'CANCELLATION', 'REPLACEMENT'
    ];
    return hierarchicalTypes.includes(relationship.type);
  }

  findMostConnectedNode(nodes) {
    let maxConnections = 0;
    let mostConnected = null;

    nodes.forEach(node => {
      const connections = node.children.length + node.parents.length;
      if (connections > maxConnections) {
        maxConnections = connections;
        mostConnected = node.id;
      }
    });

    return mostConnected;
  }

  createVirtualRoot(rootNodes, hierarchy) {
    const virtualRoot = {
      id: 'virtual-root',
      data: { type: 'virtual', name: 'Documents' },
      children: rootNodes.map(n => n.id),
      parents: [],
      level: 0,
      position: null
    };

    hierarchy.nodes.set(virtualRoot.id, virtualRoot);
    
    rootNodes.forEach(node => {
      node.parents.push(virtualRoot.id);
    });

    return virtualRoot.id;
  }

  assignHierarchyLevels(hierarchy) {
    const visited = new Set();
    const queue = [{
      nodeId: hierarchy.root,
      level: 0
    }];

    while (queue.length > 0) {
      const { nodeId, level } = queue.shift();
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = hierarchy.nodes.get(nodeId);
      if (node) {
        node.level = level;
        
        node.children.forEach(childId => {
          queue.push({
            nodeId: childId,
            level: level + 1
          });
        });
      }
    }
  }

  calculateHierarchyPositions(hierarchy, options) {
    const levels = new Map();

    // Group nodes by level
    hierarchy.nodes.forEach(node => {
      if (!levels.has(node.level)) {
        levels.set(node.level, []);
      }
      levels.get(node.level).push(node);
    });

    // Calculate positions for each level
    levels.forEach((nodes, level) => {
      const levelWidth = nodes.length * this.config.hierarchy.nodeWidth + 
                        (nodes.length - 1) * this.config.hierarchy.horizontalSpacing;
      const startX = -levelWidth / 2;

      nodes.forEach((node, index) => {
        node.position = {
          x: startX + index * (this.config.hierarchy.nodeWidth + this.config.hierarchy.horizontalSpacing),
          y: level * (this.config.hierarchy.nodeHeight + this.config.hierarchy.verticalSpacing)
        };
      });
    });
  }

  buildHierarchyLevels(hierarchy) {
    const levels = new Map();

    hierarchy.nodes.forEach(node => {
      if (!levels.has(node.level)) {
        levels.set(node.level, []);
      }
      levels.get(node.level).push({
        id: node.id,
        data: node.data,
        position: node.position,
        children: node.children,
        parents: node.parents
      });
    });

    return Array.from(levels.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, nodes]) => ({
        level,
        nodes
      }));
  }

  countLeafNodes(hierarchy) {
    let count = 0;
    hierarchy.nodes.forEach(node => {
      if (node.children.length === 0) count++;
    });
    return count;
  }

  // Utility methods

  getNodeSize(documentType) {
    return this.config.graph.nodeSize.byType[documentType] || 
           this.config.graph.nodeSize.default;
  }

  getNodeColor(documentType) {
    return this.config.graph.nodeColors[documentType] || 
           this.config.graph.nodeColors.default;
  }

  getEdgeColor(relationshipType) {
    return this.config.graph.edgeColors[relationshipType] || 
           this.config.graph.edgeColors.default;
  }

  getEdgeLabel(relationship) {
    const labels = {
      BOOKING_CONFIRMATION: 'confirms',
      TRIP_DOCUMENT: 'related to',
      PREREQUISITE: 'requires',
      AMENDMENT: 'amends',
      SUPPLEMENT: 'supplements',
      TRANSLATION: 'translates'
    };
    
    return labels[relationship.type] || relationship.type.toLowerCase();
  }

  getEdgeStyle(relationship) {
    if (relationship.confidence < 0.5) {
      return 'dashed';
    } else if (relationship.isAutoDetected && !relationship.isConfirmed) {
      return 'dotted';
    }
    return 'solid';
  }

  isBidirectionalRelationship(type) {
    const bidirectional = [
      'BOOKING_CONFIRMATION', 'TRIP_DOCUMENT', 'TRANSLATION', 
      'RELATED_BOOKING', 'COMPANION_DOCUMENT'
    ];
    return bidirectional.includes(type);
  }

  getEventTitle(document, dateInfo) {
    const titles = {
      departureDate: `${document.type} Departure`,
      arrivalDate: `${document.type} Arrival`,
      checkInDate: 'Check-in',
      checkOutDate: 'Check-out',
      issueDate: `${document.type} Issued`,
      expiryDate: `${document.type} Expires`,
      bookingDate: 'Booking Made',
      created: `${document.type} Added`
    };
    
    return titles[dateInfo.type] || `${document.type} Event`;
  }

  getEventDescription(document, dateInfo) {
    return document.name || `${document.type} - ${dateInfo.type}`;
  }

  getEventIcon(documentType, eventType) {
    const icons = {
      flight: { departureDate: 'plane-takeoff', arrivalDate: 'plane-landing' },
      hotel: { checkInDate: 'home', checkOutDate: 'home' },
      passport: { issueDate: 'id-card', expiryDate: 'alert-circle' },
      visa: { issueDate: 'stamp', expiryDate: 'alert-circle' }
    };
    
    return icons[documentType]?.[eventType] || 'file';
  }

  getDocumentTypeName(type) {
    const names = {
      flight: 'Flights',
      hotel: 'Hotels',
      passport: 'Travel Documents',
      visa: 'Visas',
      insurance: 'Insurance',
      booking: 'Bookings',
      itinerary: 'Itineraries'
    };
    
    return names[type] || type;
  }

  calculateDuration(dateRange) {
    if (!dateRange || !dateRange.start || !dateRange.end) return 0;
    
    const days = Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24));
    return days;
  }

  calculateTimelineDensity(timeline) {
    if (!timeline.dateRange || timeline.events.length === 0) return 0;
    
    const duration = this.calculateDuration(timeline.dateRange);
    return timeline.events.length / duration;
  }

  groupByType(documents) {
    const groups = {};
    
    documents.forEach(doc => {
      if (!groups[doc.type]) {
        groups[doc.type] = 0;
      }
      groups[doc.type]++;
    });
    
    return groups;
  }

  generateOrphanSuggestions(orphaned, allDocuments) {
    const suggestions = [];

    orphaned.forEach(orphan => {
      // Suggest documents that might be related based on dates
      const similarDated = allDocuments.filter(doc => 
        doc.id !== orphan.id && this.haveSimilarDates(orphan, doc)
      );

      if (similarDated.length > 0) {
        suggestions.push({
          orphanId: orphan.id,
          orphanType: orphan.type,
          suggestion: 'Similar dates found',
          relatedDocuments: similarDated.map(d => ({
            id: d.id,
            type: d.type,
            reason: 'date proximity'
          }))
        });
      }

      // Suggest based on document type combinations
      const relatedTypes = this.getSuggestedRelatedTypes(orphan.type);
      const relatedTypeDocs = allDocuments.filter(doc => 
        relatedTypes.includes(doc.type)
      );

      if (relatedTypeDocs.length > 0) {
        suggestions.push({
          orphanId: orphan.id,
          orphanType: orphan.type,
          suggestion: 'Related document types found',
          relatedDocuments: relatedTypeDocs.slice(0, 5).map(d => ({
            id: d.id,
            type: d.type,
            reason: 'common pairing'
          }))
        });
      }
    });

    return suggestions;
  }

  haveSimilarDates(docA, docB) {
    // Simplified date comparison
    const datesA = this.extractDocumentDates(docA);
    const datesB = this.extractDocumentDates(docB);
    
    return datesA.some(dateA => 
      datesB.some(dateB => {
        const diff = Math.abs(dateA.date - dateB.date);
        return diff < 7 * 24 * 60 * 60 * 1000; // Within 7 days
      })
    );
  }

  getSuggestedRelatedTypes(documentType) {
    const suggestions = {
      flight: ['hotel', 'car_rental', 'insurance'],
      hotel: ['flight', 'car_rental'],
      passport: ['visa', 'flight'],
      visa: ['passport', 'flight'],
      insurance: ['flight', 'hotel']
    };
    
    return suggestions[documentType] || [];
  }

  getClusterColor(clusterType) {
    const colors = {
      trip: '#3b82f6',
      booking: '#10b981',
      document_set: '#f59e0b',
      mixed: '#8b5cf6'
    };
    
    return colors[clusterType] || '#6b7280';
  }

  calculateClusterLayout(cluster, options) {
    const layoutType = options.clusterLayout || 'circular';
    
    switch (layoutType) {
      case 'circular':
        this.applyCircularClusterLayout(cluster);
        break;
      case 'grid':
        this.applyGridClusterLayout(cluster);
        break;
      default:
        this.applyCircularClusterLayout(cluster);
    }
  }

  applyCircularClusterLayout(cluster) {
    const radius = Math.max(100, cluster.documents.length * 20);
    const centerX = 0;
    const centerY = 0;

    cluster.documents.forEach((doc, index) => {
      const angle = (2 * Math.PI * index) / cluster.documents.length;
      doc.position = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    cluster.center = { x: centerX, y: centerY };
    cluster.radius = radius;
  }

  applyGridClusterLayout(cluster) {
    const columns = Math.ceil(Math.sqrt(cluster.documents.length));
    const spacing = 80;
    const totalWidth = columns * spacing;
    const startX = -totalWidth / 2;
    const startY = -totalWidth / 2;

    cluster.documents.forEach((doc, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      doc.position = {
        x: startX + col * spacing,
        y: startY + row * spacing
      };
    });

    cluster.center = { x: 0, y: 0 };
    cluster.radius = totalWidth / 2;
  }

  findInterClusterLinks(clusters, documents) {
    const links = [];
    const docClusterMap = new Map();

    // Build document to cluster mapping
    clusters.forEach(cluster => {
      cluster.documents.forEach(docId => {
        docClusterMap.set(docId, cluster.id);
      });
    });

    // Find documents that link clusters
    // This would need actual relationship data to be accurate
    // For now, returning empty array
    return links;
  }

  countClusterTypes(clusters) {
    const counts = {};
    clusters.forEach(cluster => {
      counts[cluster.type] = (counts[cluster.type] || 0) + 1;
    });
    return counts;
  }

  identifyGraphClusters(nodes, edges) {
    // Simplified cluster detection using connected components
    const clusters = [];
    const visited = new Set();
    
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const cluster = this.findConnectedComponent(node.id, nodes, edges, visited);
        if (cluster.length > 1) {
          clusters.push({
            id: uuidv4(),
            nodes: cluster,
            size: cluster.length
          });
        }
      }
    });
    
    return clusters;
  }

  findConnectedComponent(startNodeId, nodes, edges, visited) {
    const component = [];
    const queue = [startNodeId];
    
    while (queue.length > 0) {
      const nodeId = queue.shift();
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      component.push(nodeId);
      
      // Find connected nodes
      edges.forEach(edge => {
        if (edge.source === nodeId && !visited.has(edge.target)) {
          queue.push(edge.target);
        } else if (edge.target === nodeId && !visited.has(edge.source)) {
          queue.push(edge.source);
        }
      });
    }
    
    return component;
  }

  calculateGraphStats(graph) {
    const stats = {
      avgDegree: 0,
      density: 0,
      components: 0
    };
    
    // Calculate average degree
    const degrees = new Map();
    graph.edges.forEach(edge => {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    });
    
    if (degrees.size > 0) {
      const totalDegree = Array.from(degrees.values()).reduce((sum, deg) => sum + deg, 0);
      stats.avgDegree = totalDegree / degrees.size;
    }
    
    // Calculate density
    const maxEdges = (graph.nodes.length * (graph.nodes.length - 1)) / 2;
    stats.density = maxEdges > 0 ? graph.edges.length / maxEdges : 0;
    
    // Count components
    stats.components = graph.clusters.length;
    
    return stats;
  }

  filterMetadata(metadata, options) {
    if (!options.includeMetadata) return {};
    
    if (options.metadataFields) {
      const filtered = {};
      options.metadataFields.forEach(field => {
        if (metadata[field] !== undefined) {
          filtered[field] = metadata[field];
        }
      });
      return filtered;
    }
    
    return metadata;
  }

  // Export format converters

  convertToGraphML(map) {
    let graphml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    graphml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
    graphml += '  <graph id="G" edgedefault="directed">\n';
    
    // Add nodes
    map.documents.forEach(doc => {
      graphml += `    <node id="${doc.id}">\n`;
      graphml += `      <data key="type">${doc.type}</data>\n`;
      graphml += `      <data key="name">${doc.name || ''}</data>\n`;
      graphml += '    </node>\n';
    });
    
    // Add edges
    map.relationships.forEach(rel => {
      graphml += `    <edge source="${rel.source}" target="${rel.target}">\n`;
      graphml += `      <data key="type">${rel.type}</data>\n`;
      graphml += `      <data key="confidence">${rel.confidence}</data>\n`;
      graphml += '    </edge>\n';
    });
    
    graphml += '  </graph>\n';
    graphml += '</graphml>';
    
    return graphml;
  }

  convertToDOT(map) {
    let dot = 'digraph DocumentRelationships {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box];\n\n';
    
    // Add nodes
    map.documents.forEach(doc => {
      const label = doc.name || doc.type;
      dot += `  "${doc.id}" [label="${label}"];\n`;
    });
    
    dot += '\n';
    
    // Add edges
    map.relationships.forEach(rel => {
      const label = this.getEdgeLabel(rel);
      dot += `  "${rel.source}" -> "${rel.target}" [label="${label}"];\n`;
    });
    
    dot += '}';
    
    return dot;
  }

  convertToCSV(map) {
    let csv = 'Source,Target,RelationType,Confidence\n';
    
    map.relationships.forEach(rel => {
      csv += `"${rel.source}","${rel.target}","${rel.type}",${rel.confidence}\n`;
    });
    
    return csv;
  }

  convertToCytoscape(map) {
    const elements = {
      nodes: map.documents.map(doc => ({
        data: {
          id: doc.id,
          label: doc.name || doc.type,
          type: doc.type
        }
      })),
      edges: map.relationships.map(rel => ({
        data: {
          id: rel.id,
          source: rel.source,
          target: rel.target,
          type: rel.type,
          confidence: rel.confidence
        }
      }))
    };
    
    return elements;
  }

  createTripMilestones(trip, dateRange) {
    const milestones = [];
    
    if (trip.metadata?.departureDate) {
      milestones.push({
        date: new Date(trip.metadata.departureDate),
        title: 'Departure',
        type: 'departure',
        x: this.calculateTimelineX(new Date(trip.metadata.departureDate), dateRange)
      });
    }
    
    if (trip.metadata?.returnDate) {
      milestones.push({
        date: new Date(trip.metadata.returnDate),
        title: 'Return',
        type: 'return',
        x: this.calculateTimelineX(new Date(trip.metadata.returnDate), dateRange)
      });
    }
    
    return milestones;
  }

  getEventSize(event) {
    const sizes = {
      departure: 12,
      arrival: 12,
      booking: 10,
      created: 8
    };
    
    return sizes[event.type] || 8;
  }

  applyHierarchicalLayout(graph) {
    // Build hierarchy from relationships
    const levels = new Map();
    const visited = new Set();
    
    // Find root nodes (no incoming edges)
    const roots = graph.nodes.filter(node => 
      !graph.edges.some(edge => edge.target === node.id)
    );
    
    // Assign levels using BFS
    roots.forEach(root => {
      const queue = [{ node: root, level: 0 }];
      
      while (queue.length > 0) {
        const { node, level } = queue.shift();
        
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        
        if (!levels.has(level)) {
          levels.set(level, []);
        }
        levels.get(level).push(node);
        
        // Find children
        graph.edges
          .filter(edge => edge.source === node.id)
          .forEach(edge => {
            const child = graph.nodes.find(n => n.id === edge.target);
            if (child && !visited.has(child.id)) {
              queue.push({ node: child, level: level + 1 });
            }
          });
      }
    });
    
    // Position nodes by level
    const levelHeight = 150;
    const nodeSpacing = 100;
    
    levels.forEach((nodes, level) => {
      const levelWidth = nodes.length * nodeSpacing;
      const startX = 500 - levelWidth / 2;
      
      nodes.forEach((node, index) => {
        node.x = startX + index * nodeSpacing;
        node.y = 100 + level * levelHeight;
      });
    });
  }
}

// Export singleton instance
const relationshipVisualizer = new RelationshipVisualizer();
export default relationshipVisualizer;