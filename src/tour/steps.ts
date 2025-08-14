import type { Step } from "../components/tour/TourProvider";

export const DEFAULT_TOUR_STEPS: Step[] = [
  {
    id: "welcome",
    target: '[data-tour="chat-history"]',
    title: "Welcome to Tala! 👋",
    body: "Let's take a quick tour to help you get started. You can press ESC at any time to skip this tour.",
    placement: "bottom",
  },
  {
    id: "chat-history",
    target: '[data-tour="chat-history"]',
    title: "Conversation History",
    body: "Access your previous conversations here. On mobile, tap the menu icon to open the history sidebar.",
    placement: "bottom",
  },
  {
    id: "new-chat",
    target: '[data-tour="new-chat"]',
    title: "Start Fresh",
    body: "Click here to start a new conversation while preserving your chat history.",
    placement: "bottom",
  },
  {
    id: "mode-selector",
    target: '[data-tour="mode-selector"]',
    title: "Switch between Travel & Marketing",
    body: "Toggle between Travel mode for trip planning and Marketing mode for business assistance. Each mode provides specialized AI help.",
    placement: "left",
  },
  {
    id: "chat-input",
    target: '[data-tour="chat-input"]',
    title: "Ask Anything",
    body: "Type your questions here. In Travel mode, ask about destinations, flights, or hotels. In Marketing mode, get help with campaigns, SEO, or analytics.",
    placement: "top",
  },
  {
    id: "theme-toggle",
    target: '[data-tour="theme-toggle"]',
    title: "Customize Your View",
    body: "Switch between light and dark themes for comfortable viewing any time of day.",
    placement: "bottom",
  },
  {
    id: "knowledge-nav",
    target: '[data-tour="upload"]',
    title: "Knowledge Management",
    body: "Let's explore the Knowledge page where you can upload and manage your documents. Tala can reference these in conversations.",
    placement: "bottom",
    navigateTo: "/knowledge-final",
  },
  {
    id: "upload",
    target: '[data-tour="upload"]',
    title: "Upload Documents",
    body: "Add PDFs, Word docs, and other files to your knowledge base. Tala will index them for intelligent search and chat references.",
    placement: "bottom",
  },
  {
    id: "search",
    target: '[data-tour="search"]',
    title: "Search Your Knowledge",
    body: "Quickly find documents by keywords. Filter by folders and preview documents before using them.",
    placement: "bottom",
  },
  {
    id: "folders",
    target: '[data-tour="folders"]',
    title: "Organize with Folders",
    body: "Browse your folder structure here. Create subfolders to keep your documents organized by project or topic.",
    placement: "right",
  },
];

// Mobile-specific tour steps (if different elements are shown)
export const MOBILE_TOUR_STEPS: Step[] = [
  {
    id: "welcome",
    target: '[data-tour="hamburger"]',
    title: "Welcome to Tala! 👋",
    body: "Let's explore the mobile interface. You can swipe or tap to navigate.",
    placement: "bottom",
  },
  {
    id: "hamburger",
    target: '[data-tour="hamburger"]',
    title: "Access Menu",
    body: "Tap here to open the navigation menu and chat history.",
    placement: "bottom",
  },
  {
    id: "mode-selector",
    target: '[data-tour="mode-selector"]',
    title: "Switch Modes",
    body: "Toggle between Travel and Marketing modes for specialized assistance.",
    placement: "top",
  },
  {
    id: "chat-input",
    target: '[data-tour="chat-input"]',
    title: "Start Chatting",
    body: "Type your questions here. Tala will provide intelligent responses based on the selected mode.",
    placement: "top",
  },
  {
    id: "tabs",
    target: '[data-tour="tabs"]',
    title: "Quick Navigation",
    body: "Use the bottom tabs to quickly switch between Chat, Knowledge, and Settings.",
    placement: "top",
  },
];