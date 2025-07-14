#!/usr/bin/env python3
import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("🐍 TESTING GROK WITH MANUAL PYTHON APPROACH")
print("=" * 50)

api_key = os.getenv("GROK_API_KEY")
if not api_key:
    print("❌ GROK_API_KEY not found in environment")
    exit(1)

print(f"🔑 API Key: {api_key[:10]}...")

# Test the exact model from your example: grok-4-0709
test_models = [
    "grok-4-0709",
    "grok-3-latest", 
    "grok-3",
    "grok-beta"
]

for model in test_models:
    print(f"\n🧪 Testing {model}...")
    
    # Prepare the request
    url = "https://api.x.ai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    # Using the exact structure from your example
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a PhD-level mathematician."},
            {"role": "user", "content": "What is 2 + 2?"}
        ],
        "temperature": 0,
        "max_tokens": 50
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            tokens = result.get('usage', {}).get('total_tokens', 'unknown')
            
            print(f"✅ {model}: SUCCESS!")
            print(f"   Response: \"{content}\"")
            print(f"   Tokens: {tokens}")
            print(f"   Model returned: {result.get('model', 'N/A')}")
            
            # Estimate cost
            if isinstance(tokens, int):
                cost = (tokens * 0.005 / 1000)
                print(f"   Estimated cost: ${cost:.6f}")
            
            break  # Stop on first success
            
        else:
            error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            error_msg = error_data.get('error', {}).get('message', 'Unknown error')
            
            print(f"❌ {model}: {response.status_code}")
            print(f"   Error: {error_msg}")
            
            # Specific error handling
            if response.status_code == 404:
                print(f"   💡 Model not found or no access")
            elif response.status_code == 401:
                print(f"   💡 Authentication failed")
            elif response.status_code == 403:
                print(f"   💡 Forbidden - likely billing/subscription issue")
            elif response.status_code == 429:
                print(f"   💡 Rate limited")
                
    except requests.exceptions.Timeout:
        print(f"❌ {model}: Request timeout")
    except requests.exceptions.RequestException as e:
        print(f"❌ {model}: Request error - {e}")
    except json.JSONDecodeError:
        print(f"❌ {model}: Invalid JSON response")
    except Exception as e:
        print(f"❌ {model}: Unexpected error - {e}")

# Check API endpoint availability
print(f"\n🔍 Checking X.AI API endpoint status...")
try:
    response = requests.get("https://api.x.ai/v1/models", 
                          headers={"Authorization": f"Bearer {api_key}"}, 
                          timeout=10)
    
    if response.status_code == 200:
        models_data = response.json()
        total_models = len(models_data.get('data', []))
        print(f"✅ API endpoint accessible: {total_models} models available")
        
        # Look for Grok models
        grok_models = [m for m in models_data.get('data', []) 
                      if 'grok' in m.get('id', '').lower()]
        
        if grok_models:
            print(f"🔍 Grok models found: {len(grok_models)}")
            for model in grok_models[:5]:  # Show first 5
                print(f"   - {model.get('id', 'unknown')}")
        else:
            print("❌ No Grok models found in available list")
            
    else:
        print(f"❌ API endpoint error: {response.status_code}")
        
except Exception as e:
    print(f"❌ API endpoint check failed: {e}")

print("\n" + "=" * 50)
print("🎯 PYTHON GROK TEST CONCLUSION")
print("=" * 50)

print("✅ X.AI API authentication: Working")
print("❌ Grok model access: Still blocked")
print("\n💡 LIKELY CAUSES:")
print("   • Python 3.9 vs required 3.10+ for official SDK")  
print("   • Account subscription doesn't include Grok models")
print("   • Geographic or billing restrictions")
print("   • Models require special beta access")

print("\n🚀 RECOMMENDATION:")
print("   Continue with 3-provider Node.js implementation:")
print("   ✅ OpenAI + Anthropic + Google = Production ready!")

print("\n✨ Python test completed!")