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
  
  // Minimal timezone awareness fields
  requestor_timezone string?
  timezone_confidence float?
  explicit_timezone_mentioned bool
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
       - requestor_timezone: If you can detect sender's timezone from content (e.g., "PST", "EST", "2 PM my time"), provide IANA format like "America/New_York". Otherwise leave null.
       - timezone_confidence: Confidence level 0.0-1.0 for timezone detection (0.0 if no timezone detected)
       - explicit_timezone_mentioned: true if sender explicitly mentioned a timezone like "PST", "EST", "Pacific time", etc.

    5. RESPONSE STYLE:
       - response_tone: PROFESSIONAL, FRIENDLY, CASUAL, or FORMAL based on sender's tone

    Return the extracted information in the specified format.
  "#
}

function GenerateEmailResponse(calendar_intent: CalendarIntent, calendar_data: string) -> string {
  client GPT4o
  prompt #"
    You are Ashley, Sid's AI calendar assistant. Generate a professional email response.

    Calendar Intent: {{ calendar_intent }}
    Sid's Calendar Data: {{ calendar_data }}

    Generate an email response that:
    1. Acknowledges the request with appropriate tone
    2. Provides calendar availability or confirms scheduling
    3. Is helpful and professional
    4. If timezone was detected, acknowledge it appropriately

    Keep the response concise but complete.
  "#
}