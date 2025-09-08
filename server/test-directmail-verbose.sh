#!/bin/bash

# Verbose test script for direct mail fix
echo "🧪 Testing Direct Mail Fix (Verbose)"
echo "===================================="
echo ""

# Test with full response output
echo "Test: Postcard campaign query"
echo "-----------------------------"
echo ""

response=$(curl -s -X POST http://localhost:3001/api/chat/intelligent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you help me with my postcard campaign for travel packages?",
    "mode": "cmo",
    "subMode": "direct_mail"
  }')

echo "Full Response:"
echo "$response" | python3 -m json.tool

echo ""
echo "Checking response content..."
echo ""

# Check if response contains travel-specific content
if echo "$response" | grep -q -i "travel\|vacation\|cruise\|destination\|tourist"; then
  echo "✅ Response contains travel-specific content"
else
  echo "❌ Response does NOT contain travel-specific content"
fi

# Check if response is just an echo
if echo "$response" | grep -q "Can you help me with my postcard campaign"; then
  echo "❌ WARNING: Response appears to be echoing the question"
else
  echo "✅ Response is not just an echo"
fi

# Check confidence
confidence=$(echo "$response" | python3 -c "import json, sys; data=json.load(sys.stdin); print(data.get('confidence', 'N/A'))" 2>/dev/null || echo "N/A")
echo "Confidence: $confidence"

# Check mode/subMode
mode=$(echo "$response" | python3 -c "import json, sys; data=json.load(sys.stdin); print(data.get('mode', 'N/A'))" 2>/dev/null || echo "N/A")
subMode=$(echo "$response" | python3 -c "import json, sys; data=json.load(sys.stdin); print(data.get('subMode', 'N/A'))" 2>/dev/null || echo "N/A")
echo "Mode: $mode, SubMode: $subMode"

echo ""
echo "✅ Test complete. Check server logs for pipeline execution details."