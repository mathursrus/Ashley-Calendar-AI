enum CalendarAction {
  SCHEDULE
  RESCHEDULE
  CANCEL
  QUERY
  DECLINE
  ACCEPT
}

enum ResponseTone {
  PROFESSIONAL
  FRIENDLY
  CASUAL
  FORMAL
}

enum MeetingType {
  IN_PERSON
  VIRTUAL
  HYBRID
  PHONE_CALL
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

class CalendarIntent {
  action CalendarAction
  timerange_start string?
  timerange_end string?
  title string?
  description string?
  location string?
  attendees string[]
  response_tone ResponseTone
  meeting_type MeetingType
  priority Priority
  requires_preparation bool
  estimated_duration_minutes int?
  recurring_pattern string?
  
  // Timezone awareness fields
  requestor_timezone string?
  timezone_confidence float?
  timezone_source string?
  explicit_timezone_mentioned bool
  
  // Multi-participant timezone coordination
  participant_timezones string[]
  timezone_aware_times string[]
}

function ExtractCalendarIntent(email_content: string, sender_email: string, email_subject: string) -> CalendarIntent {
  client GPT4o
  prompt #"
    You are Ashley, Sid's AI calendar assistant. Analyze this email and extract calendar-related intent.

    Email Subject: {{ email_subject }}
    Sender: {{ sender_email }}
    Email Content: {{ email_content }}

    Extract the following information:

    1. ACTION: What calendar action is being requested?
       - SCHEDULE: Creating a new meeting/event
       - RESCHEDULE: Moving an existing meeting
       - CANCEL: Canceling a meeting
       - QUERY: Asking about availability or existing meetings
       - DECLINE: Declining a meeting invitation
       - ACCEPT: Accepting a meeting invitation

    2. TIME INFORMATION:
       - timerange_start: Start time in YYYY-MM-DD HH:MM format (if mentioned)
       - timerange_end: End time in YYYY-MM-DD HH:MM format (if mentioned)
       - estimated_duration_minutes: How long the meeting should be

    3. MEETING DETAILS:
       - title: Meeting title/subject
       - description: Meeting description or agenda
       - location: Physical location or "Google Meet" for virtual
       - attendees: List of email addresses of people who should attend
       - meeting_type: IN_PERSON, VIRTUAL, HYBRID, or PHONE_CALL
       - priority: LOW, MEDIUM, HIGH, or URGENT based on language used
       - requires_preparation: Does this meeting need prep work?
       - recurring_pattern: If recurring, describe the pattern (e.g., "weekly", "monthly")

    4. TIMEZONE AWARENESS:
       - requestor_timezone: Detected timezone of the sender (IANA format like "America/New_York")
       - timezone_confidence: Confidence level 0.0-1.0 for timezone detection
       - timezone_source: How timezone was detected ("header", "signature", "content", "fallback")
       - explicit_timezone_mentioned: true if sender explicitly mentioned a timezone
       - participant_timezones: List of detected timezones for all participants
       - timezone_aware_times: Times converted to all relevant timezones

    5. RESPONSE STYLE:
       - response_tone: PROFESSIONAL, FRIENDLY, CASUAL, or FORMAL based on sender's tone

    IMPORTANT TIMEZONE RULES:
    - Look for timezone indicators in email headers, signatures, and content
    - Common patterns: "PST", "EST", "GMT+5", "Pacific time", "2 PM my time"
    - If no timezone detected, use "America/Los_Angeles" (Sid's timezone) as fallback
    - Set explicit_timezone_mentioned to true only if sender clearly states a timezone
    - For multi-participant meetings, try to detect each participant's timezone

    Return the extracted information in the specified format.
  "#
}

function GenerateEmailResponse(
  calendar_intent: CalendarIntent,
  calendar_data: string,
  sender_timezone: string,
  participant_timezones: string[]
) -> string {
  client GPT4o
  prompt #"
    You are Ashley, Sid's AI calendar assistant. Generate a professional email response.

    Calendar Intent: {{ calendar_intent }}
    Sid's Calendar Data: {{ calendar_data }}
    Sender Timezone: {{ sender_timezone }}
    Participant Timezones: {{ participant_timezones }}

    Generate an email response that:
    1. Acknowledges the request with appropriate tone
    2. Shows timezone awareness by mentioning times in relevant timezones
    3. Provides calendar availability or confirms scheduling
    4. Is helpful and professional
    5. Includes timezone context when coordinating across multiple timezones

    TIMEZONE RESPONSE RULES:
    - Always show times in both sender's timezone and Sid's timezone when different
    - For multi-participant meetings, mention key timezones involved
    - Use clear timezone abbreviations (PST, EST, etc.) or full names
    - Example: "The meeting is scheduled for 2:00 PM PST (5:00 PM EST)"

    Keep the response concise but complete.
  "#
}