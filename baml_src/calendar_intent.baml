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
    # Any meeting request should include meeting participants. If the participant is not clear, assume the sender of the mail is the participant. 
    # The meeting request thread may also include EAs (executive assistants). Do your best to distinguish EAs from the participants. EAs do not need to be invited to meetings, but they will help confirm meeting times for their participants. 
    # 
    # ***BE DELIBERATE AND THOUGHTFUL WHILE INTERPRETING TIMES***
    # Treat all dates in pacific time zone, unless otherwise specified. If another time zone is specified, convert all mentions of dates to pacific time zone before procceding. Your responses should only contain pacific time zone.
    # The working week starts Monday and ends Friday. Today falls into the current week. Next week starts on the following Monday. 
    # Be aware of the date the meeting request was made since it will help you understand the context of the meeting request. (eg) "next week" is relative to the date the meeting request was made.
    #
    # ***OUTPUT FORMAT***
    # {{ ctx.output_format }}
    
    # ***VALIDATION RULES***
    # - Set action_needed to true if and only if there is a request for Sid's calendar *AND* Ashley needs to take action.
    # - If action_needed is false, set request_type to "SuggestTime" and all other fields can be empty strings
    # - If action_needed is true, closely examine the request to determine the request type. 
    #   * If no time slots are mentioned, request_type should be SuggestTime.
    #   * If time slots are mentioned and Ashley is being asked to check if a time works, request_type should be DoesTimeWork.
    #   * If time slots are mentioned and Ashley is being asked to book a time, request_type should be BookTime.
    # - If action_needed is true, timerange_start and timerange_end are required. Fill in the other fields based on request_type:
    #   * DoesTimeWork: time_slots_requested, meeting_duration are required
    #   * SuggestTime: all others fields are optional
    #   * BookTime: all fields are required
    # - All dates MUST be in YYYY-mm-dd hh:mm format and in pacific time zone
    # - Participants MUST be email addresses, MUST NOT include Sid (sid.mathur@gmail.com)
    # - Executive_assistants MUST be email addresses,MUST NOT include Ashley (ashley.sidsai@gmail.com)
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