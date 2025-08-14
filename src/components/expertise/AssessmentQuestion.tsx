import React from 'react';
import { motion } from 'framer-motion';
import { Check, Circle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AssessmentQuestionProps {
  question: {
    id: string;
    question: string;
    type: 'single-select' | 'multi-select';
    options: Array<{
      value: string;
      label: string;
      description?: string;
    }>;
  };
  value: any;
  onChange: (value: any) => void;
  showResult?: boolean;
}

const AssessmentQuestion: React.FC<AssessmentQuestionProps> = ({
  question,
  value,
  onChange,
  showResult = false
}) => {
  const handleSingleSelect = (optionValue: string) => {
    onChange({ value: optionValue });
  };

  const handleMultiSelect = (optionValue: string) => {
    const currentValues = value?.values || [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter((v: string) => v !== optionValue)
      : [...currentValues, optionValue];
    
    onChange({ values: newValues });
  };

  const isSelected = (optionValue: string) => {
    if (question.type === 'single-select') {
      return value?.value === optionValue;
    }
    return value?.values?.includes(optionValue) || false;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        {question.question}
      </h3>

      <div className="space-y-3">
        {question.options.map((option) => (
          <motion.button
            key={option.value}
            onClick={() => {
              if (question.type === 'single-select') {
                handleSingleSelect(option.value);
              } else {
                handleMultiSelect(option.value);
              }
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={cn(
              "w-full p-4 rounded-xl border-2 transition-all text-left",
              isSelected(option.value)
                ? "border-primary bg-primary/5 dark:bg-primary/10"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {question.type === 'single-select' ? (
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    isSelected(option.value)
                      ? "border-primary bg-primary"
                      : "border-gray-300 dark:border-gray-600"
                  )}>
                    {isSelected(option.value) && (
                      <Circle className="w-2 h-2 text-white fill-current" />
                    )}
                  </div>
                ) : (
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center",
                    isSelected(option.value)
                      ? "border-primary bg-primary"
                      : "border-gray-300 dark:border-gray-600"
                  )}>
                    {isSelected(option.value) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <p className={cn(
                  "font-medium",
                  isSelected(option.value)
                    ? "text-primary"
                    : "text-gray-900 dark:text-white"
                )}>
                  {option.label}
                </p>
                {option.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {question.type === 'multi-select' && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select all that apply
        </p>
      )}
    </div>
  );
};

export default AssessmentQuestion;