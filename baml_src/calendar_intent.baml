enum RequestType {
  DoesTimeWork
  SuggestTime
  BookTime
}

class CalendarIntent {
  /// Whether this message requires a calendar action
  action_needed bool
  
  /// Type of calendar request
  request_type RequestType
  
  /// Name of person who originally requested the meeting
  requestor string
  
  /// What time slots are suggested
  time_slots_requested string
  
  /// How long is being requested (e.g., "30 mins", "1 hour", "2 hours")
  meeting_duration string
  
  /// The earliest datetime being considered for the meeting formatted as YYYY-mm-dd hh:mm
  timerange_start string
  
  /// The latest datetime being considered for the meeting formatted as YYYY-mm-dd hh:mm
  timerange_end string
  
  /// Who needs to be included in the meeting - list of email addresses. Do not include Sid (sid.mathur@gmail.com)
  participants string
  
  /// Who are the EAs and for who - email address of EA (email address of participant). Do not include Ashley (ashley.sidsai@gmail.com)
  executive_assistants string
  
  /// Who are the silent observers - list of email addresses. 
  silent_observers string
  
  /// Any additional context for the meeting
  other_context string
  
  /// Date of the request
  date_of_request string
}

function ExtractCalendarIntent(email_thread: string) -> CalendarIntent {
    client "openai/gpt-4o" // Set OPENAI_API_KEY to use this client.
    prompt #"
    # ***YOUR GOAL***
    # You are being provided with an email thread. Your job is to determine whether this email thread requires action on the part of Ashley, Sid's calendar assistant. 
    # Understand the full context of the thread to determine whether Ashley needs to take an action. If so, help Ashley with understanding the context of the action they need to take. 
    # If Ashley does not need to take any action, you don't need to provide additional context.
    #
    # ***CONTEXT***
    # The provided email thread contains information about the sender, recipients, subject, content. It also contains date each message was sent - recent responses are at the top of the thread. 
    #
    # ***PARTICIPANTS***
    # Any meeting request should include meeting participants. At the same time, not every person in the thread has to be a participant. 
    # If the mail clearly lists out participants, use that list. If the participant is not clear, assume the sender of the mail is the participant. 
    # The meeting request could have 2 additional classes of people:
    # 1. EAs: people who are not invited to the meeting, but are helping with the meeting. If the requestor is requesting on behalf of someone else and does not ask to be part of the meeting, chances are they are an EA.
    # 2. Silent Observers: people who are on the thread, but are not asked to be invited to the meeting. They are not helping with the meeting, and are not interested in the meeting.
    # EAs and Silent Observers are not participants.
    #
    # ***BE DELIBERATE AND THOUGHTFUL WHILE INTERPRETING TIMES***
    # Treat all dates in pacific time zone, unless otherwise specified. If another time zone is specified, convert all mentions of dates to pacific time zone before procceding. Your responses should only contain pacific time zone.
    # The working week starts Monday and ends Friday. 
    # 
    # ***CRITICAL DATE INTERPRETATION RULES***
    # - Use the email date as the absolute reference point for all relative date expressions
    # - "next week" means the week starting the Monday after the email date
    # - "this week" means the week containing the email date
    # - "tomorrow" means the day after the email date
    # - "next Monday" means the Monday after the email date
    # - "next Tuesday" means the Tuesday after the email date (could be same week or next week)
    # - Always calculate relative dates based on the email date, not the current date
    # - For ambiguous expressions like "next week", always interpret as the full week (Monday-Friday) starting the Monday after the email date
    # - When a specific day is mentioned (e.g., "next Wednesday"), calculate which Wednesday that refers to based on the email date
    #
    # Example: If email date is 2025-07-28 (Monday), then:
    # - "next week" = 2025-08-04 to 2025-08-08 (Monday-Friday)
    # - "next Wednesday" = 2025-07-30 (same week)
    # - "next Monday" = 2025-08-04 (next week)
    #
    # ***OUTPUT FORMAT***
    # {{ ctx.output_format }}
    
    # ***VALIDATION RULES***
    # - Set action_needed to true if and only if there is a request for Sid's calendar *AND* Ashley needs to take action.
    # - If action_needed is false, set request_type to "SuggestTime" and all other fields can be empty strings
    # - If action_needed is true, closely examine the request to determine the request type. 
    #   * If and only if no timing constraints are mentioned and Ashley is being asked to suggest times on Sid's calendar, request_type should be SuggestTime.
    #   * If time slots are mentioned and Ashley is being asked to check if a time works, request_type should be DoesTimeWork.
    #   * If time slots are mentioned and Ashley is being asked to book a time, request_type should be BookTime.
    # - If action_needed is true, timerange_start and timerange_end are required. timerange_start is the earliest time the meeting can start, and timerange_end is the latest time the meeting can end. Fill in the other fields based on request_type:
    #   * DoesTimeWork: time_slots_requested, meeting_duration are required
    #   * SuggestTime: all fields are required
    #   * BookTime: all fields are required
    # - All times in time_slots_requested, timerange_start, timerange_end MUST be in YYYY-mm-dd hh:mm format and in pacific time zone
    # - All dates in date_of_request MUST be in YYYY-mm-dd format and in pacific time zone
    # - All meeting durations MUST be in the format of "X minutes"
    # - Participants MUST be email addresses, MUST NOT include Sid (sid.mathur@gmail.com)
    # - Executive_assistants MUST be email addresses,MUST NOT include Ashley (ashley.sidsai@gmail.com)
    # - Silent Observers MUST be email addresses, MUST NOT be included in participants or executive_assistants
    # - All email lists (participants, executive_assistants, silent_observers) MUST be comma-separated WITHOUT spaces (e.g., "email1@domain.com,email2@domain.com")
    #
    # Here is the full conversation thread:
    # 
    # {{email_thread}}
    "#
} 

test calendar_intents {
  // run through all the test cases in test-cases.json
  functions [ExtractCalendarIntent]
  args {
    email_thread #"
From: john@example.com
To: sid.mathur@gmail.com
Cc: ashley.sidsai@gmail.com
Date: 2025-07-29 10:00:00
Subject: Meeting Request
Content: Hi Sid,

I'm Gus's EA and want to book tine wiit Sid. Please book sometime on both Mon and Wed next week at 3pm for 30 mins? I'd like to discuss the Q4 project updates.

Thanks,
John
    "#
  }
}