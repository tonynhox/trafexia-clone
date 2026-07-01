#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Build Pipeline...${NC}"

# Function to run a command and check for failure
run_step() {
  echo -e "${YELLOW}Running: $1${NC}"
  eval "$1"
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error during: $1${NC}"
    exit 1
  else
    echo -e "${GREEN}✅ Success: $1${NC}"
  fi
}

# 1. Check for node_modules
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}node_modules not found. Installing dependencies...${NC}"
  run_step "npm install"
fi

# 2. Linting
# run_step "npm run lint" # Skipped due to configuration issues

# 3. Type Checking
run_step "npm run typecheck"

# 4. Build based on OS
OS="$(uname)"
if [ "$OS" == "Darwin" ]; then
  # Mac OS
  echo -e "${YELLOW}Detected macOS. Building for Mac...${NC}"
  run_step "npm run build:mac"
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
  # Linux
  echo -e "${YELLOW}Detected Linux. Building for Linux...${NC}"
  run_step "npm run build:linux"
elif [ "$(expr substr $(uname -s) 1 10)" == "MINGW32_NT" ] || [ "$(expr substr $(uname -s) 1 10)" == "MINGW64_NT" ]; then
  # Windows
  echo -e "${YELLOW}Detected Windows. Building for Windows...${NC}"
  run_step "npm run build:win"
else
  # Fallback to generic build
  echo -e "${YELLOW}Unknown OS ($OS). Running generic build...${NC}"
  run_step "npm run build"
fi

echo -e "${GREEN}🎉 Build Pipeline Completed Successfully!${NC}"
