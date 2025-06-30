# 🌟 Tala AI - Travel Assistant Platform

> Revolutionizing travel agency operations with AI-powered assistance and beautiful glassmorphic design.

![Tala AI Banner](https://img.shields.io/badge/Tala%20AI-Travel%20Assistant-0fc6c6?style=for-the-badge&logo=airplane&logoColor=white)

[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.x-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

## 🚀 Project Overview

Tala is an AI-powered travel assistant platform designed to transform how travel agencies manage their operations. The system combines cutting-edge AI technology with a beautiful, glassmorphic user interface to create an intuitive and powerful tool for travel professionals.

### 🎯 Core Vision

- 🤖 **Intelligent Document Search** using RAG (Retrieval-Augmented Generation)
- 💬 **Natural Language Chat Interface** for instant assistance
- 📚 **Comprehensive Knowledge Base** management
- 🎥 **Video Content Understanding** and extraction
- 👥 **Multi-Agent AI System** for complex travel planning
- 📱 **Embeddable Widget** for agency websites

## 🎨 Design System

### Color Palette
- **Primary**: `#0fc6c6` (Teal) - Main brand color
- **Secondary**: `#272d41` (Dark Blue) - UI backgrounds
- **Tertiary**: `#ffffff` (White) - Text and accents

### Glassmorphic Theme
- `.glass` - Light glassmorphic effect with backdrop blur
- `.glass-dark` - Dark glassmorphic variant
- `.glass-button` - Interactive buttons with shine animation
- `.glass-input` - Form inputs with glass styling
- `.glow` - Neon glow effects for highlights

## 📁 Project Structure

```
tala-ui/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── chat/           # Chat-related components
│   │   ├── knowledge/      # Knowledge base components
│   │   │   ├── DocumentCard.tsx
│   │   │   ├── DocumentMenu.tsx
│   │   │   ├── DocumentViewer.tsx
│   │   │   ├── DeleteDocumentModal.tsx
│   │   │   ├── MoveDocumentModal.tsx
│   │   │   ├── FolderMenu.tsx
│   │   │   └── DeleteFolderModal.tsx
│   │   ├── layout/         # Layout and navigation
│   │   └── shared/         # Shared utility components
│   ├── pages/              # Main application pages
│   │   ├── Dashboard.tsx   # Analytics and overview
│   │   ├── Knowledge.tsx   # Document management
│   │   ├── Chat.tsx        # Full chat interface
│   │   └── Settings.tsx    # User preferences
│   ├── services/           # API and business logic
│   ├── store/              # Zustand state management
│   ├── styles/             # Global styles and themes
│   └── utils/              # Helper functions
├── server/                 # Backend API server
│   ├── server.js          # Express.js server with RAG endpoints
│   ├── package.json       # Backend dependencies
│   └── folders.json       # Persistent folder storage
├── public/                 # Static assets
└── docs/                   # Documentation
```

## ✅ Current Implementation Status

### 🎯 Phase 0: Foundation (COMPLETED)
- ✅ React + TypeScript + Vite setup
- ✅ Tailwind CSS with custom glassmorphic design
- ✅ Complete UI component library
- ✅ Routing with React Router
- ✅ State management with Zustand
- ✅ Responsive design system
- ✅ All main pages (Dashboard, Knowledge, Chat, Settings)
- ✅ Beautiful glassmorphic animations

### 🎯 Phase 1: Knowledge Base & RAG Implementation (COMPLETED ✅)
- ✅ Backend server with Express.js and document processing
- ✅ Qdrant vector database integration with OpenAI embeddings
- ✅ Document upload and processing (PDF, Word, Excel, Text)
- ✅ Semantic search with vector similarity
- ✅ Document viewer with PDF support
- ✅ Folder organization system with CRUD operations
- ✅ **Document Management System (Latest Update - Dec 30, 2025)**
  - ✅ Delete documents with confirmation dialogs
  - ✅ Move documents between folders
  - ✅ Three-dots action menu on all document cards
  - ✅ Real-time UI updates and folder count synchronization
  - ✅ Enhanced PDF viewing with iframe fallback
  - ✅ Fixed document search and filtering within folders

## 🎉 Recent Updates (December 30, 2025)

### ✨ Major Features Completed Today
- **Complete Document Management System**: Users can now fully manage their documents with delete and move functionality
- **Advanced UI Components**: Added comprehensive modal system with confirmation dialogs
- **Enhanced PDF Viewing**: Fixed PDF loading issues with reliable iframe implementation
- **Folder Organization**: Complete CRUD operations for folders with real-time count updates
- **Three-Dots Action Menus**: Professional dropdown menus on every document and folder
- **Bug Fixes**: Resolved Qdrant vector update operations and search filtering issues

### 🔧 Technical Improvements
- **Backend API Endpoints**: Added DELETE and PUT endpoints for document management
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **State Management**: Improved React state management for real-time UI updates
- **Vector Database**: Fixed Qdrant operations using proper `setPayload()` method
- **Component Architecture**: Created reusable modal and menu components

### 📊 Components Added Today
- `DocumentMenu.tsx` - Action dropdown for documents
- `DeleteDocumentModal.tsx` - Confirmation dialog for deletions
- `MoveDocumentModal.tsx` - Folder selection for moving documents
- `DeleteFolderModal.tsx` - Folder deletion confirmation
- `EditFolderModal.tsx` - Folder editing interface
- `FolderMenu.tsx` - Action dropdown for folders

## 🗓️ Development Roadmap

### 🏆 Phase 1: Knowledge Base & RAG Implementation (COMPLETED ✅)
**Goal**: Create a working document search system with vector database

#### Completed Tasks:
- ✅ Install RAG dependencies (`@qdrant/js-client`, `openai`, `langchain`)
- ✅ Create document processing service (PDF, Word, Excel)
- ✅ Set up Qdrant vector database integration
- ✅ Implement vector search with OpenAI embeddings
- ✅ Connect Knowledge Base UI to real search
- ✅ Add document preview and source attribution
- ✅ Complete folder organization system
- ✅ Document management (delete, move between folders)
- ✅ Enhanced user interface with action menus

#### Success Metrics Achieved:
- ✅ Upload and process PDF, Word, Excel files
- ✅ Search returns relevant results with highlights
- ✅ Response time < 500ms for search
- ✅ Source attribution working
- ✅ Full document lifecycle management

### 🎯 Phase 1.5: Knowledge Base Enhancements (CURRENT PRIORITY)
**Goal**: Improve user experience and add advanced document management features

#### Current Tasks (In Progress):
- [ ] **Enhanced search functionality** - Better search UI, search within folders
- [ ] **Bulk operations** - Select multiple docs, bulk delete/move
- [ ] **Improved upload experience** - Drag & drop, progress indicators
- [ ] **Document preview improvements** - Better text extraction display

### 🤖 Phase 2: Intelligent Chat with RAG Context (PRIORITY 2)
**Goal**: Chat that can answer questions using the knowledge base

#### Tasks:
- [ ] Enhance chat service with RAG context injection
- [ ] Implement streaming responses for better UX
- [ ] Add source citations to chat responses
- [ ] Create context-aware conversation memory
- [ ] Add suggested follow-up questions

#### Success Metrics:
- ✅ Chat answers include knowledge base context
- ✅ Sources are cited in responses
- ✅ Streaming responses work smoothly
- ✅ Context doesn't exceed token limits

### 🎥 Phase 3: Video RAG System (PRIORITY 3)
**Goal**: Extract and search information from travel videos

#### Tasks:
- [ ] Install video processing dependencies
- [ ] Create video upload and processing pipeline
- [ ] Implement transcript extraction (Whisper API)
- [ ] Add video timeline segmentation
- [ ] Enable jump-to-timestamp functionality

#### Success Metrics:
- ✅ Process videos up to 10 minutes
- ✅ Transcript searchable within 30 seconds
- ✅ Jump to specific timestamps
- ✅ Video segments appear in search results

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenAI API key
- Qdrant Cloud account (for vector database)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tala-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Add your API keys:
   ```env
   # Frontend variables
   VITE_QDRANT_URL=your-qdrant-url
   VITE_QDRANT_API_KEY=your-qdrant-key
   VITE_OPENAI_API_KEY=your-openai-key
   
   # Backend variables (same values, without VITE_ prefix)
   QDRANT_URL=your-qdrant-url
   QDRANT_API_KEY=your-qdrant-key
   OPENAI_API_KEY=your-openai-key
   CORS_ORIGIN=http://localhost:5173
   PORT=3001
   ```

4. **Start the backend server**
   ```bash
   cd server
   node server.js
   ```
   The backend will run on `http://localhost:3001`

5. **Start the frontend development server**
   ```bash
   # In a new terminal, from the root directory
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

6. **Open in browser**
   Navigate to `http://localhost:5173`

### For RAG Implementation (Phase 1)
```bash
# Install additional dependencies for RAG
npm install @qdrant/js-client openai langchain @langchain/community pdf-parse mammoth xlsx
```

## 🏗️ Architecture Overview

### Current Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom glassmorphic theme
- **Routing**: React Router v6
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Upcoming Stack (Phase 1+)
- **Vector Database**: Qdrant Cloud
- **AI/LLM**: OpenAI GPT-4 + Embeddings
- **Document Processing**: pdf-parse, mammoth, xlsx
- **Video Processing**: Whisper API, ffmpeg.js
- **Orchestration**: LangChain

## 🎮 Features

### ✅ Currently Available
- **Beautiful UI**: Glassmorphic design with smooth animations
- **Dashboard**: Travel agency metrics and activity overview
- **Knowledge Base**: Full document management system
  - Document upload and processing (PDF, Word, Excel, Text)
  - Vector-based semantic search with OpenAI embeddings
  - Folder organization with create, edit, delete operations
  - Document viewer with PDF support
  - Document management (delete, move between folders)
  - Three-dots action menus and confirmation dialogs
  - Real-time UI updates and folder synchronization
- **Chat Interface**: Beautiful chat UI with message formatting
- **Settings**: Comprehensive user and system preferences
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Backend API**: Complete Express.js server with Qdrant integration

### 🚧 In Development (Phase 1.5)
- **Enhanced Search UI**: Better search interface and folder-specific search
- **Bulk Operations**: Multi-select for documents with bulk actions
- **Improved Upload**: Drag & drop interface with progress indicators
- **Document Previews**: Enhanced text extraction and display

### 🔮 Planned Features
- **Video Processing**: Extract and search video content
- **Multi-Agent System**: Specialized AI agents for different tasks
- **Embeddable Widget**: Add Tala to any website
- **Advanced Analytics**: Detailed usage and performance metrics

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Environment Variables
```env
# Required for RAG functionality
VITE_QDRANT_URL=https://your-cluster.qdrant.io
VITE_QDRANT_API_KEY=your-qdrant-api-key
VITE_OPENAI_API_KEY=sk-your-openai-key

# Optional
VITE_APP_ENV=production
```

## 📊 Development Guidelines

### Code Style
- Use TypeScript for all new files
- Follow React function component patterns
- Implement responsive design with Tailwind
- Use Framer Motion for animations
- Maintain glassmorphic design consistency

### Performance
- Implement lazy loading for large components
- Use React.memo for expensive renders
- Optimize images and assets
- Minimize bundle size with code splitting

### Testing Strategy
- Unit tests for utility functions
- Component tests for UI components
- Integration tests for API services
- E2E tests for critical user flows

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Process
1. Check the [Development Roadmap](#-development-roadmap) for current priorities
2. Pick a task from Phase 1 (highest priority)
3. Follow the [coding guidelines](#development-guidelines)
4. Test your changes thoroughly
5. Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Acknowledgments

- Design inspiration from modern glassmorphic UI trends
- Icons by [Lucide](https://lucide.dev/)
- Built with [Vite](https://vitejs.dev/) and [React](https://reactjs.org/)
- Powered by [OpenAI](https://openai.com/) and [Qdrant](https://qdrant.tech/)

---

<div align="center">

**[🚀 Get Started](#-quick-start) | [📖 Documentation](docs/) | [🐛 Report Bug](issues/) | [💡 Request Feature](issues/)**

Made with ❤️ for the travel industry

</div>