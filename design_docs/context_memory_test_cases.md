# Context Memory Test Cases

This document outlines test scenarios for the Context Memory feature (Issue #7) to validate the persistent memory functionality of Ashley Calendar AI.

## Test Scenario 1: Basic Conversation Continuity

### Setup
- New user (john.doe@company.com) sends first meeting request
- Ashley processes and responds
- User sends follow-up message referencing previous conversation

### Test Data
```
Email 1 (Initial Request):
From: john.doe@company.com
Subject: Meeting with Sarah next week
Body: "Hi Ashley, can you schedule a 1-hour meeting with Sarah Johnson (sarah.j@company.com) sometime next week? I'm flexible on timing."

Expected Ashley Response: 
- Creates conversation record
- Logs meeting request
- Proposes available times
- Stores all interaction data

Email 2 (Follow-up):
From: john.doe@company.com  
Subject: Re: Meeting with Sarah next week
Body: "Actually, can we make that meeting 30 minutes instead of the hour we discussed?"

Expected Ashley Behavior:
- Retrieves previous conversation context
- References original 1-hour request
- Updates meeting duration to 30 minutes
- Maintains conversation continuity
```

### Success Criteria
- ✅ Ashley references the previous conversation
- ✅ Conversation history is maintained
- ✅ Meeting details are updated correctly
- ✅ No duplicate meeting requests created

---

## Test Scenario 2: Duplicate Request Prevention

### Setup
- User accidentally sends the same meeting request twice
- System should detect and prevent duplicate processing

### Test Data
```
Email 1:
From: alice.smith@company.com
Subject: Team standup scheduling
Body: "Please schedule our weekly team standup for Mondays at 10 AM with the engineering team (5 people)."

Email 2 (Duplicate - sent 10 minutes later):
From: alice.smith@company.com
Subject: Team standup scheduling  
Body: "Please schedule our weekly team standup for Mondays at 10 AM with the engineering team (5 people)."

Expected Ashley Behavior:
- Process first email normally
- Detect second email as duplicate
- Respond: "I see you've already requested this meeting. The team standup is already scheduled for Mondays at 10 AM. Would you like to make any changes?"
```

### Success Criteria
- ✅ Duplicate detection works correctly
- ✅ No duplicate calendar events created
- ✅ User is informed about existing request
- ✅ Option to modify existing request is offered

---

## Test Scenario 3: Multi-Message Meeting Planning

### Setup
- Complex meeting planning that spans multiple emails
- Context should be maintained throughout the entire planning process

### Test Data
```
Email 1:
From: manager@company.com
Subject: Q4 Planning Meeting
Body: "I need to schedule a Q4 planning meeting with the leadership team."

Email 2:
From: manager@company.com
Subject: Re: Q4 Planning Meeting
Body: "The attendees should be: CEO, CTO, VP Sales, VP Marketing, and myself. We'll need 2 hours."

Email 3:
From: manager@company.com
Subject: Re: Q4 Planning Meeting  
Body: "Actually, let's also invite the Head of Product. And can we make it next Friday afternoon?"

Email 4:
From: manager@company.com
Subject: Re: Q4 Planning Meeting
Body: "Perfect! Please send calendar invites to everyone and book the large conference room."

Expected Ashley Behavior:
- Maintains context across all 4 emails
- Builds complete meeting requirements progressively
- Final meeting includes all 6 attendees, 2-hour duration, next Friday afternoon
- Books conference room and sends invites
```

### Success Criteria
- ✅ Context maintained across multiple messages
- ✅ Meeting details accumulated correctly
- ✅ Final meeting includes all specified requirements
- ✅ All actions completed as requested

---

## Test Scenario 4: Pending Meeting Requests Status

### Setup
- User has discussed multiple meetings but some haven't been scheduled yet
- System should track and report on pending/incomplete meeting requests

### Test Data
```
Previous Conversations (past few days):
1. Discussed client presentation with Acme Corp - still pending time confirmation
2. Mentioned team retrospective - no specific date set yet
3. Talked about vendor demo - waiting for vendor availability
4. Scheduled weekly 1:1 with direct report - completed and on calendar

Current Email:
From: busy.executive@company.com
Subject: Meeting status check
Body: "Ashley, which meetings have we discussed that haven't made it to my calendar yet?"

Expected Ashley Response:
- Retrieves all recent meeting discussions
- Identifies meetings with status "pending" or "incomplete"
- Lists: Acme Corp presentation, team retrospective, vendor demo
- Excludes: weekly 1:1 (already scheduled)
- Offers to help complete the pending requests
```

### Success Criteria
- ✅ Identifies meetings discussed but not yet scheduled
- ✅ Excludes already-completed meetings
- ✅ Provides clear status for each pending item
- ✅ Offers actionable next steps

---

## Test Scenario 5: Failed Action Recovery

### Setup
- Previous meeting scheduling failed (e.g., calendar API error)
- User follows up, system should remember the failed attempt

### Test Data
```
Previous Interaction:
- User requested meeting with external client
- Calendar API failed during scheduling
- Error logged in actions table

Follow-up Email:
From: sales.rep@company.com
Subject: Did that client meeting get scheduled?
Body: "Hi Ashley, I haven't seen the calendar invite for the meeting with Acme Corp we discussed yesterday. Did something go wrong?"

Expected Ashley Behavior:
- Retrieves previous conversation and failed action
- Acknowledges the failure
- Explains what went wrong
- Offers to retry the scheduling
- Provides alternative solutions if needed
```

### Success Criteria
- ✅ Failed action is remembered and acknowledged
- ✅ Clear explanation of what went wrong
- ✅ Proactive retry offered
- ✅ Alternative solutions suggested

---

## Test Scenario 6: Cross-Reference Related Meetings

### Setup
- User schedules multiple related meetings
- System should recognize relationships and avoid conflicts

### Test Data
```
Email 1:
From: project.manager@company.com
Subject: Project kickoff meeting
Body: "Schedule project kickoff for the new mobile app project next Tuesday at 2 PM."

Email 2 (Next day):
From: project.manager@company.com  
Subject: Mobile app design review
Body: "We need a design review meeting for the mobile app project. Should be after the kickoff meeting."

Expected Ashley Behavior:
- Recognizes both meetings are for "mobile app project"
- Ensures design review is scheduled after kickoff
- Suggests logical timing (e.g., later in the week)
- Maintains project context across meetings
```

### Success Criteria
- ✅ Related meetings are identified
- ✅ Logical scheduling order maintained
- ✅ Project context preserved
- ✅ Scheduling conflicts avoided

---

## Mock Database State Examples

### Sample Conversation Record
```json
{
  "conversation_id": "conv_001",
  "user_email": "john.doe@company.com",
  "started_at": "2024-01-15T09:00:00Z",
  "last_activity": "2024-01-15T09:15:00Z",
  "status": "active",
  "messages": [
    {
      "id": "msg_001",
      "timestamp": "2024-01-15T09:00:00Z",
      "sender": "user",
      "content": "Can you schedule a meeting with Sarah?",
      "message_type": "request"
    },
    {
      "id": "msg_002", 
      "timestamp": "2024-01-15T09:01:00Z",
      "sender": "assistant",
      "content": "I'd be happy to help schedule a meeting with Sarah...",
      "message_type": "response"
    }
  ],
  "meeting_requests": [
    {
      "id": "req_001",
      "status": "scheduled",
      "meeting_title": "Meeting with Sarah",
      "participants": ["john.doe@company.com", "sarah.j@company.com"],
      "proposed_times": ["2024-01-22T14:00:00Z", "2024-01-22T15:00:00Z"],
      "final_time": null,
      "calendar_event_id": null
    }
  ]
}
```

### Sample Meeting Request States
```json
{
  "pending_requests": [
    {
      "id": "req_002",
      "status": "pending",
      "meeting_title": "Acme Corp Presentation",
      "reason_pending": "Awaiting time confirmation from client",
      "last_action": "2024-01-15T10:00:00Z"
    },
    {
      "id": "req_003", 
      "status": "incomplete",
      "meeting_title": "Team Retrospective",
      "reason_pending": "No specific date requested yet",
      "last_action": "2024-01-14T16:30:00Z"
    }
  ],
  "completed_requests": [
    {
      "id": "req_004",
      "status": "scheduled",
      "meeting_title": "Weekly 1:1",
      "calendar_event_id": "cal_evt_456",
      "scheduled_time": "2024-01-16T14:00:00Z"
    }
  ]
}
```

## Testing Framework Requirements

### Unit Tests
- Database operations (CRUD)
- Context retrieval logic
- Duplicate detection algorithms
- Meeting status tracking

### Integration Tests  
- n8n workflow integration
- Email processing with memory
- Calendar API interactions
- End-to-end conversation flows

### Performance Tests
- Large dataset handling
- Concurrent user scenarios
- Query optimization validation
- Memory usage monitoring

These focused test cases provide coverage of the core context memory functionality needed to enhance Ashley's ability to maintain conversation continuity and track meeting request states effectively.
