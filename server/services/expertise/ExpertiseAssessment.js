/**
 * Expertise Assessment Service
 * Evaluates user's marketing knowledge level and adapts communication accordingly
 */

class ExpertiseAssessment {
  constructor() {
    this.assessmentQuestions = this.initializeQuestions();
    this.validationQuestions = this.initializeValidationQuestions();
  }

  /**
   * Initialize assessment questions
   */
  initializeQuestions() {
    return {
      initial: [
        {
          id: 'q1',
          question: "How would you describe your marketing experience?",
          type: 'single-select',
          required: true,
          options: [
            { value: 'beginner', label: "I'm new to marketing", weight: 1 },
            { value: 'intermediate', label: "I know the basics and have some experience", weight: 2 },
            { value: 'advanced', label: "I'm comfortable with most marketing concepts", weight: 3 },
            { value: 'expert', label: "I have deep expertise across marketing channels", weight: 4 }
          ]
        },
        {
          id: 'q2',
          question: "Which marketing areas are you most familiar with? (Select all that apply)",
          type: 'multi-select',
          required: true,
          options: [
            { value: 'seo', label: 'SEO & Organic Search', category: 'digital' },
            { value: 'email', label: 'Email Marketing', category: 'direct' },
            { value: 'social', label: 'Social Media Marketing', category: 'digital' },
            { value: 'paid', label: 'Paid Advertising (PPC, Display)', category: 'paid' },
            { value: 'content', label: 'Content Marketing', category: 'organic' },
            { value: 'analytics', label: 'Analytics & Data Analysis', category: 'technical' },
            { value: 'automation', label: 'Marketing Automation', category: 'technical' },
            { value: 'brand', label: 'Brand Strategy', category: 'strategic' },
            { value: 'none', label: 'None of the above', category: 'beginner' }
          ]
        },
        {
          id: 'q3',
          question: "How do you prefer explanations?",
          type: 'single-select',
          required: true,
          options: [
            { value: 'simple', label: "Keep it simple with examples and analogies" },
            { value: 'balanced', label: "Mix of simple explanations and technical details" },
            { value: 'technical', label: "Get straight to the technical details and data" }
          ]
        },
        {
          id: 'q4',
          question: "What's your primary marketing goal?",
          type: 'single-select',
          required: true,
          options: [
            { value: 'learn', label: "Learn marketing fundamentals" },
            { value: 'improve', label: "Improve existing campaigns" },
            { value: 'scale', label: "Scale successful strategies" },
            { value: 'innovate', label: "Explore cutting-edge tactics" }
          ]
        },
        {
          id: 'q5',
          question: "How long have you been working in marketing?",
          type: 'single-select',
          required: false,
          options: [
            { value: '0-1', label: "Less than 1 year", weight: 1 },
            { value: '1-3', label: "1-3 years", weight: 2 },
            { value: '3-5', label: "3-5 years", weight: 3 },
            { value: '5-10', label: "5-10 years", weight: 4 },
            { value: '10+', label: "More than 10 years", weight: 5 }
          ]
        }
      ]
    };
  }

  /**
   * Initialize validation questions for each level
   */
  initializeValidationQuestions() {
    return {
      beginner: [
        {
          id: 'val_b1',
          question: "What does CTR stand for in digital marketing?",
          type: 'single-select',
          options: [
            { value: 'click-through-rate', label: "Click-Through Rate", correct: true },
            { value: 'customer-tracking-report', label: "Customer Tracking Report", correct: false },
            { value: 'conversion-time-ratio', label: "Conversion Time Ratio", correct: false },
            { value: 'not-sure', label: "I'm not sure", correct: false }
          ]
        },
        {
          id: 'val_b2',
          question: "Which of these is typically used to measure email campaign success?",
          type: 'single-select',
          options: [
            { value: 'open-rate', label: "Open rate", correct: true },
            { value: 'page-views', label: "Page views", correct: false },
            { value: 'impressions', label: "Impressions", correct: false },
            { value: 'not-sure', label: "I'm not sure", correct: false }
          ]
        }
      ],
      intermediate: [
        {
          id: 'val_i1',
          question: "What's the primary difference between CPM and CPC pricing models?",
          type: 'single-select',
          options: [
            { value: 'correct', label: "CPM charges per thousand impressions, CPC charges per click", correct: true },
            { value: 'wrong1', label: "CPM is cheaper than CPC", correct: false },
            { value: 'wrong2', label: "CPC is for social media, CPM is for search", correct: false },
            { value: 'not-sure', label: "I'm not sure", correct: false }
          ]
        },
        {
          id: 'val_i2',
          question: "In SEO, what does a canonical tag help with?",
          type: 'single-select',
          options: [
            { value: 'correct', label: "Preventing duplicate content issues", correct: true },
            { value: 'wrong1', label: "Improving page load speed", correct: false },
            { value: 'wrong2', label: "Tracking conversions", correct: false },
            { value: 'not-sure', label: "I'm not sure", correct: false }
          ]
        }
      ],
      advanced: [
        {
          id: 'val_a1',
          question: "Which attribution model gives equal credit to all touchpoints in the customer journey?",
          type: 'single-select',
          options: [
            { value: 'linear', label: "Linear attribution", correct: true },
            { value: 'first-click', label: "First-click attribution", correct: false },
            { value: 'time-decay', label: "Time-decay attribution", correct: false },
            { value: 'data-driven', label: "Data-driven attribution", correct: false }
          ]
        },
        {
          id: 'val_a2',
          question: "What's a good benchmark for email deliverability rate?",
          type: 'single-select',
          options: [
            { value: 'correct', label: "95% or higher", correct: true },
            { value: 'wrong1', label: "75-80%", correct: false },
            { value: 'wrong2', label: "85-90%", correct: false },
            { value: 'wrong3', label: "60-70%", correct: false }
          ]
        }
      ],
      expert: [
        {
          id: 'val_e1',
          question: "In multi-touch attribution, what does the Shapley value method do?",
          type: 'single-select',
          options: [
            { value: 'correct', label: "Calculates fair contribution of each touchpoint using game theory", correct: true },
            { value: 'wrong1', label: "Assigns credit based on time decay", correct: false },
            { value: 'wrong2', label: "Uses machine learning to predict conversions", correct: false },
            { value: 'wrong3', label: "Measures incrementality through holdout tests", correct: false }
          ]
        }
      ]
    };
  }

