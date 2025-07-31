/**
 * Data Analysis Service for CMO Marketing Data
 * Handles file parsing, data processing, and analysis workflows
 */

import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

class DataAnalysisService {
  constructor() {
    this.supportedFormats = ['.csv', '.json'];
    this.dataCache = new Map();
    this.analysisResults = new Map();
  }

  /**
   * Process uploaded file and extract data
   */
  async processFile(file, dataType) {
    try {
      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      if (!this.supportedFormats.includes(fileExtension)) {
        throw new Error(`Unsupported file format: ${fileExtension}`);
      }

      let data;
      switch (fileExtension) {
        case '.csv':
          data = await this.parseCSV(file.buffer);
          break;
        case '.xlsx':
        case '.xls':
          data = await this.parseExcel(file.buffer);
          break;
        case '.json':
          data = JSON.parse(file.buffer.toString());
          break;
        default:
          throw new Error('Unsupported file format');
      }

      // Process and standardize data
      const processedData = await this.processData(data, dataType);
      
      // Cache the data
      const dataId = `${Date.now()}-${file.originalname}`;
      this.dataCache.set(dataId, {
        originalName: file.originalname,
        dataType,
        uploadDate: new Date(),
        rawData: data,
        processedData
      });

      return {
        success: true,
        dataId,
        summary: this.generateDataSummary(processedData),
        processedData
      };
    } catch (error) {
      console.error('File processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse CSV file
   */
  async parseCSV(buffer) {
    const text = buffer.toString();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return [];
    
    const headers = this.parseCSVLine(lines[0]);
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length > 0) {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        results.push(obj);
      }
    }
    
    return results;
  }
  
  /**
   * Parse a single CSV line handling quotes and commas
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Parse Excel file
   */
  async parseExcel(buffer) {
    // For now, Excel parsing is not supported without XLSX library
    // Return error message
    throw new Error('Excel file parsing requires XLSX library. Please convert to CSV format.');
  }

  /**
   * Process and standardize data based on type
   */
  async processData(rawData, dataType) {
    switch (dataType) {
      case 'campaign':
        return this.processCampaignData(rawData);
      case 'social':
        return this.processSocialData(rawData);
      case 'seo':
        return this.processSEOData(rawData);
      case 'email':
        return this.processEmailData(rawData);
      case 'competitor':
        return this.processCompetitorData(rawData);
      default:
        return this.processGenericData(rawData);
    }
  }

  /**
   * Process campaign performance data
   */
  processCampaignData(data) {
    return data.map(row => ({
      date: this.parseDate(row.Date || row.date || row.DATE),
      campaign: row.Campaign || row.campaign || row.CAMPAIGN || 'Unknown',
      impressions: this.parseNumber(row.Impressions || row.impressions || row.IMPRESSIONS),
      clicks: this.parseNumber(row.Clicks || row.clicks || row.CLICKS),
      conversions: this.parseNumber(row.Conversions || row.conversions || row.CONVERSIONS),
      cost: this.parseNumber(row.Cost || row.cost || row.COST || row.Spend || row.spend),
      revenue: this.parseNumber(row.Revenue || row.revenue || row.REVENUE || 0),
      ctr: this.parseNumber(row.CTR || row.ctr) || this.calculateCTR(row),
      conversionRate: this.parseNumber(row['Conversion Rate'] || row.conversionRate) || this.calculateConversionRate(row),
      cpc: this.parseNumber(row.CPC || row.cpc) || this.calculateCPC(row),
      roas: this.parseNumber(row.ROAS || row.roas) || this.calculateROAS(row)
    }));
  }

  /**
   * Process social media data
   */
  processSocialData(data) {
    return data.map(row => ({
      date: this.parseDate(row.Date || row.date || row.DATE),
      platform: row.Platform || row.platform || row.PLATFORM || 'Unknown',
      followers: this.parseNumber(row.Followers || row.followers || row.FOLLOWERS),
      engagement: this.parseNumber(row.Engagement || row.engagement || row.ENGAGEMENT),
      reach: this.parseNumber(row.Reach || row.reach || row.REACH),
      impressions: this.parseNumber(row.Impressions || row.impressions || row.IMPRESSIONS),
      posts: this.parseNumber(row.Posts || row.posts || row.POSTS || 1),
      likes: this.parseNumber(row.Likes || row.likes || row.LIKES || 0),
      comments: this.parseNumber(row.Comments || row.comments || row.COMMENTS || 0),
      shares: this.parseNumber(row.Shares || row.shares || row.SHARES || 0),
      engagementRate: this.parseNumber(row['Engagement Rate'] || row.engagementRate) || this.calculateEngagementRate(row)
    }));
  }

  /**
   * Process SEO data
   */
  processSEOData(data) {
    return data.map(row => ({
      date: this.parseDate(row.Date || row.date || row.DATE),
      keyword: row.Keyword || row.keyword || row.KEYWORD || 'Unknown',
      position: this.parseNumber(row.Position || row.position || row.POSITION || row.Rank || row.rank),
      previousPosition: this.parseNumber(row['Previous Position'] || row.previousPosition || 0),
      volume: this.parseNumber(row.Volume || row.volume || row.VOLUME || row['Search Volume']),
      difficulty: this.parseNumber(row.Difficulty || row.difficulty || row.DIFFICULTY || row.KD),
      clicks: this.parseNumber(row.Clicks || row.clicks || row.CLICKS),
      impressions: this.parseNumber(row.Impressions || row.impressions || row.IMPRESSIONS),
      ctr: this.parseNumber(row.CTR || row.ctr) || this.calculateCTR(row),
      url: row.URL || row.url || row.Url || ''
    }));
  }

  /**
   * Process email marketing data
   */
  processEmailData(data) {
    return data.map(row => ({
      date: this.parseDate(row.Date || row.date || row.DATE || row['Send Date']),
      campaign: row.Campaign || row.campaign || row.CAMPAIGN || row.Subject || 'Unknown',
      sent: this.parseNumber(row.Sent || row.sent || row.SENT || row.Delivered),
      delivered: this.parseNumber(row.Delivered || row.delivered || row.DELIVERED),
      opens: this.parseNumber(row.Opens || row.opens || row.OPENS || row.Opened),
      uniqueOpens: this.parseNumber(row['Unique Opens'] || row.uniqueOpens || row.opens),
      clicks: this.parseNumber(row.Clicks || row.clicks || row.CLICKS || row.Clicked),
      uniqueClicks: this.parseNumber(row['Unique Clicks'] || row.uniqueClicks || row.clicks),
      unsubscribes: this.parseNumber(row.Unsubscribes || row.unsubscribes || row.UNSUBSCRIBES || 0),
      bounces: this.parseNumber(row.Bounces || row.bounces || row.BOUNCES || 0),
      openRate: this.parseNumber(row['Open Rate'] || row.openRate) || this.calculateOpenRate(row),
      clickRate: this.parseNumber(row['Click Rate'] || row.clickRate) || this.calculateClickRate(row),
      conversionRate: this.parseNumber(row['Conversion Rate'] || row.conversionRate || 0)
    }));
  }

  /**
   * Process competitor analysis data
   */
  processCompetitorData(data) {
    // Group data by competitor if not already structured
    const competitorMap = new Map();
    
    data.forEach(row => {
      const competitor = row.Competitor || row.competitor || row.COMPETITOR || 'Unknown';
      if (!competitorMap.has(competitor)) {
        competitorMap.set(competitor, {
          name: competitor,
          metrics: {}
        });
      }
      
      const competitorData = competitorMap.get(competitor);
      
      // Extract all numeric metrics
      Object.keys(row).forEach(key => {
        const value = this.parseNumber(row[key]);
        if (!isNaN(value) && key.toLowerCase() !== 'date') {
          competitorData.metrics[key] = value;
        }
      });
    });
    
    return {
      competitors: Array.from(competitorMap.keys()),
      ourData: this.extractOurData(data),
      competitorData: Object.fromEntries(competitorMap),
      comparisonData: data
    };
  }

  /**
   * Process generic data
   */
  processGenericData(data) {
    // Attempt to identify date and numeric columns
    return data.map(row => {
      const processed = {};
      
      Object.entries(row).forEach(([key, value]) => {
        // Try to identify date columns
        if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
          processed[key] = this.parseDate(value);
        } else {
          // Try to parse as number, otherwise keep as string
          const numValue = this.parseNumber(value);
          processed[key] = isNaN(numValue) ? value : numValue;
        }
      });
      
      return processed;
    });
  }

