#!/bin/bash

# Test script for CMO Direct Mail functionality

echo "🧪 Testing CMO Direct Mail Functionality"
echo "========================================"
echo ""

# Set V2 mode
export CMO_MODE=v2
echo "✅ Set CMO_MODE=v2"
echo ""

# Test queries
echo "📝 Test Queries:"
echo ""

# Query 1: Basic direct mail
echo "1. Basic direct mail query:"
curl -X POST http://localhost:3456/api/chat/intelligent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need help with direct mail campaigns for my travel agency",
    "conversationId": "test-dm-1",
    "mode": "cmo",
    "subMode": "direct_mail"
  }' | jq '.response' | head -20

echo ""
echo "---"
echo ""

# Query 2: Cost question
echo "2. Cost-specific query:"
curl -X POST http://localhost:3456/api/chat/intelligent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What does postcard marketing cost for travel agents?",
    "conversationId": "test-dm-2",
    "mode": "cmo"
  }' | jq '.response' | head -20

echo ""
echo "---"
echo ""

# Query 3: ROI question
echo "3. ROI query:"
curl -X POST http://localhost:3456/api/chat/intelligent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What ROI can I expect from direct mail for cruise promotions?",
    "conversationId": "test-dm-3",
    "mode": "cmo"
  }' | jq '.response' | head -20

echo ""
echo "========================================"
echo "✅ Test complete!"
echo ""
echo "Look for:"
echo "- Travel-specific metrics (5.1% response rate)"
echo "- Booking values ($2,800-$4,500)"
echo "- NO generic 'DMA Statistics'"
echo ""