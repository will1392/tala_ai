import React from 'react';
import { motion } from 'framer-motion';
import { 
  Award, TrendingUp, BookOpen, Rocket, 
  CheckCircle, Target, Zap, Brain 
} from 'lucide-react';

interface ExpertiseLevelResultProps {
  result: {
    level: string;
    confidence: number;
    areas: Record<string, any>;
    recommendations: Array<{
      type: string;
      priority: string;
      title: string;
      description: string;
    }>;
    communicationStyle: string;
  };
  onContinue: () => void;
}

const ExpertiseLevelResult: React.FC<ExpertiseLevelResultProps> = ({
  result,
  onContinue
}) => {
  const levelConfig = {
    beginner: {
      icon: BookOpen,
      color: 'from-blue-500 to-blue-600',
      title: 'Marketing Beginner',
      description: "Welcome! You're at the perfect starting point. We'll guide you through marketing fundamentals with clear explanations and practical examples.",
      benefits: [
        'Simple, jargon-free explanations',
        'Step-by-step guides for every task',
        'Helpful analogies and examples',
        'Encouraging feedback and support'
      ]
    },
    intermediate: {
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      title: 'Marketing Practitioner',
      description: "Great foundation! You understand the basics and are ready to optimize your strategies. We'll help you level up your skills.",
      benefits: [
        'Best practices and optimization tips',
        'Performance benchmarks',
        'Advanced features when you need them',
        'Balanced technical explanations'
      ]
    },
    advanced: {
      icon: Target,
      color: 'from-purple-500 to-purple-600',
      title: 'Marketing Professional',
      description: "Impressive expertise! You're comfortable with complex strategies. We'll focus on data-driven insights and advanced techniques.",
      benefits: [
        'Deep analytics and insights',
        'Advanced optimization strategies',
        'A/B testing recommendations',
        'Industry trends and benchmarks'
      ]
    },
    expert: {
      icon: Rocket,
      color: 'from-orange-500 to-red-600',
      title: 'Marketing Expert',
      description: "You're a marketing leader! We'll provide cutting-edge strategies, predictive insights, and help you stay ahead of trends.",
      benefits: [
        'Cutting-edge techniques',
        'Predictive analytics',
        'Cross-channel integration',
        'Innovation opportunities'
      ]
    }
  };

  const config = levelConfig[result.level as keyof typeof levelConfig] || levelConfig.beginner;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
      >
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${config.color} text-white p-8 text-center`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4"
          >
            <Icon className="w-10 h-10" />
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold mb-2"
          >
            You're a {config.title}!
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/90 max-w-md mx-auto"
          >
            {config.description}
          </motion.p>
        </div>

        <div className="p-8">
          {/* What this means for you */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              What this means for you:
            </h3>
            <div className="space-y-3">
              {config.benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Personalized Recommendations:
              </h3>
              <div className="space-y-3">
                {result.recommendations.slice(0, 2).map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                  >
                    <h4 className="font-medium mb-1">{rec.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {rec.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Confidence indicator */}
          {result.confidence && (
            <div className="mb-8">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Assessment Confidence</span>
                <span className="font-medium">{Math.round(result.confidence * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.confidence * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-primary to-purple-600"
                />
              </div>
            </div>
          )}

          {/* Continue button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={onContinue}
            className="w-full py-4 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
          >
            Start Your Personalized CMO Experience
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default ExpertiseLevelResult;