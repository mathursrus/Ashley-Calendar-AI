# Ashley Calendar Assistant

Ashley is Sid's AI calendar assistant who can intelligently handle meeting requests and calendar management. This BAML implementation provides three main capabilities:

## Features

### 1. **Book Time**
- Checks if Sid is available for the entire requested meeting duration during the requested time slots
- Sends calendar invites to participants with appropriate subject and context
- Ensures meeting start/end times are fully within requested slots
- Verifies meeting length matches the requested duration

### 2. **Suggest Times**
- Analyzes Sid's calendar to find available time slots that can accommodate the requested meeting duration
- Assumes Pacific Time unless explicitly specified otherwise
- Converts other time zones to Pacific Time before checking availability
- Provides 2-3 alternative time options when requested slots are unavailable

### 3. **Ask for Clarification**
- Identifies when meeting duration is unclear or other critical details are missing
- Sends polite emails requesting specific information needed to proceed
- Ensures all necessary details are gathered before taking action

## BAML Functions

### `AshleyCalendarAssistant(calendar_intent, sid_calendar_data)`
Main function that takes the extracted calendar intent and Sid's calendar data to generate an appropriate response.

**Input:**
- `calendar_intent`: CalendarIntent object from ExtractCalendarIntent function
- `sid_calendar_data`: Sid's current calendar availability data

**Output:** `AshleyResponse` object containing:
- `action`: The action to take (BookTime, SuggestTimes, AskForClarification)
- `email_response`: Professional email response to send to the requestor
- `send_calendar_invite`: Whether to send a calendar invite
- `calendar_invite_subject`: Subject line for the calendar invite
- `meeting_start_time`: Meeting start time (YYYY-mm-dd hh:mm format)
- `meeting_end_time`: Meeting end time (YYYY-mm-dd hh:mm format)
- `meeting_duration_minutes`: Duration in minutes
- `participants_to_invite`: Comma-separated list of email addresses
- `meeting_description`: Meeting agenda/description

## Workflow

1. **Extract Intent**: Use `ExtractCalendarIntent(email_thread)` to parse the email
2. **Ashley Responds**: Use `AshleyCalendarAssistant(calendar_intent, sid_calendar_data)` to generate response

## Usage Example

```typescript
import { b } from './baml_client';

const emailThread = `
From: john@example.com
To: sid.mathur@gmail.com
Cc: ashley.sidsai@gmail.com
Date: 2025-07-29 10:00:00
Subject: Meeting Request
Content: Hi Sid,

I'm Gus's EA and want to book time with Sid. Please book sometime on both Mon and Wed next week at 3pm for 30 mins? I'd like to discuss the Q4 project updates.

Thanks,
John
`;

const sidCalendarData = `
Monday, August 4, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 2:00 PM - 3:30 PM: Product Review
- 4:00 PM - 5:00 PM: Available

Wednesday, August 6, 2025:
- 10:00 AM - 11:00 AM: Client Meeting
- 2:00 PM - 2:30 PM: Available
- 3:00 PM - 4:00 PM: Available
- 4:30 PM - 5:30 PM: Strategy Session
`;

// Step 1: Extract calendar intent
const calendarIntent = await b.ExtractCalendarIntent(emailThread);

// Step 2: Let Ashley handle the response
const response = await b.AshleyCalendarAssistant(calendarIntent, sidCalendarData);
console.log(response);
```

## Ashley's Personality

Ashley is designed to be:
- **Professional and efficient**: Gets things done quickly and accurately
- **Warm and helpful**: Uses a friendly, assistant-like tone
- **Detail-oriented**: Always double-checks information before taking action
- **Clear communicator**: Provides specific, actionable responses
- **Respectful**: Values Sid's time and preferences

## Time Zone Handling

- All times are processed in **Pacific Time**
- If other time zones are specified, they are converted to Pacific Time first
- All output times are in Pacific Time format (YYYY-mm-dd hh:mm)

## Calendar Integration

The system expects calendar data in a readable format that includes:
- Date and time ranges
- Meeting descriptions
- Available/unavailable status
- Conflicts and existing commitments

## Testing

Run the test file to see Ashley in action:

```bash
npm run test-ashley
```

This will demonstrate all three action types with different scenarios.

## Dependencies

- Requires the `calendar_intent.baml` file for intent extraction
- Uses OpenAI GPT-4o for natural language processing
- Integrates with the existing BAML client setup 