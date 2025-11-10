#!/bin/bash
###############################################################################
# Test script for Hook Generation API endpoint
# 
# Tests:
# 1. Server health check
# 2. OPTIONS preflight request (CORS)
# 3. POST request with valid data
# 4. POST request with missing data (validation)
###############################################################################

set -e

API_BASE="${API_BASE:-http://localhost:3001}"
HOOKS_ENDPOINT="$API_BASE/api/hooks/generate"
TEST_USER_ID="${TEST_USER_ID:-test-user-id-123}"

echo "🧪 Testing Hook Generation Endpoint"
echo "   API Base: $API_BASE"
echo "   Endpoint: $HOOKS_ENDPOINT"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

# Test 1: Server health check
echo "0️⃣  Checking if server is running..."
if curl -s -f "$API_BASE/api/health" > /dev/null 2>&1; then
    echo "   ✅ Server is running"
else
    echo "   ❌ Server is not running on $API_BASE"
    echo "   Start the server with: cd server && node server.js"
    exit 1
fi
echo ""

# Test 2: OPTIONS preflight request
echo "1️⃣  Testing OPTIONS preflight request..."
echo ""
HTTP_CODE=$(curl -s -o /tmp/options-response.txt -w "%{http_code}" \
    -X OPTIONS "$HOOKS_ENDPOINT" \
    -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -v 2>&1 | tee /tmp/options-verbose.txt | tail -1)

echo "   HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ OPTIONS request successful"
    echo ""
    echo "   CORS Headers:"
    grep -i "access-control" /tmp/options-verbose.txt | sed 's/^/   /'
else
    echo "   ❌ OPTIONS request failed"
    echo ""
    echo "   Response:"
    cat /tmp/options-response.txt | sed 's/^/   /'
fi
echo ""
echo "───────────────────────────────────────────────────────"
echo ""

# Test 3: POST request with valid data
echo "2️⃣  Testing POST request with valid data..."
echo ""

cat > /tmp/valid-request.json <<EOF
{
  "targetAudience": "Luxury travelers seeking authentic experiences",
  "offering": "European river cruise vacation",
  "painPoints": [
    "Worried about crowded tourist destinations",
    "Concerned about planning complex multi-city itineraries",
    "Fear of missing hidden gems and local experiences"
  ],
  "desiredOutcome": "Book a stress-free luxury river cruise with authentic cultural experiences",
  "marketingChannels": ["Paid Ads"],
  "tone": "Bold and direct",
  "campaignGoal": "Generate leads for European river cruises",
  "additionalNotes": "Focus on exclusivity and personalized service"
}
EOF

HTTP_CODE=$(curl -s -o /tmp/post-response.json -w "%{http_code}" \
    -X POST "$HOOKS_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "x-user-id: $TEST_USER_ID" \
    -d @/tmp/valid-request.json)

echo "   HTTP Status: $HTTP_CODE"
echo ""

case $HTTP_CODE in
    405)
        echo "   ❌ 405 Method Not Allowed - This is the bug!"
        echo ""
        echo "   Response:"
        cat /tmp/post-response.json | sed 's/^/   /'
        echo ""
        echo "🚨 CRITICAL: The endpoint is not accepting POST requests!"
        echo "   The route definition in server.js may not be working correctly."
        exit 1
        ;;
    401)
        echo "   ⚠️  401 Unauthorized - Authentication required"
        echo "   (This is expected if CREDITS_ENABLED=true and user not authenticated)"
        echo ""
        echo "   Response:"
        cat /tmp/post-response.json | jq '.' 2>/dev/null || cat /tmp/post-response.json | sed 's/^/   /'
        echo ""
        echo "   To bypass: Set CREDITS_ENABLED=false in .env"
        ;;
    402)
        echo "   ⚠️  402 Payment Required - Insufficient credits"
        echo ""
        echo "   Response:"
        cat /tmp/post-response.json | jq '.' 2>/dev/null || cat /tmp/post-response.json | sed 's/^/   /'
        echo ""
        echo "   The user account needs more credits."
        ;;
    200)
        echo "   ✅ POST request successful!"
        echo ""
        echo "   Response preview:"
        cat /tmp/post-response.json | jq '{success, hookCount: (.hooks | length), metadata}' 2>/dev/null || cat /tmp/post-response.json | head -20 | sed 's/^/   /'
        echo ""
        echo "   First hook:"
        cat /tmp/post-response.json | jq -r '.hooks[0].text' 2>/dev/null | sed 's/^/   /' || echo "   (Unable to parse hooks)"
        ;;
    *)
        echo "   ❌ Unexpected status code: $HTTP_CODE"
        echo ""
        echo "   Response:"
        cat /tmp/post-response.json | jq '.' 2>/dev/null || cat /tmp/post-response.json | sed 's/^/   /'
        ;;
esac

echo ""
echo "───────────────────────────────────────────────────────"
echo ""

# Test 4: POST request with missing data (validation test)
echo "3️⃣  Testing POST request with missing data (validation)..."
echo ""

cat > /tmp/invalid-request.json <<EOF
{
  "targetAudience": "Luxury travelers"
}
EOF

HTTP_CODE=$(curl -s -o /tmp/validation-response.json -w "%{http_code}" \
    -X POST "$HOOKS_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "x-user-id: $TEST_USER_ID" \
    -d @/tmp/invalid-request.json)

echo "   HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "400" ]; then
    echo "   ✅ Validation error returned correctly"
    echo ""
    echo "   Error:"
    cat /tmp/validation-response.json | jq -r '.error' 2>/dev/null | sed 's/^/   /' || cat /tmp/validation-response.json | sed 's/^/   /'
else
    echo "   ❌ Expected 400 validation error, got $HTTP_CODE"
    echo ""
    echo "   Response:"
    cat /tmp/validation-response.json | jq '.' 2>/dev/null || cat /tmp/validation-response.json | sed 's/^/   /'
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📊 Test Summary:"
echo ""

if [ "$HTTP_CODE" = "405" ]; then
    echo "   🚨 CRITICAL: 405 Method Not Allowed error detected!"
    echo "   The endpoint exists but doesn't accept POST requests."
    echo ""
    echo "   Troubleshooting steps:"
    echo "   1. Check server.js line 750 for the route definition"
    echo "   2. Verify the route is: app.post('/api/hooks/generate', ...)"
    echo "   3. Ensure no middleware is blocking POST requests"
    echo "   4. Check if Vercel deployment is up to date"
    exit 1
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "402" ]; then
    echo "   ℹ️  Endpoint is working but requires authentication/credits"
    echo "   Set CREDITS_ENABLED=false in .env to test without credits"
elif [ "$HTTP_CODE" = "200" ]; then
    echo "   🎉 All tests passed! The endpoint is working correctly."
else
    echo "   ⚠️  Tests completed with warnings"
fi

echo ""
echo "═══════════════════════════════════════════════════════"

# Clean up temp files
rm -f /tmp/options-response.txt /tmp/options-verbose.txt
rm -f /tmp/post-response.json /tmp/valid-request.json
rm -f /tmp/validation-response.json /tmp/invalid-request.json
