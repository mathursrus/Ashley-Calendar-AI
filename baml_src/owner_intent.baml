enum OwnerIntentType {
  SCHEDULE_QUERY // "what's on my schedule", "what do I have today"
  MEETING_CREATE // "schedule a meeting", "book time with"
  MEETING_UPDATE // "move my meeting", "reschedule", "change time"
  MEETING_CANCEL // "cancel my meeting", "delete appointment"
  AVAILABILITY_CHECK // "am I free", "do I have time"
  UNKNOWN // unclear or unsupported request
}

class OwnerCalendarIntent {
  /// The type of calendar action the user wants to perform
  intent_type OwnerIntentType
  
  /// Confidence level (0.0 to 1.0) in the intent classification
  confidence float
  
  // === SCHEDULE QUERY PARAMETERS ===
  /// Time period to query (YYYY-mm-dd format for specific dates)
  query_start_date string?
  query_end_date string?
  
  // === MEETING CREATE PARAMETERS ===
  /// Participants for the meeting (names or email addresses)
  participants string[]?
  /// Preferred meeting datetime (YYYY-mm-dd hh:mm format in Pacific time)
  preferred_datetime string?
  /// Meeting duration in minutes
  duration_minutes int?
  /// Meeting title/subject
  meeting_title string?
  /// Meeting location (physical or virtual)
  location string?
  /// Time range for scheduling if no specific time given
  timerange_start string?
  timerange_end string?
  
  // === MEETING UPDATE PARAMETERS ===
  /// How to identify the meeting to update (time, participant, title)
  meeting_identifier string?
  /// New datetime for the meeting (YYYY-mm-dd hh:mm format)
  new_datetime string?
  
  // === MEETING CANCEL PARAMETERS ===
  /// How to identify the meeting to cancel
  cancel_meeting_identifier string?
  
  // === AVAILABILITY CHECK PARAMETERS ===
  /// Datetime to check availability (YYYY-mm-dd hh:mm format)
  availability_datetime string?
  /// Duration needed for availability check in minutes
  availability_duration_minutes int?
  
  /// Any clarifications needed from the user
  clarification_needed string?
}

