# Ashley Calendar AI - Test Harness

A comprehensive test harness for an OpenAI Assistant that performs calendar intent extraction using BAML (Boundary ML). This project validates that the AI assistant can correctly parse natural language calendar requests and extract structured data.

## Overview

This test harness validates an OpenAI Assistant that:
- Receives natural language prompts (e.g., "Can we meet Friday at 3?")
- Extracts structured calendar intent using BAML
- Returns JSON matching a specific schema
- Handles various calendar request types (booking, availability checks, cancellations, etc.)

## Features

- **BAML Integration**: Uses Boundary ML for type-safe AI model interactions
- **Comprehensive Testing**: 10 test cases covering various calendar scenarios
- **Schema Validation**: Ensures responses match the expected JSON structure
- **Jest Integration**: Full test suite with coverage reporting
- **TypeScript**: Modern TypeScript with strict type checking
- **CI-Ready**: Modular design suitable for continuous integration

## Project Structure

```
├── models/
│   └── calendar_intent.baml      # BAML model definition
├── src/
│   ├── types.ts                  # TypeScript type definitions
│   ├── validator.ts              # Response validation logic
│   ├── baml-client.ts            # BAML client wrapper
│   └── run-test.ts               # Main test runner
├── __tests__/
│   └── agent.test.ts             # Jest test suite
├── test-cases.json               # Test cases with expected outputs
├── baml.config.json              # BAML configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── env.example                   # Environment variables template
```

## Schema

The assistant returns structured JSON matching this schema:

```json
{
  "action_needed": true,
  "request_type": "book_time",
  "participants": "abc@example.com",
  "time_slots_requested": "Friday at 3pm",
  "meeting_duration": "30 mins",
  "timerange_start": "2025-08-01T15:00:00-07:00",
  "timerange_end": "2025-08-01T15:30:00-07:00",
  "other_context": "..."
}
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ashley-calendar-ai-test-harness
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   BAML_API_KEY=your_baml_api_key_here
   NODE_ENV=development
   LOG_LEVEL=info
   ```

4. **Install BAML CLI** (if not already installed)
   ```bash
   npm install -g @boundaryml/baml
   ```

5. **Generate BAML client code**
   ```bash
   npm run generate
   ```

## Usage

### Running Tests

**Run the main test harness:**
```bash
npm run run-test
```

**Run Jest tests:**
```bash
npm test
```

**Run tests with coverage:**
```bash
npm run test:coverage
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

### Development

**Start BAML development server:**
```bash
npm run dev
```

**Build TypeScript:**
```bash
npm run build
```

**Lint code:**
```bash
npm run lint
```

**Fix linting issues:**
```bash
npm run lint:fix
```

## Test Cases

The test suite includes 10 comprehensive test cases:

1. **Basic meeting request**: "Can we meet Friday at 3?"
2. **Multi-participant meeting**: Scheduling with multiple email addresses
3. **Availability check**: "Are you available tomorrow morning?"
4. **Meeting cancellation**: Canceling existing meetings
5. **Rescheduling**: Moving existing meetings
6. **Non-calendar message**: Messages that don't require calendar action
7. **Short duration meeting**: 15-minute calls
8. **Meeting updates**: Updating meeting details
9. **General availability**: Week-long availability checks
10. **Complex meeting**: Multi-hour meetings with context

## Configuration

### BAML Configuration (`baml.config.json`)

```json
{
  "version": "v1",
  "providers": {
    "openai": {
      "type": "openai",
      "api_key": "${OPENAI_API_KEY}",
      "model": "gpt-4o-mini"
    }
  },
  "default_provider": "openai"
}
```

### TypeScript Configuration

The project uses strict TypeScript configuration with:
- ES2020 target
- CommonJS modules
- Strict type checking
- Source maps for debugging
- Declaration files for type safety

## Validation

The test harness validates:

1. **Schema Compliance**: All required fields are present with correct types
2. **Data Accuracy**: Extracted values match expected results
3. **Edge Cases**: Empty inputs, malformed data, long inputs
4. **Performance**: Response times within acceptable limits
5. **Error Handling**: Graceful handling of unexpected inputs

## Continuous Integration

The project is designed for CI/CD with:

- **Exit Codes**: Tests exit with appropriate codes (0 for success, 1 for failure)
- **Coverage Reporting**: Jest coverage reports for code quality
- **Type Safety**: TypeScript compilation ensures type safety
- **Linting**: ESLint configuration for code quality
- **Modular Design**: Separate modules for easy testing and maintenance

## Troubleshooting

### Common Issues

1. **BAML not found**: Run `npm run generate` to generate BAML client code
2. **API key errors**: Ensure your `.env` file has valid API keys
3. **Type errors**: Run `npm run build` to check TypeScript compilation
4. **Test failures**: Check the detailed output for specific validation errors

### Debug Mode

For detailed debugging, set `LOG_LEVEL=debug` in your `.env` file.

## Contributing

1. Add new test cases to `test-cases.json`
2. Update the BAML model in `models/calendar_intent.baml` if needed
3. Run tests to ensure everything passes
4. Update documentation as needed

## License

This project is for personal use and calendar management automation. 