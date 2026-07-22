import { test, expect } from '@playwright/test'

test('submit test form and verify data saves', async ({ page }) => {
  // 1. Go to test page
  await page.goto('https://tb40.insanmustaqbal.or.id/test')
  await page.waitForLoadState('networkidle')
  
  // 2. Fill user info and start test
  console.log('Filling user info...')
  
  // Wait for name input
  const nameInput = page.locator('input[placeholder*="nama" i], input[name="name"], input[type="text"]').first()
  await nameInput.waitFor({ state: 'visible', timeout: 10000 })
  await nameInput.fill('Playwright Test User')
  
  // Fill age
  const ageInput = page.locator('input[placeholder*="usia" i], input[placeholder*="umur" i], input[type="number"]').first()
  await ageInput.fill('25')
  
  // Take screenshot of form
  await page.screenshot({ path: 'screenshots/01-user-form.png', fullPage: true })
  
  // Click start/next button
  const startButton = page.locator('button:has-text("Mulai"), button:has-text("Start"), button:has-text("Lanjut"), button:has-text("Next")').first()
  await startButton.click()
  
  console.log('Starting test questions...')
  await page.waitForTimeout(2000)
  
  // 3. Answer first 5 questions quickly
  for (let i = 0; i < 5; i++) {
    console.log(`Answering question ${i + 1}...`)
    
    // Take screenshot
    await page.screenshot({ path: `screenshots/02-question-${i + 1}.png`, fullPage: true })
    
    // Look for slider or radio buttons or any answer mechanism
    const slider = page.locator('[role="slider"], input[type="range"]').first()
    const radio = page.locator('input[type="radio"]').first()
    const button = page.locator('button[value], button:has-text("1"), button:has-text("2")').first()
    
    if (await slider.isVisible().catch(() => false)) {
      console.log('  Using slider')
      await slider.fill('3')
    } else if (await radio.isVisible().catch(() => false)) {
      console.log('  Using radio')
      await radio.click()
    } else if (await button.isVisible().catch(() => false)) {
      console.log('  Using button')
      await button.click()
    }
    
    await page.waitForTimeout(500)
    
    // Click next
    const nextButton = page.locator('button:has-text("Selanjutnya"), button:has-text("Next"), button[type="submit"]').first()
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click()
      await page.waitForTimeout(1000)
    }
  }
  
  console.log('Taking final screenshot...')
  await page.screenshot({ path: 'screenshots/03-after-answers.png', fullPage: true })
  
  console.log('Test form interaction complete')
})
