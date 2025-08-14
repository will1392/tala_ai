/**
 * Assessment Validator Service
 * Validates assessment answers and ensures data quality
 */

const assessmentQuestions = require('../../config/marketingAssessment').assessmentQuestions;

/**
 * Validate assessment answers
 */
async function validateAssessment(answers) {
  const issues = [];
  
  // Check required questions
  assessmentQuestions.forEach(question => {
    if (question.required && !answers.hasOwnProperty(question.id)) {
      issues.push({
        field: question.id,
        message: `Required question "${question.question}" is not answered`
      });
    }
  });

  // Validate each answer
  for (const [questionId, answer] of Object.entries(answers)) {
    const question = assessmentQuestions.find(q => q.id === questionId);
    
    if (!question) {
      issues.push({
        field: questionId,
        message: `Unknown question ID: ${questionId}`
      });
      continue;
    }

    // Type validation
    const typeValidation = validateAnswerType(question, answer);
    if (!typeValidation.valid) {
      issues.push({
        field: questionId,
        message: typeValidation.message
      });
    }

    // Range validation for numbers
    if (question.validation) {
      const rangeValidation = validateRange(question, answer);
      if (!rangeValidation.valid) {
        issues.push({
          field: questionId,
          message: rangeValidation.message
        });
      }
    }

    // Option validation for multiple choice
    if (question.type === 'multiple_choice' && question.options) {
      const validOptions = question.options.map(opt => opt.value);
      if (!validOptions.includes(answer)) {
        issues.push({
          field: questionId,
          message: `Invalid option: ${answer}. Must be one of: ${validOptions.join(', ')}`
        });
      }
    }

    // Multi-select validation
    if (question.type === 'multi_select' && question.options) {
      if (!Array.isArray(answer)) {
        issues.push({
          field: questionId,
          message: 'Multi-select answer must be an array'
        });
      } else {
        const validOptions = question.options.map(opt => opt.value);
        const invalidOptions = answer.filter(val => !validOptions.includes(val));
        if (invalidOptions.length > 0) {
          issues.push({
            field: questionId,
            message: `Invalid options: ${invalidOptions.join(', ')}`
          });
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Validate answer type
 */
function validateAnswerType(question, answer) {
  switch (question.type) {
    case 'yes_no':
      if (typeof answer !== 'boolean') {
        return {
          valid: false,
          message: 'Answer must be true or false'
        };
      }
      break;
      
    case 'number':
    case 'scale':
      if (typeof answer !== 'number' || isNaN(answer)) {
        return {
          valid: false,
          message: 'Answer must be a number'
        };
      }
      break;
      
    case 'text':
      if (typeof answer !== 'string') {
        return {
          valid: false,
          message: 'Answer must be text'
        };
      }
      if (answer.trim().length === 0) {
        return {
          valid: false,
          message: 'Text answer cannot be empty'
        };
      }
      if (answer.length > 1000) {
        return {
          valid: false,
          message: 'Text answer is too long (max 1000 characters)'
        };
      }
      break;
      
    case 'multiple_choice':
      if (answer === null || answer === undefined) {
        return {
          valid: false,
          message: 'Must select an option'
        };
      }
      break;
      
    case 'multi_select':
      if (!Array.isArray(answer)) {
        return {
          valid: false,
          message: 'Multi-select answer must be an array'
        };
      }
      if (answer.length === 0) {
        return {
          valid: false,
          message: 'Must select at least one option'
        };
      }
      break;
  }
  
  return { valid: true };
}

/**
 * Validate numeric range
 */
function validateRange(question, answer) {
  if (typeof answer !== 'number') {
    return { valid: true }; // Type validation handles this
  }
  
  const { min, max } = question.validation || {};
  
  if (min !== undefined && answer < min) {
    return {
      valid: false,
      message: `Value must be at least ${min}`
    };
  }
  
  if (max !== undefined && answer > max) {
    return {
      valid: false,
      message: `Value must be at most ${max}`
    };
  }
  
  return { valid: true };
}

/**
 * Validate pattern (regex)
 */
function validatePattern(pattern, value) {
  try {
    const regex = new RegExp(pattern);
    return regex.test(value);
  } catch (error) {
    console.error('Invalid regex pattern:', pattern, error);
    return true; // Don't fail on bad pattern
  }
}

/**
 * Cross-validate answers for consistency
 */
function crossValidateAnswers(answers) {
  const inconsistencies = [];
  
  // Example: If no budget but running ads
  if (answers.monthly_budget === '0' && answers.ppc_experience !== 'none') {
    inconsistencies.push({
      fields: ['monthly_budget', 'ppc_experience'],
      message: 'Inconsistent: Running ads with no budget'
    });
  }
  
  // Example: Expert level but no analytics
  if (answers.marketing_experience >= 8 && !answers.ga4_installed) {
    inconsistencies.push({
      fields: ['marketing_experience', 'ga4_installed'],
      message: 'Experienced marketer should have analytics installed'
    });
  }
  
  // Example: Large team but low budget
  if (answers.marketing_team === 'large_team' && answers.monthly_budget === '500') {
    inconsistencies.push({
      fields: ['marketing_team', 'monthly_budget'],
      message: 'Large team typically requires larger budget'
    });
  }
  
  return inconsistencies;
}

/**
 * Detect potential spam or fake submissions
 */
function detectSpamSubmission(answers) {
  const spamIndicators = [];
  
  // All maximum values (gaming the system)
  const numericAnswers = Object.entries(answers)
    .filter(([_, value]) => typeof value === 'number');
  
  if (numericAnswers.length > 5) {
    const allMax = numericAnswers.every(([questionId, value]) => {
      const question = assessmentQuestions.find(q => q.id === questionId);
      return question?.validation?.max && value === question.validation.max;
    });
    
    if (allMax) {
      spamIndicators.push('All answers at maximum values');
    }
  }
  
  // Extremely fast completion (under 30 seconds)
  // This would need timestamp tracking in real implementation
  
  // Nonsensical text answers
  const textAnswers = Object.entries(answers)
    .filter(([_, value]) => typeof value === 'string');
  
  textAnswers.forEach(([questionId, text]) => {
    // Check for random characters
    if (/^[a-z]{50,}$/i.test(text) || /^[0-9]{20,}$/.test(text)) {
      spamIndicators.push(`Suspicious text in ${questionId}`);
    }
    
    // Check for repeated patterns
    if (/(.)\1{10,}/.test(text)) {
      spamIndicators.push(`Repeated characters in ${questionId}`);
    }
  });
  
  return spamIndicators;
}

module.exports = {
  validateAssessment,
  crossValidateAnswers,
  detectSpamSubmission
};