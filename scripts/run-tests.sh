#!/bin/bash

# Future-proof test runner that auto-discovers test-*.ts files
# This will automatically run any new test files without needing to update package.json

echo "🔍 Discovering test files..."
# Exclude smoke tests from full test run - they're meant for quick validation only
test_files=$(find . -name 'test-*.ts' -not -path './node_modules/*' -not -path './dist/*' -not -path './.git/*' | grep -v test-smoke.ts)

if [ -z "$test_files" ]; then
    echo "❌ No test files found matching pattern 'test-*.ts'"
    exit 1
fi

echo "📋 Found test files:"
echo "$test_files"
echo ""

# Run each test file
exit_code=0
for test_file in $test_files; do
    echo "🧪 Running: $test_file"
    if ts-node "$test_file"; then
        echo "✅ Passed: $test_file"
    else
        echo "❌ Failed: $test_file"
        exit_code=1
    fi
    echo ""
done

if [ $exit_code -eq 0 ]; then
    echo "🎉 All tests passed!"
else
    echo "💥 Some tests failed!"
fi

exit $exit_code