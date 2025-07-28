# Ashley Calendar AI

An intelligent calendar assistant built with n8n that automatically manages email-based meeting requests and calendar scheduling.

## Overview

Ashley is an AI-powered calendar assistant that:
- Monitors Gmail for incoming meeting requests
- Analyzes emails using AI to determine if scheduling is needed
- Checks calendar availability and suggests optimal meeting times
- Automatically books meetings when appropriate
- Responds to users with professional, empathetic communication

## Features

- **Email Monitoring**: Automatically triggers on new Gmail messages
- **AI Analysis**: Uses OpenAI GPT-4 to understand meeting requests and context
- **Calendar Integration**: Connects to Google Calendar for availability checking
- **Smart Scheduling**: Suggests optimal meeting times based on availability
- **Professional Communication**: Responds with courtesy and empathy
- **Automatic Booking**: Books meetings when times are confirmed

## Workflow Components

1. **Gmail Trigger**: Monitors for new emails
2. **AI Agent**: Analyzes email content to determine if scheduling is needed
3. **Filter**: Routes only relevant scheduling requests
4. **Calendar Integration**: Checks availability and manages bookings
5. **Response System**: Sends professional replies to users

## Setup Requirements

- n8n instance
- Gmail OAuth2 credentials
- Google Calendar OAuth2 credentials
- OpenAI API credentials
- Proper email filtering configuration

## Configuration

The workflow requires the following credentials:
- Gmail OAuth2 for email monitoring
- Google Calendar OAuth2 for calendar access
- OpenAI API for AI analysis

## Usage

Once configured, Ashley will automatically:
1. Monitor incoming emails
2. Analyze meeting requests
3. Check calendar availability
4. Suggest or book meeting times
5. Respond to users professionally

## Files

- `MailArrived.json`: The main n8n workflow configuration

## License

This project is for personal use and calendar management automation. 