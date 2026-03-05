const { test, expect } = require('@playwright/test');

test('verify side-by-side layout at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto('http://localhost:3000/hxbingo');

  // Click "+" button 3 times to get 4 boards total
  for (let i = 0; i < 3; i++) {
    await page.click('button[title="Add New Board"]');
  }

  // Wait a bit for layout to settle
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '/home/jules/verification/side_by_side_1440.png', fullPage: true });
});
