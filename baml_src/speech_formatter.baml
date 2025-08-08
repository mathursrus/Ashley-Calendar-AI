class SiriResponse {
  /// What Siri speaks aloud (concise, conversational, speech-optimized)
  spoken string
  
  /// What appears on screen (can be more detailed, structured format)
  displayed string
  
  /// Number of events found (for metadata/logging)
  event_count int
  
  /// Whether there are any conflicts or issues to highlight
  has_conflicts bool
}

function FormatScheduleForSiri(events_json: string, query_context: string, current_datetime: string) -> SiriResponse {
    client CustomSonnet
    prompt #"
    # ***YOUR GOAL***
    # You are Ashley's speech formatter. Convert calendar events into Siri-friendly responses that are:
    # 1. SPEECH-OPTIMIZED: Natural, conversational, easy to understand when spoken aloud
    # 2. CONCISE: Avoid overwhelming details, focus on key information
    # 3. TIME-FRIENDLY: Use natural time expressions (e.g., "in 30 minutes", "this afternoon")
    # 4. CONTEXTUAL: Adapt based on the user's query and current time
    #
    # ***INPUT CONTEXT***
    # Current datetime: {{current_datetime}} (Pacific timezone)
    # User query context: {{query_context}}
    # Calendar events JSON: {{events_json}}
    #
    # ***SPOKEN TEXT GUIDELINES***
    # - Use conversational language: "You have", "Your next meeting is", "Nothing scheduled"
    # - Convert times to natural speech: "2:30 PM" → "two thirty PM", "14:00" → "two PM"
    # - Use relative time when helpful: "in 30 minutes", "this afternoon", "tomorrow morning"
    # - Group similar events: "You have 3 meetings today" rather than listing each
    # - Keep it under 50 words for quick queries, under 100 words for detailed queries
    # - End with helpful context: "Would you like me to reschedule anything?"
    #
    # ***DISPLAYED TEXT GUIDELINES***
    # - Can be more detailed than spoken text
    # - Include specific times, locations, participants
    # - Use bullet points or structured format
    # - Show duration and meeting types
    # - Include any important notes or conflicts
    #
    # ***TIME FORMATTING RULES***
    # - For speech: "nine AM", "two thirty PM", "quarter past three"
    # - For display: "9:00 AM", "2:30 PM", "3:15 PM"
    # - Use "this morning/afternoon/evening" for today
    # - Use "tomorrow morning/afternoon" for next day
    # - Use day names for this week: "Wednesday afternoon"
    #
    # ***EXAMPLES***
    #
    # **Empty Schedule:**
    # Spoken: "You're all clear today! No meetings scheduled."
    # Displayed: "No events scheduled for today"
    #
    # **Single Meeting:**
    # Spoken: "You have one meeting today - your project review with John at two PM."
    # Displayed: "• 2:00 PM - Project Review with John (1 hour)"
    #
    # **Multiple Meetings:**
    # Spoken: "You have three meetings today. Your next one is the team standup at nine thirty AM, then lunch with Sarah at noon."
    # Displayed: "• 9:30 AM - Team Standup (30 min)\n• 12:00 PM - Lunch with Sarah (1 hour)\n• 3:00 PM - Client Call (45 min)"
    #
    # **Busy Day:**
    # Spoken: "It's a busy day! You have five meetings starting with the board meeting at nine AM. Your longest break is from two to three PM."
    # Displayed: "5 meetings scheduled:\n• 9:00 AM - Board Meeting\n• 10:30 AM - Project Review\n[...continues...]"
    #
    # ***CONFLICT HANDLING***
    # - If overlapping meetings, mention in speech: "Heads up, you have overlapping meetings at two PM"
    # - Mark has_conflicts as true
    # - Suggest solutions when possible
    #
    # ***QUERY CONTEXT ADAPTATION***
    # - "today" query: Focus on today's events, mention next important one
    # - "tomorrow" query: Overview of tomorrow's schedule
    # - "this week" query: High-level summary, highlight busy days
    # - "rest of day" query: Focus on remaining events, mention if day is done
    #
    # ***OUTPUT FORMAT***
    # Return a SiriResponse with:
    # - spoken: Natural, conversational text for Siri to speak aloud
    # - displayed: Structured text for visual display on screen
    # - event_count: Number of events found (for metadata)
    # - has_conflicts: Boolean for overlapping meetings
    #
    # {{ ctx.output_format }}
    "#
}

test speech_formatter_empty_schedule {
    functions [FormatScheduleForSiri]
    args {
        events_json "[]"
        query_context "what's on my schedule today"
        current_datetime "2025-08-07 13:00:00 PST"
    }
}

test speech_formatter_single_meeting {
    functions [FormatScheduleForSiri]
    args {
        events_json "[{\"title\": \"Project Review\", \"start_time\": \"2025-08-07 14:00:00\", \"end_time\": \"2025-08-07 15:00:00\", \"participants\": [\"John Smith\"], \"location\": \"Conference Room A\"}]"
        query_context "what's on my schedule today"
        current_datetime "2025-08-07 13:00:00 PST"
    }
}

test speech_formatter_multiple_meetings {
    functions [FormatScheduleForSiri]
    args {
        events_json "[{\"title\": \"Team Standup\", \"start_time\": \"2025-08-07 09:30:00\", \"end_time\": \"2025-08-07 10:00:00\", \"participants\": [\"Team\"]}, {\"title\": \"Lunch with Sarah\", \"start_time\": \"2025-08-07 12:00:00\", \"end_time\": \"2025-08-07 13:00:00\", \"participants\": [\"Sarah Johnson\"]}, {\"title\": \"Client Call\", \"start_time\": \"2025-08-07 15:00:00\", \"end_time\": \"2025-08-07 15:45:00\", \"participants\": [\"Client Team\"]}]"
        query_context "what's on my schedule today"
        current_datetime "2025-08-07 13:00:00 PST"
    }
}

test speech_formatter_busy_day {
    functions [FormatScheduleForSiri]
    args {
        events_json "[{\"title\": \"Board Meeting\", \"start_time\": \"2025-08-07 09:00:00\", \"end_time\": \"2025-08-07 10:30:00\"}, {\"title\": \"Project Review\", \"start_time\": \"2025-08-07 10:30:00\", \"end_time\": \"2025-08-07 11:30:00\"}, {\"title\": \"Team Lunch\", \"start_time\": \"2025-08-07 12:00:00\", \"end_time\": \"2025-08-07 13:00:00\"}, {\"title\": \"Client Presentation\", \"start_time\": \"2025-08-07 15:00:00\", \"end_time\": \"2025-08-07 16:00:00\"}, {\"title\": \"One-on-One\", \"start_time\": \"2025-08-07 16:30:00\", \"end_time\": \"2025-08-07 17:00:00\"}]"
        query_context "what's on my schedule today"
        current_datetime "2025-08-07 08:00:00 PST"
    }
}

test speech_formatter_rest_of_day {
    functions [FormatScheduleForSiri]
    args {
        events_json "[{\"title\": \"Client Call\", \"start_time\": \"2025-08-07 15:00:00\", \"end_time\": \"2025-08-07 15:45:00\", \"participants\": [\"Client Team\"]}, {\"title\": \"Team Retrospective\", \"start_time\": \"2025-08-07 16:30:00\", \"end_time\": \"2025-08-07 17:30:00\", \"participants\": [\"Development Team\"]}]"
        query_context "what's on my schedule for the rest of today"
        current_datetime "2025-08-07 13:00:00 PST"
    }
}
