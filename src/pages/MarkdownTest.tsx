import React from 'react';
import Markdown from '../components/shared/Markdown';

const testContent = `
# Markdown Rendering Test

This is a comprehensive test of our **markdown rendering** capabilities.

## Features

### Text Formatting
- **Bold text** for emphasis
- *Italic text* for subtle emphasis
- ~~Strikethrough~~ for corrections
- \`inline code\` for technical terms

### Lists

#### Unordered List
- First item
- Second item with **bold**
- Third item with \`code\`
  - Nested item 1
  - Nested item 2
    - Deep nested item

#### Ordered List
1. First step
2. Second step with *italics*
3. Third step
   1. Sub-step A
   2. Sub-step B

### Code Blocks

\`\`\`javascript
// JavaScript example with syntax highlighting
function greet(name) {
  return \`Hello, \${name}!\`;
}

const result = greet('World');
console.log(result); // Output: Hello, World!
\`\`\`

\`\`\`python
# Python example
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\`\`\`

### Blockquotes

> This is a blockquote. It's useful for highlighting important information.
> 
> It can span multiple lines and contain **formatted text**.

### Tables

| Feature | Status | Priority |
|---------|--------|----------|
| Markdown Parsing | ✅ Complete | High |
| Syntax Highlighting | 🔄 In Progress | Medium |
| Copy Button | ✅ Complete | Low |
| Dark Mode | ✅ Complete | High |

### Links

- [OpenAI](https://openai.com)
- [GitHub](https://github.com)
- [Documentation](https://docs.example.com)

### Horizontal Rule

---

### Task Lists

- [x] Install markdown libraries
- [x] Create Markdown component
- [x] Add styling
- [ ] Add syntax highlighting
- [ ] Test with complex documents

### Complex Example

Here's a more complex example combining multiple elements:

1. **Setup Instructions**
   - Install dependencies: \`npm install marked dompurify\`
   - Import the component
   
   \`\`\`jsx
   import Markdown from './components/Markdown';
   \`\`\`

2. **Usage Example**
   > Remember to sanitize user input!
   
   The component accepts a \`content\` prop:
   
   \`\`\`jsx
   <Markdown content={markdownString} />
   \`\`\`

3. **Features**
   - Automatic link detection
   - Code block copy buttons
   - Responsive tables
   - Dark mode support

---

## Conclusion

This markdown renderer supports all common markdown features with proper sanitization and styling.
`;

export default function MarkdownTest() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Markdown Rendering Test Page
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Light Mode Preview */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Light Mode</h2>
            <div className="prose prose-sm max-w-none">
              <Markdown content={testContent} />
            </div>
          </div>
          
          {/* Dark Mode Preview */}
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Dark Mode</h2>
            <div className="dark">
              <Markdown content={testContent} />
            </div>
          </div>
        </div>
        
        {/* Simple Text Test */}
        <div className="mt-8 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Plain Text Fallback Test
          </h2>
          <Markdown content="This is a simple sentence without any markdown formatting. It should render as plain text." />
        </div>
      </div>
    </div>
  );
}