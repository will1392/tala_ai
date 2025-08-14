import React from 'react';

interface MessageRendererProps {
  content: string;
  mode?: string;
}

/**
 * Renders markdown content with proper formatting
 */
export const MessageRenderer: React.FC<MessageRendererProps> = ({ content, mode }) => {
  // Process the content into structured elements
  const renderContent = () => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let currentList: string[] = [];
    let listType: 'bullet' | 'numbered' | null = null;
    let elementKey = 0;
    
    const flushList = () => {
      if (currentList.length > 0 && listType) {
        if (listType === 'bullet') {
          elements.push(
            <ul key={`list-${elementKey++}`} className="my-3 space-y-2">
              {currentList.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className={mode === 'marketing' ? "text-white mt-1" : "text-primary mt-1"}>•</span>
                  <span className="flex-1" dangerouslySetInnerHTML={{ 
                    __html: item.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>') 
                  }} />
                </li>
              ))}
            </ul>
          );
        } else if (listType === 'numbered') {
          elements.push(
            <ol key={`list-${elementKey++}`} className="my-3 space-y-2 list-decimal list-inside">
              {currentList.map((item, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ 
                  __html: item.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>') 
                }} />
              ))}
            </ol>
          );
        }
        currentList = [];
        listType = null;
      }
    };
    
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine && listType === null) {
        return;
      }
      
      // Headers
      if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={`h3-${elementKey++}`} className="text-lg font-semibold mt-4 mb-2 text-white">
            {trimmedLine.substring(4)}
          </h3>
        );
      } else if (trimmedLine.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={`h2-${elementKey++}`} className="text-xl font-bold mt-4 mb-2 text-white">
            {trimmedLine.substring(3)}
          </h2>
        );
      } else if (trimmedLine.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={`h1-${elementKey++}`} className="text-2xl font-bold mt-4 mb-2 text-white">
            {trimmedLine.substring(2)}
          </h1>
        );
      }
      // Bullet points
      else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
        if (listType !== 'bullet') {
          flushList();
          listType = 'bullet';
        }
        currentList.push(trimmedLine.replace(/^[-*•]\s+/, ''));
      }
      // Numbered lists
      else if (trimmedLine.match(/^\d+\./)) {
        if (listType !== 'numbered') {
          flushList();
          listType = 'numbered';
        }
        currentList.push(trimmedLine.replace(/^\d+\.\s+/, ''));
      }
      // Regular paragraphs
      else if (trimmedLine) {
        flushList();
        
        // Process bold text and other inline formatting
        const processedLine = trimmedLine
          .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
          .replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        elements.push(
          <p 
            key={`p-${elementKey++}`} 
            className="my-2 text-white/90 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: processedLine }}
          />
        );
      }
    });
    
    // Flush any remaining list
    flushList();
    
    return elements;
  };
  
  return (
    <div className="markdown-content">
      {renderContent()}
    </div>
  );
};

export default MessageRenderer;