class OwnerIntent {
  /// The type of intent detected from the owner's message
  intent_type IntentType
  
  /// Meeting title or subject
  title string?
  
  /// Date and time for the meeting (in natural language)
  datetime string?
  
  /// Duration of the meeting
  duration string?
  
  /// Location or meeting link
  location string?
  
  /// Meeting description or agenda
  description string?
  
  /// Priority level of the meeting
  priority Priority?
  
  /// Whether this is a recurring meeting
  recurring bool?
  
  /// Recurrence pattern if recurring
  recurrence_pattern string?
  
  /// Participants for the meeting (names or email addresses)
  participants string[]
  
  /// Any specific requirements or constraints
  requirements string?
  
  /// Preferred meeting format (in-person, virtual, hybrid)
  format MeetingFormat?
  
  /// Calendar to use for scheduling
  calendar string?
  
  /// Timezone for the meeting
  timezone string?
}

enum IntentType {
  SCHEDULE_MEETING
  RESCHEDULE_MEETING
  CANCEL_MEETING
  UPDATE_MEETING
  CHECK_AVAILABILITY
  BLOCK_TIME
  OTHER
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum MeetingFormat {
  IN_PERSON
  VIRTUAL
  HYBRID
}

function ExtractOwnerIntent(input: string) -> OwnerIntent {
  client CustomGPT4o
  prompt #"
    You are an expert at understanding meeting-related requests from calendar owners.
    
    Analyze the following message and extract the owner's intent and meeting details:
    
    Message: {{input}}
    
    Extract all relevant information about:
    - What the owner wants to do (schedule, reschedule, cancel, etc.)
    - Meeting details (title, date/time, duration, location, participants, etc.)
    - Any constraints or preferences
    
    If participants list is empty or not mentioned, return an empty array.
    If information is not provided or unclear, use null for optional fields.
    
    Be precise and thorough in your analysis.
  "#
}