  /**
   * Extract our company data from competitor dataset
   */
  extractOurData(data) {
    const ourRow = data.find(row => 
      (row.Competitor || row.competitor || '').toLowerCase().includes('our') ||
      (row.Competitor || row.competitor || '').toLowerCase().includes('us') ||
      (row.Competitor || row.competitor || '').toLowerCase().includes('self')
    );
    
    if (ourRow) {
      const metrics = {};
      Object.keys(ourRow).forEach(key => {
        const value = this.parseNumber(ourRow[key]);
        if (!isNaN(value) && key.toLowerCase() !== 'date') {
          metrics[key] = value;
        }
      });
      return metrics;
    }
    
    return {};
  }

  /**
   * Helper functions for parsing data
   */
  parseDate(value) {
    if (!value) return new Date().toISOString().split('T')[0];
    
    // Try to parse various date formats
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Try MM/DD/YYYY format
    const parts = value.toString().split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [month, day, year] = parts;
      const parsedDate = new Date(year, month - 1, day);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
    }
    
    return new Date().toISOString().split('T')[0];
  }

  parseNumber(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    // Remove currency symbols, commas, and percentage signs
    const cleaned = value.toString()
      .replace(/[$,€£¥%]/g, '')
      .replace(/\s/g, '')
      .trim();
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Calculation helpers
   */
  calculateCTR(row) {
    const clicks = this.parseNumber(row.Clicks || row.clicks || 0);
    const impressions = this.parseNumber(row.Impressions || row.impressions || 0);
    return impressions > 0 ? (clicks / impressions) * 100 : 0;
  }

  calculateConversionRate(row) {
    const conversions = this.parseNumber(row.Conversions || row.conversions || 0);
    const clicks = this.parseNumber(row.Clicks || row.clicks || 0);
    return clicks > 0 ? (conversions / clicks) * 100 : 0;
  }

  calculateCPC(row) {
    const cost = this.parseNumber(row.Cost || row.cost || row.Spend || 0);
    const clicks = this.parseNumber(row.Clicks || row.clicks || 0);
    return clicks > 0 ? cost / clicks : 0;
  }

  calculateROAS(row) {
    const revenue = this.parseNumber(row.Revenue || row.revenue || 0);
    const cost = this.parseNumber(row.Cost || row.cost || row.Spend || 0);
    return cost > 0 ? revenue / cost : 0;
  }

  calculateEngagementRate(row) {
    const engagement = this.parseNumber(row.Engagement || row.engagement || 
      (row.Likes || 0) + (row.Comments || 0) + (row.Shares || 0));
    const reach = this.parseNumber(row.Reach || row.reach || row.Impressions || 0);
    return reach > 0 ? (engagement / reach) * 100 : 0;
  }

  calculateOpenRate(row) {
    const opens = this.parseNumber(row.Opens || row.opens || row['Unique Opens'] || 0);
    const delivered = this.parseNumber(row.Delivered || row.delivered || row.Sent || 0);
    return delivered > 0 ? (opens / delivered) * 100 : 0;
  }

  calculateClickRate(row) {
    const clicks = this.parseNumber(row.Clicks || row.clicks || row['Unique Clicks'] || 0);
    const delivered = this.parseNumber(row.Delivered || row.delivered || row.Sent || 0);
    return delivered > 0 ? (clicks / delivered) * 100 : 0;
  }

  /**
   * Generate data summary
   */
  generateDataSummary(data) {
    const summary = {
      totalRecords: Array.isArray(data) ? data.length : 1,
      dateRange: this.getDateRange(data),
      keyMetrics: {},
      dataQuality: this.assessDataQuality(data)
    };

    // Calculate key metrics based on data type
    if (Array.isArray(data) && data.length > 0) {
      const sample = data[0];
      
      Object.keys(sample).forEach(key => {
        if (typeof sample[key] === 'number') {
          const values = data.map(row => row[key] || 0);
          summary.keyMetrics[key] = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            total: values.reduce((a, b) => a + b, 0)
          };
        }
      });
    }

    return summary;
  }

  /**
   * Get date range from data
   */
  getDateRange(data) {
    if (!Array.isArray(data) || data.length === 0) return null;
    
    const dates = data
      .map(row => row.date || row.Date)
      .filter(date => date)
      .sort();
    
    return {
      start: dates[0],
      end: dates[dates.length - 1]
    };
  }

  /**
   * Assess data quality
   */
  assessDataQuality(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return { score: 0, issues: ['No data available'] };
    }

    const issues = [];
    let score = 100;

    // Check for missing values
    const missingRate = this.calculateMissingRate(data);
    if (missingRate > 0.1) {
      issues.push(`${(missingRate * 100).toFixed(0)}% missing values`);
      score -= missingRate * 50;
    }

    // Check for duplicate rows
    const duplicateRate = this.calculateDuplicateRate(data);
    if (duplicateRate > 0.05) {
      issues.push(`${(duplicateRate * 100).toFixed(0)}% duplicate rows`);
      score -= duplicateRate * 30;
    }

    // Check for data consistency
    if (data.length < 10) {
      issues.push('Limited data points');
      score -= 20;
    }

    return {
      score: Math.max(0, Math.round(score)),
      issues
    };
  }

  /**
   * Calculate missing value rate
   */
  calculateMissingRate(data) {
    let totalFields = 0;
    let missingFields = 0;

    data.forEach(row => {
      Object.values(row).forEach(value => {
        totalFields++;
        if (value === null || value === undefined || value === '') {
          missingFields++;
        }
      });
    });

    return totalFields > 0 ? missingFields / totalFields : 0;
  }

  /**
   * Calculate duplicate row rate
   */
  calculateDuplicateRate(data) {
    const uniqueRows = new Set(data.map(row => JSON.stringify(row)));
    return 1 - (uniqueRows.size / data.length);
  }

  /**
   * Perform analysis on processed data
   */
  async analyzeData(dataId, analysisType) {
    const cachedData = this.dataCache.get(dataId);
    if (!cachedData) {
      throw new Error('Data not found');
    }

    const { processedData, dataType } = cachedData;
    
    let analysis;
    switch (analysisType) {
      case 'performance':
        analysis = await this.performanceAnalysis(processedData, dataType);
        break;
      case 'trends':
        analysis = await this.trendAnalysis(processedData, dataType);
        break;
      case 'comparison':
        analysis = await this.comparisonAnalysis(processedData, dataType);
        break;
      case 'forecast':
        analysis = await this.forecastAnalysis(processedData, dataType);
        break;
      default:
        analysis = await this.comprehensiveAnalysis(processedData, dataType);
    }

    // Cache analysis results
    this.analysisResults.set(`${dataId}-${analysisType}`, {
      timestamp: new Date(),
      analysis
    });

    return analysis;
  }

  /**
   * Performance analysis
   */
  async performanceAnalysis(data, dataType) {
    const metrics = this.calculatePerformanceMetrics(data, dataType);
    const insights = this.generatePerformanceInsights(metrics, dataType);
    const recommendations = this.generateRecommendations(insights, dataType);

    return {
      metrics,
      insights,
      recommendations,
      score: this.calculatePerformanceScore(metrics, dataType)
    };
  }

  /**
   * Trend analysis
   */
  async trendAnalysis(data, dataType) {
    const trends = this.identifyTrends(data);
    const patterns = this.detectPatterns(data);
    const seasonality = this.detectSeasonality(data);
    const forecast = this.generateForecast(trends);

    return {
      trends,
      patterns,
      seasonality,
      forecast
    };
  }

  /**
   * Comparison analysis
   */
  async comparisonAnalysis(data, dataType) {
    if (dataType !== 'competitor') {
      return {
        error: 'Comparison analysis requires competitor data'
      };
    }

    const gaps = this.identifyCompetitiveGaps(data);
    const strengths = this.identifyStrengths(data);
    const weaknesses = this.identifyWeaknesses(data);
    const opportunities = this.identifyOpportunities(data, gaps);

    return {
      gaps,
      strengths,
      weaknesses,
      opportunities,
      competitivePosition: this.assessCompetitivePosition(data)
    };
  }

  /**
   * Forecast analysis
   */
  async forecastAnalysis(data, dataType) {
    const historicalTrends = this.analyzeHistoricalTrends(data);
    const predictions = this.generatePredictions(historicalTrends);
    const scenarios = this.generateScenarios(predictions);
    const risks = this.identifyRisks(predictions);

    return {
      historicalTrends,
      predictions,
      scenarios,
      risks,
      confidence: this.calculateForecastConfidence(historicalTrends)
    };
  }

  /**
   * Comprehensive analysis
   */
  async comprehensiveAnalysis(data, dataType) {
    const performance = await this.performanceAnalysis(data, dataType);
    const trends = await this.trendAnalysis(data, dataType);
    
    let comparison = null;
    if (dataType === 'competitor') {
      comparison = await this.comparisonAnalysis(data, dataType);
    }
    
    const forecast = await this.forecastAnalysis(data, dataType);
    
    return {
      performance,
      trends,
      comparison,
      forecast,
      summary: this.generateExecutiveSummary({
        performance,
        trends,
        comparison,
        forecast
      })
    };
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(data, dataType) {
    const metrics = {};
    
    switch (dataType) {
      case 'campaign':
        metrics.avgCTR = this.average(data.map(d => d.ctr));
        metrics.avgConversionRate = this.average(data.map(d => d.conversionRate));
        metrics.avgROAS = this.average(data.map(d => d.roas));
        metrics.totalCost = this.sum(data.map(d => d.cost));
        metrics.totalRevenue = this.sum(data.map(d => d.revenue));
        break;
        
      case 'social':
        metrics.avgEngagementRate = this.average(data.map(d => d.engagementRate));
        metrics.totalEngagement = this.sum(data.map(d => d.engagement));
        metrics.followerGrowth = this.calculateGrowthRate(data, 'followers');
        break;
        
      case 'seo':
        metrics.avgPosition = this.average(data.map(d => d.position));
        metrics.avgCTR = this.average(data.map(d => d.ctr));
        metrics.totalClicks = this.sum(data.map(d => d.clicks));
        break;
        
      case 'email':
        metrics.avgOpenRate = this.average(data.map(d => d.openRate));
        metrics.avgClickRate = this.average(data.map(d => d.clickRate));
        metrics.deliverability = this.calculateDeliverability(data);
        break;
    }
    
    return metrics;
  }

  /**
   * Generate performance insights
   */
  generatePerformanceInsights(metrics, dataType) {
    const insights = [];
    const benchmarks = this.getIndustryBenchmarks(dataType);
    
    Object.entries(metrics).forEach(([metric, value]) => {
      const benchmark = benchmarks[metric];
      if (benchmark) {
        const performanceRatio = value / benchmark;
        
        if (performanceRatio < 0.8) {
          insights.push({
            type: 'warning',
            metric,
            message: `${metric} is ${((1 - performanceRatio) * 100).toFixed(0)}% below industry average`,
            impact: 'high',
            value,
            benchmark
          });
        } else if (performanceRatio > 1.2) {
          insights.push({
            type: 'success',
            metric,
            message: `${metric} is ${((performanceRatio - 1) * 100).toFixed(0)}% above industry average`,
            impact: 'positive',
            value,
            benchmark
          });
        }
      }
    });
    
    return insights;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(insights, dataType) {
    const recommendations = [];
    
    insights.forEach(insight => {
      if (insight.type === 'warning') {
        recommendations.push(this.getRecommendationForWarning(insight, dataType));
      }
    });
    
    return recommendations;
  }

  /**
   * Get recommendation for warning
   */
  getRecommendationForWarning(warning, dataType) {
    const recommendationMap = {
      campaign: {
        avgCTR: {
          title: 'Improve Click-Through Rate',
          actions: [
            'Test new ad copy variations',
            'Improve targeting parameters',
            'Enhance visual creative'
          ]
        },
        avgConversionRate: {
          title: 'Optimize Conversion Rate',
          actions: [
            'Improve landing page experience',
            'Add social proof elements',
            'Simplify conversion process'
          ]
        }
      },
      social: {
        avgEngagementRate: {
          title: 'Boost Engagement',
          actions: [
            'Post more interactive content',
            'Optimize posting times',
            'Use trending hashtags'
          ]
        }
      }
    };
    
    return recommendationMap[dataType]?.[warning.metric] || {
      title: 'Improve Performance',
      actions: ['Analyze competitors', 'Test new strategies', 'Consult best practices']
    };
  }

  /**
   * Calculate performance score
   */
  calculatePerformanceScore(metrics, dataType) {
    const benchmarks = this.getIndustryBenchmarks(dataType);
    let totalScore = 0;
    let count = 0;
    
    Object.entries(metrics).forEach(([metric, value]) => {
      const benchmark = benchmarks[metric];
      if (benchmark && typeof value === 'number') {
        const score = Math.min(100, (value / benchmark) * 100);
        totalScore += score;
        count++;
      }
    });
    
    return count > 0 ? Math.round(totalScore / count) : 50;
  }

  /**
   * Get industry benchmarks
   */
  getIndustryBenchmarks(dataType) {
    const benchmarks = {
      campaign: {
        avgCTR: 2.0,
        avgConversionRate: 2.5,
        avgROAS: 4.0
      },
      social: {
        avgEngagementRate: 3.0,
        followerGrowth: 5.0
      },
      seo: {
        avgPosition: 10,
        avgCTR: 3.0
      },
      email: {
        avgOpenRate: 20,
        avgClickRate: 2.5,
        deliverability: 95
      }
    };
    
    return benchmarks[dataType] || {};
  }

  /**
   * Identify trends
   */
  identifyTrends(data) {
    const trends = [];
    const metrics = this.getNumericColumns(data);
    
    metrics.forEach(metric => {
      const values = data.map(d => d[metric]);
      const trend = this.calculateTrend(values);
      
      if (Math.abs(trend.slope) > 0.1) {
        trends.push({
          metric,
          direction: trend.slope > 0 ? 'increasing' : 'decreasing',
          strength: Math.abs(trend.slope),
          r2: trend.r2,
          forecast: this.simpleForecast(values, trend)
        });
      }
    });
    
    return trends.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Detect patterns
   */
  detectPatterns(data) {
    const patterns = [];
    const metrics = this.getNumericColumns(data);
    
    metrics.forEach(metric => {
      const values = data.map(d => d[metric]);
      
      // Detect cyclical patterns
      const cyclical = this.detectCyclicalPattern(values);
      if (cyclical) {
        patterns.push({
          type: 'cyclical',
          metric,
          period: cyclical.period,
          amplitude: cyclical.amplitude
        });
      }
      
      // Detect step changes
      const stepChanges = this.detectStepChanges(values);
      if (stepChanges.length > 0) {
        patterns.push({
          type: 'step_change',
          metric,
          changes: stepChanges
        });
      }
    });
    
    return patterns;
  }

  /**
   * Detect seasonality
   */
  detectSeasonality(data) {
    if (!data.length || !data[0].date) return null;
    
    const metrics = this.getNumericColumns(data);
    const seasonality = {};
    
    metrics.forEach(metric => {
      const valuesByMonth = {};
      
      data.forEach(row => {
        const month = new Date(row.date).getMonth();
        if (!valuesByMonth[month]) {
          valuesByMonth[month] = [];
        }
        valuesByMonth[month].push(row[metric]);
      });
      
      const monthlyAverages = {};
      Object.entries(valuesByMonth).forEach(([month, values]) => {
        monthlyAverages[month] = this.average(values);
      });
      
      const overallAverage = this.average(Object.values(monthlyAverages));
      const seasonalFactors = {};
      
      Object.entries(monthlyAverages).forEach(([month, avg]) => {
        seasonalFactors[month] = avg / overallAverage;
      });
      
      seasonality[metric] = {
        monthlyAverages,
        seasonalFactors,
        peakMonth: this.getMaxKey(monthlyAverages),
        lowMonth: this.getMinKey(monthlyAverages)
      };
    });
    
    return seasonality;
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary(analysis) {
    const summary = {
      overallHealth: this.calculateOverallHealth(analysis),
      keyFindings: [],
      criticalActions: [],
      opportunities: []
    };
    
    // Extract key findings
    if (analysis.performance?.insights) {
      analysis.performance.insights.forEach(insight => {
        if (insight.impact === 'high') {
          summary.keyFindings.push(insight.message);
        }
      });
    }
    
    // Extract critical actions
    if (analysis.performance?.recommendations) {
      analysis.performance.recommendations.slice(0, 3).forEach(rec => {
        summary.criticalActions.push(rec.title);
      });
    }
    
    // Extract opportunities
    if (analysis.trends?.trends) {
      analysis.trends.trends.filter(t => t.direction === 'increasing' && t.strength > 0.5)
        .forEach(trend => {
          summary.opportunities.push(`${trend.metric} showing strong growth trend`);
        });
    }
    
    return summary;
  }

  /**
   * Export analysis results
   */
  async exportAnalysis(dataId, analysisType, format) {
    const cachedAnalysis = this.analysisResults.get(`${dataId}-${analysisType}`);
    if (!cachedAnalysis) {
      throw new Error('Analysis not found');
    }
    
    const { analysis } = cachedAnalysis;
    
    switch (format) {
      case 'pdf':
        return this.exportToPDF(analysis);
      case 'excel':
        return this.exportToExcel(analysis);
      case 'json':
        return this.exportToJSON(analysis);
      case 'ppt':
        return this.exportToPowerPoint(analysis);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to PDF
   */
  async exportToPDF(analysis) {
    // This would integrate with a PDF generation library like puppeteer or pdfkit
    // For now, return a structured format that can be used by the frontend
    return {
      format: 'pdf',
      content: {
        title: 'Marketing Data Analysis Report',
        date: new Date().toISOString(),
        sections: [
          {
            title: 'Executive Summary',
            content: analysis.summary
          },
          {
            title: 'Performance Analysis',
            content: analysis.performance
          },
          {
            title: 'Trend Analysis',
            content: analysis.trends
          },
          {
            title: 'Recommendations',
            content: analysis.performance?.recommendations || []
          }
        ]
      }
    };
  }

  /**
   * Export to Excel
   */
  async exportToExcel(analysis) {
    // This would integrate with xlsx library
    return {
      format: 'excel',
      sheets: [
        {
          name: 'Summary',
          data: this.flattenObject(analysis.summary)
        },
        {
          name: 'Performance Metrics',
          data: this.flattenObject(analysis.performance?.metrics || {})
        },
        {
          name: 'Trends',
          data: analysis.trends?.trends || []
        },
        {
          name: 'Recommendations',
          data: analysis.performance?.recommendations || []
        }
      ]
    };
  }

  /**
   * Export to JSON
   */
  async exportToJSON(analysis) {
    return {
      format: 'json',
      data: analysis,
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0'
      }
    };
  }

  /**
   * Export to PowerPoint
   */
  async exportToPowerPoint(analysis) {
    // This would integrate with a PowerPoint generation library
    return {
      format: 'ppt',
      slides: [
        {
          title: 'Executive Summary',
          content: analysis.summary,
          layout: 'title_and_content'
        },
        {
          title: 'Key Performance Indicators',
          content: analysis.performance?.metrics,
          layout: 'metrics_dashboard'
        },
        {
          title: 'Trend Analysis',
          content: analysis.trends,
          layout: 'charts'
        },
        {
          title: 'Recommendations',
          content: analysis.performance?.recommendations,
          layout: 'bullet_points'
        }
      ]
    };
  }

  /**
   * Helper methods
   */
  average(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  sum(arr) {
    return arr.reduce((a, b) => a + b, 0);
  }

  calculateGrowthRate(data, metric) {
    if (data.length < 2) return 0;
    const firstValue = data[0][metric] || 0;
    const lastValue = data[data.length - 1][metric] || 0;
    return firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  }

  calculateDeliverability(data) {
    const totalSent = this.sum(data.map(d => d.sent || 0));
    const totalDelivered = this.sum(data.map(d => d.delivered || 0));
    return totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
  }

  getNumericColumns(data) {
    if (!data.length) return [];
    return Object.keys(data[0]).filter(key => 
      typeof data[0][key] === 'number' && key !== 'date'
    );
  }

  calculateTrend(values) {
    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = this.sum(x);
    const sumY = this.sum(values);
    const sumXY = this.sum(x.map((xi, i) => xi * values[i]));
    const sumX2 = this.sum(x.map(xi => xi * xi));
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = this.sum(values.map(y => Math.pow(y - yMean, 2)));
    const ssResidual = this.sum(values.map((y, i) => 
      Math.pow(y - (slope * i + intercept), 2)
    ));
    const r2 = 1 - (ssResidual / ssTotal);
    
    return { slope, intercept, r2 };
  }

  simpleForecast(values, trend, periods = 3) {
    const lastIndex = values.length - 1;
    const forecast = [];
    
    for (let i = 1; i <= periods; i++) {
      forecast.push(trend.slope * (lastIndex + i) + trend.intercept);
    }
    
    return forecast;
  }

  detectCyclicalPattern(values) {
    // Simplified cyclical pattern detection
    if (values.length < 12) return null;
    
    // Look for repeating patterns
    for (let period = 2; period <= values.length / 2; period++) {
      let matches = 0;
      for (let i = period; i < values.length; i++) {
        if (Math.abs(values[i] - values[i - period]) / values[i - period] < 0.1) {
          matches++;
        }
      }
      
      if (matches / (values.length - period) > 0.7) {
        const amplitude = Math.max(...values) - Math.min(...values);
        return { period, amplitude };
      }
    }
    
    return null;
  }

  detectStepChanges(values) {
    const changes = [];
    const threshold = 0.3; // 30% change threshold
    
    for (let i = 1; i < values.length; i++) {
      const change = (values[i] - values[i - 1]) / values[i - 1];
      if (Math.abs(change) > threshold) {
        changes.push({
          index: i,
          previousValue: values[i - 1],
          newValue: values[i],
          changePercent: change * 100
        });
      }
    }
    
    return changes;
  }

  getMaxKey(obj) {
    return Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b);
  }

  getMinKey(obj) {
    return Object.keys(obj).reduce((a, b) => obj[a] < obj[b] ? a : b);
  }

  calculateOverallHealth(analysis) {
    let score = 50; // Base score
    
    if (analysis.performance?.score) {
      score = analysis.performance.score;
    }
    
    // Adjust based on trends
    if (analysis.trends?.trends) {
      const positivetrends = analysis.trends.trends.filter(t => t.direction === 'increasing').length;
      const negativeTrends = analysis.trends.trends.filter(t => t.direction === 'decreasing').length;
      score += (positivetrends - negativeTrends) * 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  flattenObject(obj, prefix = '') {
    const flattened = [];
    
    Object.entries(obj).forEach(([key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flattened.push(...this.flattenObject(value, newKey));
      } else {
        flattened.push({ key: newKey, value });
      }
    });
    
    return flattened;
  }

  /**
   * Identify competitive gaps
   */
  identifyCompetitiveGaps(data) {
    const gaps = [];
    const ourMetrics = data.ourData || {};
    
    Object.entries(data.competitorData || {}).forEach(([competitor, competitorData]) => {
      Object.entries(competitorData.metrics || {}).forEach(([metric, theirValue]) => {
        const ourValue = ourMetrics[metric] || 0;
        const gap = ourValue - theirValue;
        const gapPercent = theirValue > 0 ? (gap / theirValue) * 100 : 0;
        
        if (gapPercent < -10) { // We're more than 10% behind
          gaps.push({
            competitor,
            metric,
            ourValue,
            theirValue,
            gap,
            gapPercent,
            severity: gapPercent < -30 ? 'critical' : gapPercent < -20 ? 'high' : 'medium'
          });
        }
      });
    });
    
    return gaps.sort((a, b) => a.gapPercent - b.gapPercent);
  }

  /**
   * Identify strengths
   */
  identifyStrengths(data) {
    const strengths = [];
    const ourMetrics = data.ourData || {};
    
    Object.entries(data.competitorData || {}).forEach(([competitor, competitorData]) => {
      Object.entries(competitorData.metrics || {}).forEach(([metric, theirValue]) => {
        const ourValue = ourMetrics[metric] || 0;
        const advantage = ourValue - theirValue;
        const advantagePercent = theirValue > 0 ? (advantage / theirValue) * 100 : 0;
        
        if (advantagePercent > 20) { // We're more than 20% ahead
          strengths.push({
            metric,
            ourValue,
            competitorAverage: theirValue,
            advantage,
            advantagePercent
          });
        }
      });
    });
    
    return strengths.sort((a, b) => b.advantagePercent - a.advantagePercent);
  }

  /**
   * Identify weaknesses
   */
  identifyWeaknesses(data) {
    const gaps = this.identifyCompetitiveGaps(data);
    return gaps.filter(gap => gap.severity === 'critical' || gap.severity === 'high');
  }

  /**
   * Identify opportunities
   */
  identifyOpportunities(data, gaps) {
    const opportunities = [];
    
    // Quick wins - small gaps that can be easily closed
    gaps.filter(gap => gap.gapPercent > -20 && gap.gapPercent < -10).forEach(gap => {
      opportunities.push({
        type: 'quick_win',
        metric: gap.metric,
        description: `Close ${Math.abs(gap.gapPercent).toFixed(0)}% gap in ${gap.metric}`,
        effort: 'low',
        impact: 'medium'
      });
    });
    
    // Strategic opportunities - areas where all competitors are weak
    const commonWeaknesses = this.findCommonWeaknesses(data);
    commonWeaknesses.forEach(weakness => {
      opportunities.push({
        type: 'strategic',
        metric: weakness.metric,
        description: `Lead market in ${weakness.metric} (all competitors weak)`,
        effort: 'high',
        impact: 'high'
      });
    });
    
    return opportunities;
  }

  /**
   * Find common weaknesses across competitors
   */
  findCommonWeaknesses(data) {
    const weaknesses = [];
    const benchmarks = this.getIndustryBenchmarks('competitor');
    
    Object.entries(benchmarks).forEach(([metric, benchmark]) => {
      let allWeak = true;
      
      // Check our performance
      const ourValue = data.ourData?.[metric] || 0;
      if (ourValue >= benchmark * 0.8) {
        allWeak = false;
      }
      
      // Check competitors
      Object.values(data.competitorData || {}).forEach(competitor => {
        const value = competitor.metrics?.[metric] || 0;
        if (value >= benchmark * 0.8) {
          allWeak = false;
        }
      });
      
      if (allWeak) {
        weaknesses.push({ metric, benchmark });
      }
    });
    
    return weaknesses;
  }

  /**
   * Assess competitive position
   */
  assessCompetitivePosition(data) {
    const rankings = {};
    const metrics = Object.keys(data.ourData || {});
    
    metrics.forEach(metric => {
      const values = [];
      
      // Add our value
      values.push({
        name: 'Our Company',
        value: data.ourData[metric] || 0
      });
      
      // Add competitor values
      Object.entries(data.competitorData || {}).forEach(([name, competitor]) => {
        values.push({
          name,
          value: competitor.metrics?.[metric] || 0
        });
      });
      
      // Sort by value (descending)
      values.sort((a, b) => b.value - a.value);
      
      // Find our rank
      const ourRank = values.findIndex(v => v.name === 'Our Company') + 1;
      rankings[metric] = {
        rank: ourRank,
        total: values.length,
        percentile: ((values.length - ourRank) / (values.length - 1)) * 100
      };
    });
    
    // Calculate overall position
    const avgPercentile = this.average(Object.values(rankings).map(r => r.percentile));
    let position;
    
    if (avgPercentile >= 75) position = 'leader';
    else if (avgPercentile >= 50) position = 'challenger';
    else if (avgPercentile >= 25) position = 'follower';
    else position = 'laggard';
    
    return {
      position,
      avgPercentile,
      rankings
    };
  }

  /**
   * Analyze historical trends
   */
  analyzeHistoricalTrends(data) {
    const trends = {};
    const metrics = this.getNumericColumns(data);
    
    metrics.forEach(metric => {
      const values = data.map(d => d[metric]);
      const trend = this.calculateTrend(values);
      
      trends[metric] = {
        ...trend,
        historicalValues: values,
        volatility: this.calculateVolatility(values),
        momentum: this.calculateMomentum(values)
      };
    });
    
    return trends;
  }

  /**
   * Generate predictions
   */
  generatePredictions(historicalTrends) {
    const predictions = {};
    
    Object.entries(historicalTrends).forEach(([metric, trend]) => {
      predictions[metric] = {
        shortTerm: this.simpleForecast(trend.historicalValues, trend, 7),
        mediumTerm: this.simpleForecast(trend.historicalValues, trend, 30),
        longTerm: this.simpleForecast(trend.historicalValues, trend, 90),
        confidence: this.calculatePredictionConfidence(trend)
      };
    });
    
    return predictions;
  }

  /**
   * Generate scenarios
   */
  generateScenarios(predictions) {
    const scenarios = {
      best: {},
      expected: {},
      worst: {}
    };
    
    Object.entries(predictions).forEach(([metric, prediction]) => {
      const variance = 0.2; // 20% variance for scenarios
      
      scenarios.best[metric] = prediction.mediumTerm.map(v => v * (1 + variance));
      scenarios.expected[metric] = prediction.mediumTerm;
      scenarios.worst[metric] = prediction.mediumTerm.map(v => v * (1 - variance));
    });
    
    return scenarios;
  }

  /**
   * Identify risks
   */
  identifyRisks(predictions) {
    const risks = [];
    
    Object.entries(predictions).forEach(([metric, prediction]) => {
      // Check for declining trends
      const declining = prediction.shortTerm.every((v, i) => 
        i === 0 || v < prediction.shortTerm[i - 1]
      );
      
      if (declining) {
        risks.push({
          type: 'declining_metric',
          metric,
          severity: 'high',
          description: `${metric} showing consistent decline`,
          mitigation: `Implement strategies to reverse ${metric} trend`
        });
      }
      
      // Check for high volatility
      if (prediction.confidence < 70) {
        risks.push({
          type: 'high_uncertainty',
          metric,
          severity: 'medium',
          description: `High uncertainty in ${metric} predictions`,
          mitigation: 'Monitor closely and adjust strategies frequently'
        });
      }
    });
    
    return risks;
  }

  /**
   * Calculate volatility
   */
  calculateVolatility(values) {
    const mean = this.average(values);
    const variance = this.average(values.map(v => Math.pow(v - mean, 2)));
    return Math.sqrt(variance) / mean;
  }

  /**
   * Calculate momentum
   */
  calculateMomentum(values) {
    if (values.length < 3) return 0;
    
    const recentAvg = this.average(values.slice(-3));
    const previousAvg = this.average(values.slice(-6, -3));
    
    return previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
  }

  /**
   * Calculate prediction confidence
   */
  calculatePredictionConfidence(trend) {
    // Base confidence on R-squared and data consistency
    let confidence = trend.r2 * 100;
    
    // Adjust for volatility
    const volatility = trend.volatility || 0;
    confidence -= volatility * 20;
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate forecast confidence
   */
  calculateForecastConfidence(historicalTrends) {
    const confidences = Object.values(historicalTrends).map(trend => 
      this.calculatePredictionConfidence(trend)
    );
    
    return this.average(confidences);
  }
}

export default DataAnalysisService;
