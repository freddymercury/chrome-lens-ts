#!/bin/bash
# E2E Test Runner Script

echo "Starting E2E Tests..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Chrome is available
if ! command -v google-chrome &> /dev/null && ! command -v chromium &> /dev/null && ! [ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
    echo -e "${RED}Error: Chrome/Chromium not found${NC}"
    echo "Please install Chrome or set CHROME_PATH environment variable"
    exit 1
fi

# Start test server
echo -e "${YELLOW}Starting test server...${NC}"
npm run test:server &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Check if server is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${RED}Error: Test server failed to start${NC}"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}Test server started on port 3001${NC}"

# Run E2E tests
echo -e "${YELLOW}Running E2E tests...${NC}"
npm run test:e2e

# Capture test result
TEST_RESULT=$?

# Cleanup
echo -e "${YELLOW}Cleaning up...${NC}"
kill $SERVER_PID 2>/dev/null

# Exit with test result
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}E2E tests passed!${NC}"
else
    echo -e "${RED}E2E tests failed!${NC}"
fi

exit $TEST_RESULT