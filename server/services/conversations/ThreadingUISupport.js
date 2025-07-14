/**
 * ThreadingUISupport - UI Support Structure for Conversation Threading
 * 
 * Provides data structures, visualization support, and logic for thread
 * management in the UI including branch comparison and switching.
 */

export class ThreadingUISupport {
  constructor(options = {}) {
    this.options = {
      maxVisibleDepth: options.maxVisibleDepth || 5,
      enableAnimations: options.enableAnimations !== false,
      compactView: options.compactView || false,
      ...options
    };
  }

  /**
   * Transform conversation tree for UI visualization
   * @param {Object} tree - Raw conversation tree
   * @param {Object} options - Visualization options
   * @returns {Object} UI-ready tree structure
   */
  transformTreeForVisualization(tree, options = {}) {
    const {
      selectedThreadId = null,
      expandedNodes = [],
      highlightPaths = []
    } = options;
    
    const transformNode = (node, depth = 0, parentPath = []) => {
      const currentPath = [...parentPath, node.id];
      const isSelected = node.id === selectedThreadId;
      const isExpanded = expandedNodes.includes(node.id) || depth < 2;
      const isHighlighted = highlightPaths.some(path => 
        path.includes(node.id)
      );
      
      return {
        id: node.id,
        title: node.title,
        summary: node.summary,
        status: node.status,
        metadata: {
          branchReason: node.metadata?.branch_reason,
          branchType: node.metadata?.branch_type,
          messageCount: node.metadata?.message_count || 0,
          lastActivity: node.metadata?.last_activity || node.createdAt
        },
        
        // UI properties
        ui: {
          depth,
          path: currentPath,
          isSelected,
          isExpanded,
          isHighlighted,
          isVisible: depth <= this.options.maxVisibleDepth,
          hasChildren: node.children && node.children.length > 0,
          childCount: node.children?.length || 0,
          position: this.calculateNodePosition(node, depth, parentPath)
        },
        
        // Transform children recursively
        children: isExpanded && node.children 
          ? node.children.map((child, index) => 
              transformNode(child, depth + 1, currentPath)
            )
          : []
      };
    };
    
    return transformNode(tree);
  }

  /**
   * Generate branch comparison data
   * @param {Array} threadIds - Thread IDs to compare
   * @param {Object} threadData - Thread data including messages
   * @returns {Object} Comparison structure
   */
  generateBranchComparison(threadIds, threadData) {
    if (!Array.isArray(threadIds) || threadIds.length < 2) {
      throw new Error('At least 2 thread IDs required for comparison');
    }
    
    const comparison = {
      threads: {},
      commonElements: {
        ancestor: null,
        sharedMessages: [],
        sharedDecisions: []
      },
      differences: {
        decisions: [],
        outcomes: [],
        costs: {},
        durations: {}
      },
      visualization: {
        type: 'side-by-side',
        layout: this.calculateComparisonLayout(threadIds.length)
      }
    };
    
    // Process each thread
    threadIds.forEach(threadId => {
      const thread = threadData[threadId];
      if (!thread) return;
      
      comparison.threads[threadId] = {
        id: threadId,
        title: thread.title,
        summary: thread.summary,
        metrics: this.extractThreadMetrics(thread),
        highlights: this.extractHighlights(thread),
        timeline: this.buildThreadTimeline(thread)
      };
    });
    
    // Find common elements
    comparison.commonElements = this.findCommonElements(comparison.threads);
    
    // Identify differences
    comparison.differences = this.identifyDifferences(comparison.threads);
    
    // Add comparison summary
    comparison.summary = this.generateComparisonSummary(comparison);
    
    return comparison;
  }

