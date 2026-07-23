import { test } from '@playwright/test'

test('submit test form and check analytics', async ({ page }) => {
  test.setTimeout(120000)
  
  console.log('1. Opening test form...')
  await page.goto('https://tb40.insanmustaqbal.or.id/test', { waitUntil: 'networkidle' })
  
  // Take screenshot of initial page
  await page.screenshot({ path: 'screenshots/01-initial.png', fullPage: true })
  
  // Wait and look for any form elements
  await page.waitForTimeout(3000)
  
  console.log('2. Looking for form elements...')
  const pageContent = await page.content()
  console.log('Page has form:', pageContent.includes('form') || pageContent.includes('input'))
  
  // Try to find and fill name
  const inputs = await page.locator('input[type="text"], input').all()
  console.log(`Found ${inputs.length} input elements`)
  
  if (inputs.length > 0) {
    console.log('3. Filling first input...')
    await inputs[0].fill('Test User')
    await page.screenshot({ path: 'screenshots/02-filled.png', fullPage: true })
  }
  
  // Look for buttons
  const buttons = await page.locator('button').all()
  console.log(`Found ${buttons.length} buttons`)
  
  if (buttons.length > 0) {
    console.log('4. Clicking first button...')
    await buttons[0].click()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/03-after-click.png', fullPage: true })
  }
  
  console.log('5. Checking console logs...')
  page.on('console', msg => console.log('BROWSER:', msg.text()))
  
  // Check network requests
  page.on('request', request => {
    if (request.url().includes('analytics') || request.url().includes('api')) {
      console.log('API REQUEST:', request.method(), request.url())
    }
  })
  
  page.on('response', response => {
    if (response.url().includes('analytics') || response.url().includes('api')) {
      console.log('API RESPONSE:', response.status(), response.url())
    }
  })
  
  await page.waitForTimeout(5000)
})
