// Test script to verify Settings onboarding section
console.log('Testing Settings page onboarding section...\n');

// This test would run in the browser console
const testInstructions = `
To test if the Onboarding & Preferences section exists in Settings:

1. Open the app in your browser
2. Navigate to Settings
3. Make sure you're in the "Profile" section (first option in sidebar)
4. Open browser DevTools (F12)
5. Run this in the console:

// Find all h3 headings in the settings
const headings = document.querySelectorAll('h3');
console.log('Found headings:', Array.from(headings).map(h => h.textContent));

// Look for the specific section
const onboardingSection = Array.from(headings).find(h => h.textContent.includes('Onboarding & Preferences'));
if (onboardingSection) {
  console.log('✅ Onboarding section found!');
  // Scroll it into view
  onboardingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Highlight it
  onboardingSection.parentElement.style.border = '3px solid red';
  onboardingSection.parentElement.style.animation = 'pulse 2s infinite';
} else {
  console.log('❌ Onboarding section not found');
  // Check if we're on the Profile tab
  const activeSection = document.querySelector('.bg-primary\\/20.text-primary span')?.textContent;
  console.log('Active section:', activeSection);
}

// Count total GlassCard sections
const glassCards = document.querySelectorAll('.glass-card');
console.log('Total GlassCard sections:', glassCards.length);
`;

console.log(testInstructions);

// Expected structure in ProfileSettings:
console.log('\nExpected structure in ProfileSettings component:');
console.log('1. Personal Information (Name, Agency)');
console.log('2. Contact Information');
console.log('3. Agency Logo');
console.log('4. Onboarding & Preferences ← This should be visible');

console.log('\nPossible issues:');
console.log('- User needs to scroll down in the Profile settings');
console.log('- The section might be hidden due to container height constraints');
console.log('- User might be looking in wrong section (not Profile)');