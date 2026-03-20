#!/bin/bash
set -o pipefail

APP_EXIT=0
API_EXIT=0

echo "=== APP TESTS ==="
bun run test:app
APP_EXIT=$?

echo ""
echo "=== API TESTS ==="
bun run test:api
API_EXIT=$?

echo ""
echo "================================"
echo "         TEST SUMMARY"
echo "================================"
if [ $APP_EXIT -eq 0 ]; then
  echo "  App tests:  PASS"
else
  echo "  App tests:  FAIL"
fi
if [ $API_EXIT -eq 0 ]; then
  echo "  API tests:  PASS"
else
  echo "  API tests:  FAIL"
fi
echo "================================"

if [ $APP_EXIT -ne 0 ] || [ $API_EXIT -ne 0 ]; then
  exit 1
fi