  /**
   * Create thread switching context
   * @param {string} fromThreadId - Current thread ID
   * @param {string} toThreadId - Target thread ID
   * @param {Object} threadData - Thread information
   * @returns {Object} Switch context
   */
  createThreadSwitchContext(fromThreadId, toThreadId, threadData) {
    const context = {
      from: {
        id: fromThreadId,
        state: null,
        unsavedChanges: []
      },
      to: {
        id: toThreadId,
        state: null,
        preview: null
      },
      transition: {
        type: 'switch',
        preserveState: true,
        animations: []
      },
      warnings: []
    };
    
    // Capture current thread state
    if (threadData[fromThreadId]) {
      context.from.state = {
        scrollPosition: threadData[fromThreadId].ui?.scrollPosition || 0,
        expandedNodes: threadData[fromThreadId].ui?.expandedNodes || [],
        selectedMessages: threadData[fromThreadId].ui?.selectedMessages || []
      };
      
      // Check for unsaved changes
      if (threadData[fromThreadId].hasUnsavedChanges) {
        context.warnings.push({
          type: 'unsaved_changes',
          message: 'You have unsaved changes in the current thread',
          actions: ['save', 'discard', 'cancel']
        });
      }
    }
    
    // Prepare target thread
    if (threadData[toThreadId]) {
      context.to.state = threadData[toThreadId].savedState || {};
      context.to.preview = {
        title: threadData[toThreadId].title,
        summary: threadData[toThreadId].summary,
        lastMessage: threadData[toThreadId].lastMessage
      };
      
      // Determine transition type
      context.transition.type = this.determineTransitionType(
        threadData[fromThreadId],
        threadData[toThreadId]
      );
    }
    
    // Add animations if enabled
    if (this.options.enableAnimations) {
      context.transition.animations = this.generateTransitionAnimations(
        context.transition.type
      );
    }
    
    return context;
  }

  /**
   * Build merge visualization data
   * @param {Array} threadIds - Threads to merge
   * @param {Object} mergeOptions - Merge configuration
   * @returns {Object} Merge visualization
   */
  buildMergeVisualization(threadIds, mergeOptions = {}) {
    const visualization = {
      threads: threadIds.map(id => ({ id, role: 'source' })),
      primaryThread: mergeOptions.primaryThreadId || threadIds[0],
      mergeStrategy: mergeOptions.strategy || 'chronological',
      preview: {
        conflicts: [],
        timeline: [],
        resultMetrics: {}
      },
      ui: {
        layout: 'merge-flow',
        highlightConflicts: true,
        showTimeline: true
      }
    };
    
    // Mark primary thread
    visualization.threads = visualization.threads.map(thread => ({
      ...thread,
      role: thread.id === visualization.primaryThread ? 'primary' : 'source'
    }));
    
    return visualization;
  }

  /**
   * Generate thread navigation data
   * @param {Object} currentThread - Current thread information
   * @param {Object} tree - Full conversation tree
   * @returns {Object} Navigation structure
   */
  generateThreadNavigation(currentThread, tree) {
    const navigation = {
      current: {
        id: currentThread.id,
        title: currentThread.title,
        path: this.buildThreadPath(currentThread.id, tree)
      },
      parent: null,
      siblings: [],
      children: [],
      breadcrumbs: [],
      shortcuts: []
    };
    
    // Find parent
    if (currentThread.parent_conversation_id) {
      navigation.parent = this.findThreadInTree(
        tree,
        currentThread.parent_conversation_id
      );
    }
    
    // Find siblings
    if (navigation.parent) {
      navigation.siblings = navigation.parent.children
        .filter(child => child.id !== currentThread.id)
        .map(sibling => ({
          id: sibling.id,
          title: sibling.title,
          status: sibling.status,
          branchType: sibling.metadata?.branch_type
        }));
    }
    
    // Get direct children
    navigation.children = currentThread.children?.map(child => ({
      id: child.id,
      title: child.title,
      status: child.status,
      branchType: child.metadata?.branch_type,
      childCount: child.children?.length || 0
    })) || [];
    
    // Build breadcrumbs
    navigation.breadcrumbs = this.buildBreadcrumbs(navigation.current.path, tree);
    
    // Add navigation shortcuts
    navigation.shortcuts = this.generateNavigationShortcuts(currentThread, tree);
    
    return navigation;
  }

  // Helper methods

  calculateNodePosition(node, depth, parentPath) {
    // Calculate visual position for tree layout
    return {
      x: depth * 200, // Horizontal spacing
      y: 0, // Will be calculated based on siblings
      depth,
      angle: this.calculateBranchAngle(node, parentPath)
    };
  }

  calculateComparisonLayout(threadCount) {
    if (threadCount <= 2) {
      return {
        type: 'side-by-side',
        columns: threadCount,
        syncScroll: true
      };
    } else if (threadCount <= 4) {
      return {
        type: 'grid',
        columns: 2,
        rows: 2,
        syncScroll: false
      };
    } else {
      return {
        type: 'carousel',
        visibleCount: 3,
        syncScroll: false
      };
    }
  }

