# Siri Voice Integration Design Document

## Overview
Enable Ashley Calendar AI to work with Siri voice commands for natural calendar management.

## Architecture
```
[User Voice] → [Siri STT] → [Single Shortcut] → [Ashley Voice Orchestrator] → [Intent Detection] → [Action Execution] → [Voice Response]
```

### New Approach: Siri as Dumb STT
- **Single Siri Shortcut**: "Ask Ashley" - captures any voice input
- **Ashley handles all intelligence**: Intent detection, routing, execution
- **Simplified user experience**: One phrase for everything

## Key Components

### 1. Voice API Endpoints
- `POST /api/voice/query` - Get schedule information
- `POST /api/voice/create` - Create calendar events  
- `POST /api/voice/update` - Modify existing events

### 2. Request/Response Format
```json
Request: {
  "command": "what's on my schedule today",
  "user_id": "sid"
}

Response: {
  "speech": "You have 3 meetings today...",
  "displayText": "📅 Today's Schedule...",
  "success": true
}
```

### 3. Simplified Parameter Extraction
- Create lightweight BAML models for each endpoint
- Extract only parameters (time, participants, etc.) not intent
- Siri Shortcuts handles routing to correct endpoint
- Simple error handling for missing/invalid parameters

### 4. Speech Optimization
- Concise, conversational responses
- Avoid complex formatting in speech text
- Clear action confirmations

## Implementation Plan

### Phase 1: Foundation
1. Create voice API endpoints
2. Enhance intent detection for voice
3. Implement speech-friendly response formatting
4. Basic Siri Shortcuts setup

### Phase 2: Core Features  
1. Schedule querying via voice
2. Meeting creation through voice
3. End-to-end testing

### Phase 3: Advanced Features
1. Event modifications
2. Complex scheduling scenarios
3. Error handling improvements

## Siri Shortcuts Configuration

**Single Universal Shortcut:**
- **Phrase**: "Ask Ashley" (for any request)
- **Endpoint**: `/api/voice/ashley` (single endpoint)
- **Input**: Raw voice text from user
- **Output**: Ashley's intelligent response

**Shortcut Flow:**
1. User: "Hey Siri, ask Ashley to schedule a meeting with John tomorrow"
2. Siri captures: "schedule a meeting with John tomorrow"
3. Calls: `POST /api/voice/ashley` with voice text
4. Ashley determines intent and executes action
5. Siri speaks Ashley's response

**Benefits:**
- **One shortcut handles everything**
- **Natural conversation flow**
- **Ashley's full intelligence available**
- **No Siri routing limitations**

## Technical Considerations
- Response time optimization (< 3 seconds)
- Natural language processing improvements
- Authentication for voice requests
- Error handling with voice feedback

## Success Metrics
- Voice recognition accuracy > 95%
- Response time < 3 seconds  
- High user satisfaction with voice interactions