function ExtractOwnerCalendarIntent(owner_input: string, current_datetime: string) -> OwnerCalendarIntent {
    client CustomSonnet
    prompt #"
    # ***YOUR GOAL***
    # You are a calendar intent extractor. Your user is the owner of the calendar. Extract both the calendar action intent AND all necessary parameters with absolute datetime values.
    # Convert all relative time references (today, tomorrow, next week) to absolute YYYY-mm-dd hh:mm format in Pacific timezone.
    #
    # ***CURRENT CONTEXT***
    # Current datetime: {{current_datetime}} (Pacific timezone)
    # Owner input: "{{owner_input}}"
    #
    # ***INTENT CLASSIFICATION***
    # SCHEDULE_QUERY: "what's on my schedule today", "what do I have tomorrow", "show me this week"
    # MEETING_CREATE: "schedule a meeting with John", "book time with Sarah at 2pm tomorrow"
    # MEETING_UPDATE: "move my 3pm meeting to 4pm", "reschedule my call with John to tomorrow"
    # MEETING_CANCEL: "cancel my meeting with John", "delete tomorrow's 2pm appointment"
    # AVAILABILITY_CHECK: "am I free at 3pm tomorrow", "do I have time next week"
    # UNKNOWN: Unclear, ambiguous, or non-calendar requests
    #
    # ***CRITICAL DATE/TIME CONVERSION RULES***
    # Always convert relative references to absolute Pacific timezone datetime:
    # - "today" → use current date ({{current_datetime}})
    # - "tomorrow" → current date + 1 day
    # - "next week" → week starting next Monday
    # - "this week" → current week (Monday to Friday)
    # - "2pm" → convert to 14:00 in YYYY-mm-dd hh:mm format
    # - "3pm tomorrow" → tomorrow's date at 15:00
    #
    # ***PARAMETER EXTRACTION BY INTENT***
    #
    # **SCHEDULE_QUERY**: query_start_date and query_end_date are required. 
    # - "today" → start: current date 00:00, end: current date 23:59
    # - "tomorrow" → start: tomorrow 00:00, end: tomorrow 23:59
    # - "this week" → start: this Monday 00:00, end: this Friday 23:59
    #
    # **MEETING_CREATE**: Extract participants, preferred_datetime, duration_minutes, meeting_title
    # - "with John" → participants: ["John"]
    # - "at 2pm tomorrow" → preferred_datetime: "2025-08-08 14:00" (if tomorrow is Aug 8)
    # - "for an hour" → duration_minutes: 60
    # - "about the project" → meeting_title: "Project Discussion"
    #
    # **MEETING_UPDATE**: Extract meeting_identifier and new_datetime
    # - "my 3pm meeting" → meeting_identifier: "3pm meeting"
    # - "to 4pm" → new_datetime: "2025-08-07 16:00" (if today)
    #
    # **MEETING_CANCEL**: Extract cancel_meeting_identifier
    # - "my meeting with John" → cancel_meeting_identifier: "meeting with John"
    # - "tomorrow's 2pm appointment" → cancel_meeting_identifier: "2025-08-08 14:00 appointment"
    #
    # **AVAILABILITY_CHECK**: Extract availability_datetime and availability_duration_minutes
    # - "at 3pm tomorrow" → availability_datetime: "2025-08-08 15:00"
    # - "for a meeting" → availability_duration_minutes: 30 (default)
    #
    # ***CONFIDENCE SCORING***
    # - 0.9-1.0: Very clear intent with specific details
    # - 0.7-0.8: Clear intent but some missing details
    # - 0.5-0.6: Moderate confidence, some ambiguity
    # - 0.0-0.4: Low confidence, unclear or incomplete
    #
    # ***EXAMPLES***
    # Input: "schedule a meeting with John tomorrow at 2pm for an hour"
    # Output: intent_type: MEETING_CREATE, participants: ["John"], preferred_datetime: "2025-08-08 14:00", duration_minutes: 60
    #
    # Input: "what's on my schedule today"
    # Output: intent_type: SCHEDULE_QUERY, query_start_date: "2025-08-07 00:00", query_end_date: "2025-08-07 23:59"
    #
    # Input: "move my 3pm meeting to 4pm"
    # Output: intent_type: MEETING_UPDATE, meeting_identifier: "3pm meeting", new_datetime: "2025-08-07 16:00"
    #
    # ***OUTPUT FORMAT***
    # {{ ctx.output_format }}
    "#
}

test owner_calendar_intent_meeting_create {
    functions [ExtractOwnerCalendarIntent]
    args {
        owner_input "schedule a meeting with John tomorrow at 2pm for an hour"
        current_datetime "2025-08-07 13:00:00 PST"
    }
}

test owner_calendar_intent_schedule_query {
    functions [ExtractOwnerCalendarIntent]
    args {
        owner_input "what's on my schedule for the rest oftoday"
        current_datetime "2025-08-07 13:00:00 PST"
    }
}

test owner_calendar_intent_meeting_update {
    functions [ExtractOwnerCalendarIntent]
    args {
        owner_input "move my 3pm meeting to 4pm"
        current_datetime "2025-08-07 13:00:00 PST"
    }
}

test owner_calendar_intent_availability_check {
    functions [ExtractOwnerCalendarIntent]
    args {
        owner_input "am I free at 3pm tomorrow"
        current_datetime "2025-08-07 13:00:00 PST"
    }
}

test owner_calendar_intent_meeting_cancel {
    functions [ExtractOwnerCalendarIntent]
    args {
        owner_input "cancel my meeting with Sarah tomorrow"
        current_datetime "2025-08-07 13:00:00 PST"
    }
}