  extractThreadMetrics(thread) {
    return {
      messageCount: thread.messages?.length || 0,
      duration: this.calculateThreadDuration(thread),
      decisions: thread.messages?.filter(m => m.metadata?.is_decision).length || 0,
      participants: [...new Set(thread.messages?.map(m => m.role) || [])].length,
      lastActivity: thread.messages?.[thread.messages.length - 1]?.created_at || thread.created_at
    };
  }

  extractHighlights(thread) {
    const highlights = [];
    
    // Key decisions
    thread.messages?.forEach(message => {
      if (message.metadata?.is_decision || message.metadata?.is_important) {
        highlights.push({
          type: 'decision',
          messageId: message.id,
          content: message.content.substring(0, 100) + '...',
          timestamp: message.created_at
        });
      }
    });
    
    return highlights;
  }

  buildThreadTimeline(thread) {
    const timeline = [];
    
    thread.messages?.forEach((message, index) => {
      // Add message to timeline
      timeline.push({
        type: 'message',
        id: message.id,
        timestamp: message.created_at,
        role: message.role,
        preview: message.content.substring(0, 50) + '...'
      });
      
      // Add branch points
      if (message.metadata?.branch_created) {
        timeline.push({
          type: 'branch',
          timestamp: message.created_at,
          branchId: message.metadata.branch_id,
          reason: message.metadata.branch_reason
        });
      }
    });
    
    return timeline.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  }

  findCommonElements(threads) {
    const threadList = Object.values(threads);
    if (threadList.length < 2) return {};
    
    const commonElements = {
      sharedMessages: [],
      sharedDecisions: [],
      divergencePoint: null
    };
    
    // Find shared messages (before branch)
    const firstThread = threadList[0];
    firstThread.timeline?.forEach(item => {
      if (item.type === 'message') {
        const isShared = threadList.every(thread => 
          thread.timeline?.some(t => 
            t.type === 'message' && t.id === item.id
          )
        );
        
        if (isShared) {
          commonElements.sharedMessages.push(item);
        } else if (!commonElements.divergencePoint) {
          commonElements.divergencePoint = item;
        }
      }
    });
    
    return commonElements;
  }

  identifyDifferences(threads) {
    const differences = {
      decisions: [],
      outcomes: [],
      metrics: {}
    };
    
    const threadList = Object.values(threads);
    
    // Compare metrics
    const metricKeys = ['messageCount', 'duration', 'decisions'];
    metricKeys.forEach(key => {
      differences.metrics[key] = threadList.map(thread => ({
        threadId: thread.id,
        value: thread.metrics[key]
      }));
    });
    
    // Find unique decisions
    threadList.forEach(thread => {
      thread.highlights
        ?.filter(h => h.type === 'decision')
        .forEach(decision => {
          const isUnique = !threadList.some(otherThread => 
            otherThread.id !== thread.id &&
            otherThread.highlights?.some(h => 
              h.content === decision.content
            )
          );
          
          if (isUnique) {
            differences.decisions.push({
              threadId: thread.id,
              decision
            });
          }
        });
    });
    
    return differences;
  }

  generateComparisonSummary(comparison) {
    const threadCount = Object.keys(comparison.threads).length;
    const commonCount = comparison.commonElements.sharedMessages?.length || 0;
    const avgMessages = Object.values(comparison.threads)
      .reduce((sum, t) => sum + t.metrics.messageCount, 0) / threadCount;
    
    return {
      threadCount,
      commonMessageCount: commonCount,
      averageMessageCount: Math.round(avgMessages),
      divergencePoint: comparison.commonElements.divergencePoint,
      recommendation: this.generateComparisonRecommendation(comparison)
    };
  }

  generateComparisonRecommendation(comparison) {
    const differences = comparison.differences.decisions.length;
    
    if (differences === 0) {
      return 'Threads are very similar. Consider merging.';
    } else if (differences < 3) {
      return 'Threads have minor differences. Review key decisions before merging.';
    } else {
      return 'Threads have significant differences. Carefully review before deciding.';
    }
  }

  determineTransitionType(fromThread, toThread) {
    if (!fromThread || !toThread) return 'fade';
    
    if (fromThread.parent_conversation_id === toThread.id) {
      return 'slide-down'; // Going to parent
    } else if (toThread.parent_conversation_id === fromThread.id) {
      return 'slide-up'; // Going to child
    } else if (fromThread.parent_conversation_id === toThread.parent_conversation_id) {
      return 'slide-horizontal'; // Siblings
    }
    
    return 'fade'; // Default
  }

