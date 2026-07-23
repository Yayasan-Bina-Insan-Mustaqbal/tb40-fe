import { test, expect } from "@playwright/test"
import * as fs from "fs"

test.describe("Core Assessment Scenarios", () => {
  // Use a stable viewport for screenshots
  test.use({ viewport: { width: 1280, height: 720 } })

  test("Scenario 1: Full Standard Precision Assessment (Ideal Flow)", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/")
    await expect(
      page.locator('text="Live Server Online"').or(page.locator('text="Sandbox Demo Mode"'))
    ).toBeVisible({ timeout: 10000 })
    
    // Simulate User Registration
    await page.fill("#fullName", "Ideal Tester")
    await page.locator('.flex-wrap button').first().click() // select nickname
    await page.fill("#age", "25")
    // Select Metode Lengkap (v0.1) explicitly
    await page.click('button:has-text("Metode Lengkap (v0.1)")')
    await page.click('button[type="submit"]:has-text("Mulai Penilaian Bakat")')

    await expect(page).toHaveURL(/.*\/test/)
    // Tier 3 - 5 pages of 8 questions each
    for (let pageNum = 1; pageNum <= 5; pageNum++) {
      for (let i = 1; i <= 8; i++) {
        const globalIndex = (pageNum - 1) * 8 + i;
        const slider = page.locator('.relative.flex.flex-col').filter({ hasText: `Pernyataan ${globalIndex} dari 40` }).locator('[role="slider"]');
        const box = await slider.boundingBox();
        if (box) {
          // click right in the middle to set score to 50
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        }
      }
      if (pageNum < 5) {
        await page.locator('button:has-text("Lanjut")').click()
      } else {
        await page.locator('button:has-text("Mulai Analisa Bakat")').click()
      }
    }
    
    await expect(page).toHaveURL(/.*\/result/)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'screenshots/scenario-1-precision-result.png', fullPage: true })
  })

  test("Scenario 2 & 3: Interrupted Session & Abandon Test", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/")
    await expect(
      page.locator('text="Live Server Online"').or(page.locator('text="Sandbox Demo Mode"'))
    ).toBeVisible({ timeout: 10000 })
    
    await page.fill("#fullName", "Abandon Tester")
    await page.locator('.flex-wrap button').first().click() // select nickname
    await page.fill("#age", "25")
    await page.click('button:has-text("Metode Cepat (v0.2)")')
    await page.click('button[type="submit"]:has-text("Mulai Penilaian Bakat")')

    await expect(page).toHaveURL(/.*\/test/)

    await page.waitForTimeout(1000)
    
    // Tier 1
    const slider = page.locator("#socialEnergySlider")
    try {
      await slider.waitFor({ state: "visible", timeout: 30000 })
      const box = await slider.boundingBox()
      if (box) await page.mouse.click(box.x + box.width * 0.7, box.y + box.height / 2)
    } catch (e) {
      await page.screenshot({ path: 'screenshots/scenario-2-slider-timeout.png' })
      const html = await page.content()
      fs.writeFileSync('page-dump-adaptive.html', html)
      throw e
    }
    
    await page.click('button:has-text("Simpan & Lanjut")')
    await page.waitForTimeout(1000)
    
    // Now close page and reopen (Interrupted Session - Scenario 2)
    await page.goto("/")
    await expect(
      page.locator('text="Live Server Online"').or(page.locator('text="Sandbox Demo Mode"'))
    ).toBeVisible({ timeout: 10000 })
    
    // Should show "Anda Memiliki Tes yang Belum Selesai"
    await expect(page.locator('button:has-text("Lanjutkan Tes")')).toBeVisible()
    await page.screenshot({ path: 'screenshots/scenario-2-continue-test.png' })
    
    await page.locator('button:has-text("Lanjutkan Tes")').click({ force: true })
    await expect(page).toHaveURL(/.*\/test/)

    await page.waitForTimeout(1000)
    
    // Should be back at Tier 2 (Orientasi Bakat)
    await expect(page.locator('button:has-text("Cipta (Pikir / Logika)")')).toBeVisible()

    // Abandon Test (Scenario 3)
    await page.click('button:has-text("Batalkan Tes")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Pilih Versi Hasil Penilaian').or(page.locator('text=Batalkan Tes & Hapus Data?'))).toBeVisible()
    await page.screenshot({ path: 'screenshots/scenario-3-abandon-modal.png' })
    
    await page.click('button:has-text("Ya, Batalkan & Hapus")')
    await page.waitForTimeout(1000)
    
    // Should be back at Home with no continue button
    await expect(page).toHaveURL(/.*\//)
    await expect(page.locator('button:has-text("Lanjutkan Tes")')).not.toBeVisible()
    await page.screenshot({ path: 'screenshots/scenario-3-abandoned-home.png' })
  })

  test("Scenario 7: Offline / Network Failure Mocking", async ({ page, context }) => {
    test.setTimeout(120000)
    // We will run the adaptive test but block the saveResult API call to simulate failure.
    await page.goto("/")
    await expect(
      page.locator('text="Live Server Online"').or(page.locator('text="Sandbox Demo Mode"'))
    ).toBeVisible({ timeout: 10000 })
    
    await page.fill("#fullName", "Offline Tester")
    await page.locator('.flex-wrap button').first().click() // select nickname
    await page.fill("#age", "40")
    await page.click('button:has-text("Metode Cepat (v0.2)")')
    await page.click('button[type="submit"]:has-text("Mulai Penilaian Bakat")')
    
    await expect(page).toHaveURL(/.*\/test/)

    await page.waitForTimeout(1000)
    
    // Tier 1
    const slider = page.locator("#socialEnergySlider")
    const box = await slider.boundingBox()
    if (box) await page.mouse.click(box.x + box.width * 0.7, box.y + box.height / 2)
    await page.click('button:has-text("Simpan & Lanjut")')
    await page.waitForTimeout(1000)

    // Tier 2
    await page.click('button:has-text("Cipta (Pikir / Logika)")')
    await page.waitForTimeout(200)
    await page.click('button:has-text("Rasa (Hati / Emosi)")')
    await page.waitForTimeout(200)
    await page.click('button:has-text("Karsa (Aksi / Kerja Fisik)")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Lanjut ke Evaluasi 40 Pilar")')
    await page.waitForTimeout(1000)
    
    // Tier 3
    for (let i = 1; i <= 4; i++) {
      await page.click('button:has-text("Lanjut")')
      await page.waitForTimeout(500)
    }
    
    // Block the /api/saveResult route
    await page.route('**/_server/**', route => route.abort('failed'))

    // Try to submit
    await page.click('button:has-text("Mulai Analisa Bakat")')
    
    // It should timeout or fail the background request, but we wait for it to generate the result locally and redirect anyway
    await page.waitForURL(/.*\/result/, { timeout: 15000 })
    await page.screenshot({ path: 'screenshots/scenario-7-offline-fallback.png', fullPage: true })
    
    await context.unroute('**/_server/**')
  })
})
