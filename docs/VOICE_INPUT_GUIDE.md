# Voice Input Guide for TALA AI

This guide explains how to use the new speech-to-text functionality in TALA AI to query the system using voice commands.

## Overview

TALA AI now supports voice input using the Web Speech API, allowing users to speak their travel queries instead of typing them. This feature is particularly useful for:

- Quick travel questions while on the go
- Hands-free interaction
- Users who prefer speaking to typing
- Accessibility improvements

## Getting Started

### 1. Browser Compatibility

Voice input works in browsers that support the Web Speech API:
- ✅ **Chrome/Chromium** (Desktop & Mobile)
- ✅ **Microsoft Edge** (Desktop & Mobile)
- ✅ **Safari** (iOS/macOS - limited support)
- ❌ **Firefox** (Limited support)

### 2. Microphone Permission

Before using voice input, you'll need to grant microphone access:

1. Click the microphone button in the chat input
2. Your browser will prompt for microphone permission
3. Click "Allow" to enable voice input
4. The microphone icon will become active

### 3. Language Settings

TALA AI supports voice input in multiple languages:

1. Click the **Settings** button in the Voice Input card
2. Select your preferred language from the list
3. Test your microphone to ensure it's working
4. Close the settings modal

## Using Voice Input

### Basic Voice Commands

1. **Start Voice Input**: Click the microphone button (🎤) in the chat input
2. **Speak Clearly**: The input will show "Listening... Speak now"
3. **Auto-Submit**: Speech is automatically converted to text and can be sent

### Voice Input States

- **Inactive**: Gray microphone icon, ready to start
- **Listening**: Red microphone with pulsing animation
- **Processing**: Text appears in real-time as you speak
- **Complete**: Final transcript appears in the input field

### Example Voice Queries

Here are some example queries you can try:

#### Travel Requirements
- *"What visa do I need for Japan?"*
- *"Tell me about passport requirements for Greece"*
- *"How long can I stay in Spain without a visa?"*

#### Document Questions
- *"What documents do I need to travel to Italy?"*
- *"When does my passport need to expire for travel to France?"*
- *"What are the entry requirements for Germany?"*

#### Flight Information
- *"What are the baggage policies for international flights?"*
- *"Tell me about carry-on restrictions"*
- *"What items are prohibited in checked luggage?"*

## Features

### Real-time Transcription
- See your speech converted to text in real-time
- Interim results show as you speak
- Final results appear when you finish speaking

### Error Handling
- Clear error messages for common issues
- Automatic retry suggestions
- Fallback to text input if voice fails

### Multi-language Support
Supported languages include:
- English (US/UK)
- Spanish, French, German, Italian
- Portuguese, Japanese, Korean
- Chinese (Simplified), Arabic, Hindi
- Russian, Dutch, Polish

### Voice Settings Panel
Access advanced settings through the settings button:
- **Language Selection**: Choose your preferred speech language
- **Microphone Test**: Test your microphone setup
- **Permission Management**: Grant or check microphone access
- **Troubleshooting**: Get help with common issues

## Tips for Best Results

### Environment
- **Quiet Space**: Use voice input in quiet environments
- **Clear Speech**: Speak clearly and at normal pace
- **Microphone Position**: Keep your microphone close but not too close

### Speaking Tips
- **Pause Between Thoughts**: Brief pauses help with accuracy
- **Avoid Filler Words**: Skip "um", "uh", "like" for cleaner results
- **Spell Out Names**: For proper nouns, speak each letter clearly

### Technical Tips
- **Check Internet**: Voice recognition requires internet connection
- **Browser Updates**: Keep your browser updated for best performance
- **Microphone Quality**: Better microphones give better results

## Troubleshooting

### Common Issues

#### "Microphone access denied"
- **Solution**: Check browser permissions in settings
- **Chrome**: Go to Settings > Privacy > Site Settings > Microphone
- **Edge**: Go to Settings > Site Permissions > Microphone

#### "No speech detected"
- **Solution**: Check microphone connection and levels
- **Test**: Use the microphone test in voice settings
- **Environment**: Ensure you're in a quiet environment

#### "Network error"
- **Solution**: Check internet connection
- **Note**: Voice recognition requires active internet connection

#### Poor recognition accuracy
- **Solutions**:
  - Speak more clearly and slowly
  - Check selected language matches your speech
  - Test microphone in voice settings
  - Try using voice input in a quieter environment

### Browser-Specific Issues

#### Safari (iOS/macOS)
- May require enabling speech recognition in system settings
- Limited language support compared to Chrome
- May need page refresh after granting permissions

#### Firefox
- Limited Web Speech API support
- May not work in all versions
- Consider using Chrome or Edge for best experience

## Privacy & Security

### Data Handling
- **Local Processing**: Speech is processed by your browser
- **No Storage**: TALA AI doesn't store voice recordings
- **Google Integration**: Chrome uses Google's speech recognition service
- **Temporary Data**: Transcripts are only kept during the session

### Best Practices
- **Sensitive Information**: Avoid speaking sensitive data aloud
- **Public Spaces**: Be mindful of privacy in public areas
- **Turn Off**: Disable voice input when not needed

## Advanced Features

### Context Awareness
Voice input works with TALA's conversation context:
- **Follow-up Questions**: "What about Italy?" after asking about France
- **Reference Resolution**: "How long can I stay there?" referring to previous location
- **Entity Tracking**: Remembers countries, dates, and documents mentioned

### Multi-turn Conversations
- **Continuous Context**: Previous voice inputs inform current responses
- **Cross-modal**: Mix voice and text input seamlessly
- **Smart References**: AI understands "it", "there", "that place" from context

## Keyboard Shortcuts

- **Toggle Voice**: Click microphone button or use space bar when focused
- **Stop Recording**: Click microphone again or press Escape
- **Send Message**: Voice input auto-submits when complete

## Getting Help

If you experience issues with voice input:

1. **Check Settings**: Open voice settings and test your microphone
2. **Browser Console**: Check for error messages in developer tools
3. **Try Different Browser**: Test with Chrome or Edge
4. **System Settings**: Check OS-level microphone permissions

Voice input enhances TALA AI's accessibility and convenience, making it easier to get travel information hands-free. The feature works best with clear speech in quiet environments and improves with use as the system learns your speech patterns.