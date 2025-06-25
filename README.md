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

## 🗓️ Development Roadmap

### 🏆 Phase 1: Knowledge Base & RAG Implementation (PRIORITY 1)
**Goal**: Create a working document search system with vector database

#### Tasks:
- [ ] Install RAG dependencies (`@qdrant/js-client`, `openai`, `langchain`)
- [ ] Create document processing service (PDF, Word, Excel)
- [ ] Set up Qdrant vector database integration
- [ ] Implement vector search with OpenAI embeddings
- [ ] Connect Knowledge Base UI to real search
- [ ] Add document preview and source attribution

#### Success Metrics:
- ✅ Upload and process PDF, Word, Excel files
- ✅ Search returns relevant results with highlights
- ✅ Response time < 500ms for search
- ✅ Source attribution working

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
   VITE_QDRANT_URL=your-qdrant-url
   VITE_QDRANT_API_KEY=your-qdrant-key
   VITE_OPENAI_API_KEY=your-openai-key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
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
- **Knowledge Base**: Document management interface (UI only)
- **Chat Interface**: Beautiful chat UI with message formatting
- **Settings**: Comprehensive user and system preferences
- **Responsive Design**: Works on desktop, tablet, and mobile

### 🚧 In Development (Phase 1)
- **Document Search**: Vector-based semantic search
- **File Upload**: Process PDF, Word, Excel documents
- **AI Chat**: Context-aware responses using knowledge base
- **Source Attribution**: Track and cite information sources

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