  /**
   * Get initial assessment questions
   */
  getAssessmentQuestions() {
    return this.assessmentQuestions.initial;
  }

  /**
   * Get validation questions based on self-assessed level
   */
  getValidationQuestions(level) {
    return this.validationQuestions[level] || this.validationQuestions.intermediate;
  }

  /**
   * Assess user expertise based on answers
   */
  assessExpertise(answers) {
    const assessment = {
      level: 'beginner',
      confidence: 0,
      areas: {},
      recommendations: [],
      communicationStyle: 'simple'
    };

    // Get self-assessed level from Q1
    const selfAssessedLevel = answers.q1?.value || 'beginner';
    assessment.level = selfAssessedLevel;

    // Analyze familiar areas from Q2
    const familiarAreas = answers.q2?.values || [];
    if (familiarAreas.includes('none') || familiarAreas.length === 0) {
      assessment.level = 'beginner';
      assessment.confidence = 0.9; // High confidence they're a beginner
    } else {
      // Calculate area expertise
      const areaCategories = {
        digital: ['seo', 'social'],
        technical: ['analytics', 'automation'],
        strategic: ['brand'],
        paid: ['paid'],
        direct: ['email'],
        organic: ['content']
      };

      Object.keys(areaCategories).forEach(category => {
        const categoryAreas = areaCategories[category];
        const userAreas = familiarAreas.filter(area => categoryAreas.includes(area));
        assessment.areas[category] = {
          familiar: userAreas,
          score: userAreas.length / categoryAreas.length
        };
      });

      // Adjust level based on breadth of knowledge
      if (familiarAreas.length >= 6 && selfAssessedLevel === 'intermediate') {
        assessment.confidence = 0.7; // Might be advanced
      } else if (familiarAreas.length <= 2 && selfAssessedLevel !== 'beginner') {
        assessment.level = 'intermediate'; // Downgrade if limited areas
        assessment.confidence = 0.6;
      }
    }

    // Set communication style from Q3
    assessment.communicationStyle = answers.q3?.value || 'simple';

    // Consider experience from Q5
    const experience = answers.q5?.value;
    if (experience) {
      const experienceMap = {
        '0-1': { maxLevel: 'intermediate', confidenceBoost: 0.1 },
        '1-3': { maxLevel: 'intermediate', confidenceBoost: 0.2 },
        '3-5': { maxLevel: 'advanced', confidenceBoost: 0.3 },
        '5-10': { maxLevel: 'expert', confidenceBoost: 0.4 },
        '10+': { maxLevel: 'expert', confidenceBoost: 0.5 }
      };

      const expData = experienceMap[experience];
      if (expData) {
        // Validate self-assessment against experience
        if (this.getLevelValue(assessment.level) > this.getLevelValue(expData.maxLevel)) {
          assessment.level = expData.maxLevel;
          assessment.confidence = 0.8; // High confidence in adjustment
        } else {
          assessment.confidence = Math.min(1, (assessment.confidence || 0.5) + expData.confidenceBoost);
        }
      }
    }

    // Generate recommendations
    assessment.recommendations = this.generateRecommendations(assessment);

    return assessment;
  }

