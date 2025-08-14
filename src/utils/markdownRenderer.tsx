import React from 'react';

/**
 * Simple, bulletproof markdown renderer
 * Converts markdown to React elements
 */
export function renderMarkdownSimple(content: string, mode?: string): React.ReactElement {
  // Quick safety check
  if (!content || typeof content !== 'string') {
    return <div className="text-gray-900/90 dark:text-white/90">No content</div>;
  }

  try {
    // Split into lines
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];
    let key = 0;

    // Simple line-by-line processing
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) {
        elements.push(<div key={`space-${key++}`} className="h-2" />);
        continue;
      }

      // Headers - just remove the ### and make bold
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${key++}`} className="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-white">
            {trimmed.substring(4)}
          </h3>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${key++}`} className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white">
            {trimmed.substring(3)}
          </h2>
        );
      } else if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${key++}`} className="text-2xl font-bold mt-4 mb-3 text-gray-900 dark:text-white">
            {trimmed.substring(2)}
          </h1>
        );
      }
      // Numbered lists - just replace number with styled number
      else if (trimmed.match(/^\d+\.\s/)) {
        const content = trimmed.replace(/^\d+\.\s+/, '');
        // Replace **text** with bold
        const formatted = content.split(/\*\*/).map((part, i) => 
          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        );
        elements.push(
          <div key={`num-${key++}`} className="flex gap-3 my-2 pl-4">
            <span className="font-bold text-gray-900 dark:text-white">{trimmed.match(/^\d+/)?.[0]}.</span>
            <span className="flex-1 text-gray-900/90 dark:text-white/90">{formatted}</span>
          </div>
        );
      }
      // Bullet points - replace - with •
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        // Replace **text** with bold
        const formatted = content.split(/\*\*/).map((part, i) => 
          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        );
        const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
        elements.push(
          <div key={`bullet-${key++}`} className="flex gap-2 my-1" style={{paddingLeft: `${indent * 10 + 16}px`}}>
            <span className={mode === 'marketing' ? "text-gray-900 dark:text-white" : "text-primary"}>•</span>
            <span className="flex-1 text-gray-900/90 dark:text-white/90">{formatted}</span>
          </div>
        );
      }
      // Regular paragraph - just process bold
      else {
        const formatted = trimmed.split(/\*\*/).map((part, i) => 
          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        );
        elements.push(
          <p key={`p-${key++}`} className="my-2 text-gray-900/90 dark:text-white/90 leading-relaxed">
            {formatted}
          </p>
        );
      }
    }

    return <div className="markdown-content">{elements}</div>;
  } catch (error) {
    console.error('Markdown render error:', error);
    // Fallback - at least remove the markdown symbols
    const cleaned = content
      .replace(/###\s/g, '')
      .replace(/##\s/g, '')
      .replace(/#\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/^\d+\.\s/gm, '• ')
      .replace(/^[-*]\s/gm, '• ');
    
    return <div className="text-gray-900/90 dark:text-white/90 whitespace-pre-wrap">{cleaned}</div>;
  }
}