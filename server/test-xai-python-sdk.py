#!/usr/bin/env python3
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("🐍 TESTING X.AI PYTHON SDK")
print("=" * 50)

# Try the official x-ai package
print("📦 Testing with x-ai package...")
try:
    from x_ai import Client
    print("✅ x-ai package imported successfully")
    
    client = Client(
        api_host="api.x.ai",
        api_key=os.getenv("GROK_API_KEY")
    )
    
    print("🧪 Testing grok-4-0709...")
    chat = client.chat.create(model="grok-4-0709", temperature=0)
    chat.append({"role": "system", "content": "You are a PhD-level mathematician."})
    chat.append({"role": "user", "content": "What is 2 + 2?"})
    
    response = chat.sample()
    print(f"✅ SUCCESS: {response.content}")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")

# Try alternative import patterns
print("\n🔍 Trying alternative SDK imports...")

try:
    import x_ai
    print("✅ x_ai module available")
    print(f"   Available attributes: {dir(x_ai)}")
except ImportError:
    print("❌ x_ai not available")

# Try the exact pattern from your example
print("\n🎯 Trying exact pattern from your example...")
try:
    from xai_sdk import Client
    from xai_sdk.chat import user, system
    print("✅ xai_sdk imported successfully")
    
    client = Client(
        api_host="api.x.ai",
        api_key=os.getenv("GROK_API_KEY")
    )
    
    chat = client.chat.create(model="grok-4-0709", temperature=0)
    chat.append(system("You are a PhD-level mathematician."))
    chat.append(user("What is 2 + 2?"))
    
    response = chat.sample()
    print(f"✅ SUCCESS: {response.content}")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("   This suggests the package name might be different")
except Exception as e:
    print(f"❌ Error: {e}")

# Check what we actually installed
print("\n📋 Checking installed package...")
try:
    import pkg_resources
    installed_packages = [pkg.project_name for pkg in pkg_resources.working_set]
    xai_packages = [pkg for pkg in installed_packages if 'ai' in pkg.lower()]
    print(f"AI-related packages found: {xai_packages}")
except:
    pass

print("\n✨ X.AI SDK test completed!")