  /**
   * Validate expertise level with follow-up questions
   */
  validateExpertise(level, validationAnswers) {
    const questions = this.validationQuestions[level];
    if (!questions || !validationAnswers) return { validated: true, adjustedLevel: level };

    let correctAnswers = 0;
    questions.forEach(question => {
      const answer = validationAnswers[question.id];
      if (answer) {
        const selectedOption = question.options.find(opt => opt.value === answer.value);
        if (selectedOption && selectedOption.correct) {
          correctAnswers++;
        }
      }
    });

    const score = correctAnswers / questions.length;

    // Adjust level based on validation score
    if (score < 0.5) {
      // User struggled, downgrade level
      const adjustedLevel = this.downgradeLevel(level);
      return {
        validated: false,
        adjustedLevel,
        score,
        message: `Based on your answers, we've adjusted your level to ${adjustedLevel} to provide more helpful guidance.`
      };
    } else if (score === 1 && level !== 'expert') {
      // User aced it, consider upgrade
      const adjustedLevel = this.upgradeLevel(level);
      return {
        validated: true,
        adjustedLevel,
        score,
        message: `Great job! You seem to have strong knowledge. We've set your level to ${adjustedLevel}.`
      };
    }

    return { validated: true, adjustedLevel: level, score };
  }

  /**
   * Generate personalized recommendations
   */
  generateRecommendations(assessment) {
    const recommendations = [];

    // Level-based recommendations
    switch (assessment.level) {
      case 'beginner':
        recommendations.push({
          type: 'learning',
          priority: 'high',
          title: 'Start with Marketing Fundamentals',
          description: 'Focus on understanding basic concepts like target audience, marketing channels, and key metrics.',
          resources: ['marketing-101', 'metrics-guide']
        });
        break;
      case 'intermediate':
        recommendations.push({
          type: 'skill-building',
          priority: 'medium',
          title: 'Expand Your Channel Expertise',
          description: 'Deepen your knowledge in 2-3 channels before branching out.',
          resources: ['channel-mastery', 'campaign-optimization']
        });
        break;
      case 'advanced':
        recommendations.push({
          type: 'optimization',
          priority: 'medium',
          title: 'Focus on Data-Driven Optimization',
          description: 'Leverage analytics to improve campaign performance and ROI.',
          resources: ['advanced-analytics', 'attribution-modeling']
        });
        break;
      case 'expert':
        recommendations.push({
          type: 'innovation',
          priority: 'low',
          title: 'Explore Emerging Trends',
          description: 'Stay ahead with AI-powered marketing and predictive analytics.',
          resources: ['ai-marketing', 'predictive-analytics']
        });
        break;
    }

    // Area-specific recommendations
    const weakAreas = Object.entries(assessment.areas)
      .filter(([_, data]) => data.score < 0.5)
      .map(([category]) => category);

    if (weakAreas.length > 0) {
      recommendations.push({
        type: 'improvement',
        priority: 'medium',
        title: 'Strengthen Weak Areas',
        description: `Consider building skills in: ${weakAreas.join(', ')}`,
        resources: weakAreas.map(area => `${area}-basics`)
      });
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  getLevelValue(level) {
    const values = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    return values[level] || 1;
  }

  downgradeLevel(level) {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const currentIndex = levels.indexOf(level);
    return currentIndex > 0 ? levels[currentIndex - 1] : level;
  }

  upgradeLevel(level) {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const currentIndex = levels.indexOf(level);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : level;
  }

  /**
   * Save assessment to database
   */
  async saveAssessment(userId, assessment, answers) {
    const { SupabaseDatabaseService } = require('../db/SupabaseDatabaseService');
    const db = new SupabaseDatabaseService();

    try {
      // Save to expertise_assessments table
      const { data: assessmentRecord, error: assessmentError } = await db.supabase
        .from('expertise_assessments')
        .insert({
          user_id: userId,
          assessment_type: 'initial',
          questions: this.getAssessmentQuestions(),
          answers: answers,
          computed_level: assessment.level,
          confidence_score: assessment.confidence,
          areas_assessed: assessment.areas
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // Update user profile
      const { error: userError } = await db.supabase
        .from('users')
        .update({
          marketing_expertise_level: assessment.level,
          expertise_assessment_date: new Date().toISOString(),
          expertise_areas: assessment.areas,
          communication_preferences: {
            style: assessment.communicationStyle,
            recommendations: assessment.recommendations
          }
        })
        .eq('id', userId);

      if (userError) throw userError;

      return { success: true, assessment, assessmentId: assessmentRecord.id };
    } catch (error) {
      console.error('Error saving assessment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's expertise profile
   */
  async getUserExpertise(userId) {
    const { SupabaseDatabaseService } = require('../db/SupabaseDatabaseService');
    const db = new SupabaseDatabaseService();

    try {
      const { data: user, error } = await db.supabase
        .from('users')
        .select('marketing_expertise_level, expertise_areas, communication_preferences, expertise_assessment_date')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Get latest assessment
      const { data: assessments } = await db.supabase
        .from('expertise_assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      return {
        level: user.marketing_expertise_level || 'beginner',
        areas: user.expertise_areas || {},
        preferences: user.communication_preferences || {},
        lastAssessment: user.expertise_assessment_date,
        assessmentHistory: assessments || []
      };
    } catch (error) {
      console.error('Error getting user expertise:', error);
      return null;
    }
  }
}

export default ExpertiseAssessment;