  generateTransitionAnimations(transitionType) {
    const animations = {
      'slide-up': [
        { property: 'transform', from: 'translateY(100%)', to: 'translateY(0)' },
        { property: 'opacity', from: '0', to: '1' }
      ],
      'slide-down': [
        { property: 'transform', from: 'translateY(-100%)', to: 'translateY(0)' },
        { property: 'opacity', from: '0', to: '1' }
      ],
      'slide-horizontal': [
        { property: 'transform', from: 'translateX(100%)', to: 'translateX(0)' },
        { property: 'opacity', from: '0', to: '1' }
      ],
      'fade': [
        { property: 'opacity', from: '0', to: '1' }
      ]
    };
    
    return animations[transitionType] || animations.fade;
  }

  calculateBranchAngle(node, parentPath) {
    // Calculate visual branch angle for tree rendering
    const siblingIndex = node.parent?.children?.indexOf(node) || 0;
    const siblingCount = node.parent?.children?.length || 1;
    
    if (siblingCount === 1) return 0;
    
    const angleRange = 60; // degrees
    const angleStep = angleRange / (siblingCount - 1);
    
    return -angleRange/2 + (siblingIndex * angleStep);
  }

  calculateThreadDuration(thread) {
    if (!thread.messages || thread.messages.length < 2) return 0;
    
    const firstMessage = thread.messages[0];
    const lastMessage = thread.messages[thread.messages.length - 1];
    
    const duration = new Date(lastMessage.created_at) - new Date(firstMessage.created_at);
    return Math.round(duration / 1000 / 60); // Duration in minutes
  }

  buildThreadPath(threadId, tree) {
    const path = [];
    
    function findPath(node, targetId, currentPath) {
      if (node.id === targetId) {
        path.push(...currentPath, node.id);
        return true;
      }
      
      if (node.children) {
        for (const child of node.children) {
          if (findPath(child, targetId, [...currentPath, node.id])) {
            return true;
          }
        }
      }
      
      return false;
    }
    
    findPath(tree, threadId, []);
    return path;
  }

  findThreadInTree(tree, threadId) {
    if (tree.id === threadId) return tree;
    
    if (tree.children) {
      for (const child of tree.children) {
        const found = this.findThreadInTree(child, threadId);
        if (found) return found;
      }
    }
    
    return null;
  }

  buildBreadcrumbs(path, tree) {
    return path.map(nodeId => {
      const node = this.findThreadInTree(tree, nodeId);
      return {
        id: nodeId,
        title: node?.title || 'Unknown',
        isClickable: true
      };
    });
  }

  generateNavigationShortcuts(currentThread, tree) {
    const shortcuts = [];
    
    // Add root shortcut
    shortcuts.push({
      id: tree.id,
      title: 'Root',
      icon: 'home',
      type: 'root'
    });
    
    // Add recent threads
    const recentThreads = this.findRecentThreads(tree, currentThread.id, 3);
    recentThreads.forEach(thread => {
      shortcuts.push({
        id: thread.id,
        title: thread.title,
        icon: 'history',
        type: 'recent'
      });
    });
    
    // Add active branches
    const activeBranches = this.findActiveThreads(tree, currentThread.id);
    activeBranches.slice(0, 2).forEach(thread => {
      shortcuts.push({
        id: thread.id,
        title: thread.title,
        icon: 'branch',
        type: 'active'
      });
    });
    
    return shortcuts;
  }

  findRecentThreads(tree, excludeId, limit = 5) {
    const threads = [];
    
    function collectThreads(node) {
      if (node.id !== excludeId) {
        threads.push({
          id: node.id,
          title: node.title,
          lastActivity: node.metadata?.last_activity || node.createdAt
        });
      }
      
      if (node.children) {
        node.children.forEach(child => collectThreads(child));
      }
    }
    
    collectThreads(tree);
    
    return threads
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
      .slice(0, limit);
  }

  findActiveThreads(tree, excludeId) {
    const threads = [];
    
    function collectActive(node) {
      if (node.id !== excludeId && node.status === 'active') {
        threads.push(node);
      }
      
      if (node.children) {
        node.children.forEach(child => collectActive(child));
      }
    }
    
    collectActive(tree);
    return threads;
  }
}

export default ThreadingUISupport;