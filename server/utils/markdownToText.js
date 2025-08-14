/**
 * Simple markdown to plain text converter
 * Removes markdown syntax while preserving structure
 */

function markdownToText(markdown) {
  if (!markdown) return '';
  
  let text = markdown;
  
  // Remove headers (###, ##, #) but keep the text
  text = text.replace(/^#{1,6}\s+/gm, '');
  
  // Convert bold **text** to just text
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // Convert italic *text* to just text
  text = text.replace(/\*([^*]+)\*/g, '$1');
  
  // Convert bullet points to simple bullets
  text = text.replace(/^[\s]*[-*]\s+/gm, '• ');
  
  // Convert numbered lists to preserve numbers
  text = text.replace(/^[\s]*(\d+)\.\s+/gm, '$1. ');
  
  // Remove code blocks
  text = text.replace(/```[^`]*```/g, '');
  
  // Remove inline code
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Clean up extra newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
}

/**
 * Convert markdown to structured HTML
 * Better for frontend rendering
 */
function markdownToHTML(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Convert line breaks to <br> for single breaks
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    
    // Handle lists
    if (trimmed.match(/^[-*]\s/)) {
      return `<li>${trimmed.substring(2)}</li>`;
    }
    if (trimmed.match(/^\d+\.\s/)) {
      return `<li>${trimmed.substring(trimmed.indexOf('.') + 2)}</li>`;
    }
    
    // Handle paragraphs
    if (trimmed && !trimmed.startsWith('<')) {
      return `<p>${trimmed}</p>`;
    }
    
    return trimmed;
  }).join('\n');
  
  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/(<li>.*<\/li>\n)+/g, (match) => {
    return `<ul>\n${match}</ul>\n`;
  });
  
  return html.trim();
}

export {
  markdownToText,
  markdownToHTML
};