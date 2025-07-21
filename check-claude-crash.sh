#!/bin/bash
# Save as: check-claude-crash.sh

echo "=== Checking Claude Code Crash Recovery ==="

echo -e "\n📝 Recently modified files:"
find . -type f -name "*.js" -o -name "*.json" -mmin -60 | head -20

echo -e "\n📊 Git status:"
git status --short

echo -e "\n🔄 Running Node processes:"
ps aux | grep node | grep -v grep

echo -e "\n📄 Last 20 shell commands:"
history | tail -20

echo -e "\n💾 Temp files:"
ls -la /tmp/*claude* 2>/dev/null || echo "No Claude temp files found"

echo -e "\n🕒 Files changed in last hour:"
find . -type f -mmin -60 -exec ls -la {} \; 2>/dev/null | head -10