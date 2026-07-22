import { test, expect } from "@playwright/test"

test.describe("Admin Dashboard Scenarios", () => {
  test.setTimeout(120000)
  test.use({ viewport: { width: 1280, height: 720 }, permissions: ['clipboard-read', 'clipboard-write'] })

  test("Scenario 8, 9, 11, 12: Org Test, Login, Monitor, Resume", async ({ page, context }) => {
    // We will do these scenarios sequentially to build state

    // 1. User starts a test for an Organization (Scenario 8)
    await page.goto("/")
    await expect(
      page.locator('text="Live Server Online"').or(page.locator('text="Sandbox Demo Mode"'))
    ).toBeVisible({ timeout: 10000 })

    const orgName = "TestOrg-" + Math.floor(Math.random() * 10000)
    
    await expect(async () => {
      await page.fill("#fullName", "Org Tester")
      await expect(page.locator('.flex-wrap button').first()).toBeVisible({ timeout: 1000 })
    }).toPass()
    await page.locator('.flex-wrap button').first().click()
    await page.fill("#age", "28")
    
    // Fill the Org Name field
    await page.fill("#orgName", orgName)
    
    await page.click('button:has-text("Metode Cepat (v0.2)")')
    await page.click('button[type="submit"]:has-text("Mulai Penilaian Bakat")')

    await expect(page).toHaveURL(/.*\/test/)
    await page.waitForTimeout(500)
    
    // Complete Tier 1 then abandon
    const slider = page.locator("#socialEnergySlider")
    const box = await slider.boundingBox()
    if (box) await page.mouse.click(box.x + box.width * 0.7, box.y + box.height / 2)
    await page.click('button:has-text("Simpan & Lanjut")')
    await page.waitForTimeout(1000)
    
    // At Tier 2. Now just leave the page (simulating unfinished test).
    
    // 2. Admin Login (Scenario 9)
    // Open admin dashboard in a new context
    const adminContext = await context.browser()?.newContext()
    const adminPage = await adminContext!.newPage()
    
    await adminPage.goto("/admin")
    await adminPage.waitForTimeout(1000)
    
    await adminPage.fill("#orgName", orgName)
    await adminPage.fill("#password", "admin") // default behavior in backend often uses generic fallback or we just check if it logs in. Let's assume password is 'admin' for testing.
    await adminPage.click('button[type="submit"]')
    
    // Check if it logged in successfully
    await adminPage.waitForTimeout(1000)
    await expect(adminPage.locator('text=Data Hasil Tes')).toBeVisible()
    await adminPage.screenshot({ path: 'screenshots/scenario-9-admin-login.png', fullPage: true })

    // 3. Monitor Incomplete Test (Scenario 11)
    // The table should have "Mengerjakan" status
    const statusCell = adminPage.locator('td:has-text("Mengerjakan")')
    await expect(statusCell).toBeVisible()
    await expect(adminPage.locator('text=Org Tester')).toBeVisible()
    await adminPage.screenshot({ path: 'screenshots/scenario-11-monitor-incomplete.png' })
    
    // 4. Resume via Link (Scenario 12)
    // Click "Link Resume" button
    await adminPage.click('button:has-text("Link Resume")')
    await adminPage.waitForTimeout(500)
    
    // The link is copied to clipboard, but we can't easily read clipboard in Playwright without permissions.
    // Let's extract the session ID from the DB or just manually construct it if possible?
    // In `admin.tsx`, it's an onclick copy.
    // Instead, let's intercept the clipboard write
    let resumeUrl = await adminPage.evaluate(async () => {
      try {
        return await navigator.clipboard.readText()
      } catch (e) {
        return ""
      }
    })
    
    if (!resumeUrl || !resumeUrl.includes('resume=')) {
      throw new Error("Failed to copy resume URL to clipboard")
    }
    
    // Now open resume URL in a fresh browser context (Scenario 12)
    const resumeContext = await context.browser()?.newContext()
    const resumePage = await resumeContext!.newPage()
    
    // Ensure this context has no local storage
    await resumePage.goto("/")
    await resumePage.evaluate(() => localStorage.clear())
    
    await resumePage.goto(resumeUrl)
    // It should go directly into the test and restore state
    await expect(resumePage).toHaveURL(/.*\/test/)
    await resumePage.waitForTimeout(1000)
    
    // It should be at Tier 2
    await expect(resumePage.locator('text=Cipta (Pikir / Logika)')).toBeVisible()
    await resumePage.screenshot({ path: 'screenshots/scenario-12-resumed-state.png' })
    
    await adminContext!.close()
    await resumeContext!.close()
  })
})
