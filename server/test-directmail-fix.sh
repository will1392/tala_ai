#!/bin/bash

# Quick test script for direct mail fix
echo "🧪 Testing Direct Mail Fix"
echo "=========================="
echo ""

# Test 1: Direct mail with subMode
echo "Test 1: Postcard campaign query with subMode"
echo "--------------------------------------------"
curl -s -X POST http://localhost:3001/api/chat/intelligent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you help me with my postcard campaign for travel packages?",
    "mode": "cmo",
    "subMode": "direct_mail"
  }' | python3 -m json.tool | head -20

echo ""
echo ""

# Test 2: Direct mail without subMode (should detect from message)
echo "Test 2: Direct mail query without subMode"
echo "-----------------------------------------"
curl -s -X POST http://localhost:3001/api/chat/intelligent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need help with direct mail marketing for my cruise packages",
    "mode": "cmo"
  }' | python3 -m json.tool | head -20

echo ""
echo ""

# Test 3: Budget question
echo "Test 3: Direct mail budget question"
echo "-----------------------------------"
curl -s -X POST http://localhost:3001/api/chat/intelligent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What ROI can I expect from a $5000 postcard campaign?",
    "mode": "cmo",
    "subMode": "direct_mail"
  }' | python3 -m json.tool | head -20

echo ""
echo "✅ Tests complete. Check server logs for detailed execution info."