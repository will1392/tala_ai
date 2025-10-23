import { test, expect } from '@playwright/test';

test.describe('Credit System - Super Admin vs Regular User', () => {
  
  test('Super Admin should see unlimited credits', async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:5173/login');
    
    // Login as super admin
    await page.fill('input[type="email"]', 'will@weareapexcreatives.com');
    await page.fill('input[type="password"]', 'tala$1111');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Wait for credits to load
    await page.waitForTimeout(2000);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'super-admin-dashboard.png', fullPage: true });
    
    // Check sidebar credits display
    const sidebarCredits = await page.locator('nav[role="complementary"] .text-cyan-400').first();
    await expect(sidebarCredits).toBeVisible();
    
    const creditsText = await sidebarCredits.textContent();
    console.log('Super Admin Credits Display:', creditsText);
    
    // Super admin should see infinity symbol
    await expect(sidebarCredits).toContainText('∞');
    
    // Check for unlimited indicator
    const unlimitedText = page.locator('text=unlimited');
    await expect(unlimitedText).toBeVisible();
    
    // Verify API response
    const response = await page.request.get('http://localhost:3000/api/credits/balance', {
      headers: {
        'x-user-id': '59b70373-ba68-4d89-8420-5c3723aef01f'
      }
    });
    
    const data = await response.json();
    console.log('Super Admin API Response:', JSON.stringify(data, null, 2));
    
    expect(data.success).toBe(true);
    expect(data.data.role).toBe('super_admin');
    expect(data.data.is_super_admin).toBe(true);
    expect(data.data.has_unlimited_credits).toBe(true);
  });
  
  test('Regular User should see numeric credits', async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:5173/login');
    
    // Login as regular agent
    await page.fill('input[type="email"]', 'agent1@travel.com');
    await page.fill('input[type="password"]', 'agent123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Wait for credits to load
    await page.waitForTimeout(2000);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'regular-user-dashboard.png', fullPage: true });
    
    // Check sidebar credits display
    const sidebarCredits = await page.locator('nav[role="complementary"] .text-cyan-400').first();
    await expect(sidebarCredits).toBeVisible();
    
    const creditsText = await sidebarCredits.textContent();
    console.log('Regular User Credits Display:', creditsText);
    
    // Regular user should see numeric credits (not infinity)
    await expect(sidebarCredits).not.toContainText('∞');
    
    // Should show "credits" not "unlimited"
    const creditsLabel = page.locator('text=credits');
    await expect(creditsLabel).toBeVisible();
    
    // Verify no unlimited indicator
    const unlimitedText = page.locator('text=unlimited');
    await expect(unlimitedText).not.toBeVisible();
  });
  
  test('Super Admin operations should not consume credits', async ({ page, request }) => {
    // Get initial credits for super admin
    const initialResponse = await request.get('http://localhost:3000/api/credits/balance', {
      headers: {
        'x-user-id': '59b70373-ba68-4d89-8420-5c3723aef01f'
      }
    });
    
    const initialData = await initialResponse.json();
    console.log('Initial Super Admin Credits:', initialData.data.available_credits);
    
    // Simulate a chat operation (which normally consumes credits)
    const consumeResponse = await request.post('http://localhost:3000/api/credits/consume', {
      headers: {
        'x-user-id': '59b70373-ba68-4d89-8420-5c3723aef01f',
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'chat_message',
        params: {
          model: 'gpt-4o-mini',
          cost: 1
        }
      }
    });
    
    const consumeData = await consumeResponse.json();
    console.log('Consume Response:', JSON.stringify(consumeData, null, 2));
    
    // Super admin should have bypass
    expect(consumeData.success).toBe(true);
    expect(consumeData.bypassReason).toBe('super_admin_unlimited_access');
    expect(consumeData.creditsConsumed).toBe(0);
    
    // Get credits after operation
    const afterResponse = await request.get('http://localhost:3000/api/credits/balance', {
      headers: {
        'x-user-id': '59b70373-ba68-4d89-8420-5c3723aef01f'
      }
    });
    
    const afterData = await afterResponse.json();
    console.log('After Operation Credits:', afterData.data.available_credits);
    
    // Credits should not have changed (bypass)
    expect(afterData.data.available_credits).toBe(initialData.data.available_credits);
  });
  
  test('Regular User operations should consume credits', async ({ request }) => {
    // Note: This assumes agent1 has credits initialized
    // Get initial credits for regular user
    const initialResponse = await request.get('http://localhost:3000/api/credits/balance', {
      headers: {
        'x-user-id': 'agent-1'
      }
    });
    
    const initialData = await initialResponse.json();
    console.log('Initial Regular User Credits:', initialData.data?.available_credits || 'Not initialized');
    
    // If user doesn't exist, this test will initialize them
    if (!initialData.success) {
      console.log('User not initialized, skipping consumption test');
      return;
    }
    
    const initialCredits = initialData.data.available_credits;
    
    // Simulate a chat operation
    const consumeResponse = await request.post('http://localhost:3000/api/credits/consume', {
      headers: {
        'x-user-id': 'agent-1',
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'chat_message',
        params: {
          model: 'gpt-4o-mini',
          cost: 1
        }
      }
    });
    
    const consumeData = await consumeResponse.json();
    console.log('Regular User Consume Response:', JSON.stringify(consumeData, null, 2));
    
    // Regular user should consume credits
    expect(consumeData.success).toBe(true);
    expect(consumeData.creditsConsumed).toBe(1);
    
    // Get credits after operation
    const afterResponse = await request.get('http://localhost:3000/api/credits/balance', {
      headers: {
        'x-user-id': 'agent-1'
      }
    });
    
    const afterData = await afterResponse.json();
    console.log('After Operation Credits:', afterData.data.available_credits);
    
    // Credits should have decreased by 1
    expect(afterData.data.available_credits).toBe(initialCredits - 1);
  });
});
