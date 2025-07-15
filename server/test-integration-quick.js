// Quick test to verify email-to-task integration
import axios from 'axios';

async function quickTest() {
    try {
        console.log('Testing Email-to-Task API Integration...\n');
        
        // Check if email-tasks endpoints are available
        const response = await axios.get('http://localhost:3001/api/email-tasks/actions', {
            headers: {
                'x-user-id': 'test_user_123'
            }
        });
        
        console.log('✅ Email-to-Task API is working!');
        console.log(`Available actions: ${response.data.actions.length}`);
        
        // List the actions
        console.log('\nAvailable Email Actions:');
        response.data.actions.forEach(action => {
            console.log(`  ${action.icon} ${action.name} (${action.id})`);
        });
        
    } catch (error) {
        if (error.response?.status === 404) {
            console.error('❌ Email-to-Task API not found.');
            console.error('\nDid you:');
            console.error('1. Add the routes to server.js?');
            console.error('2. Restart the server?');
            console.error('\nCheck INTEGRATION_INSTRUCTIONS.md for help.');
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

quickTest();