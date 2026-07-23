import { test, expect } from '@playwright/test'

test.describe('TB40 Frontend E2E - v0.3 Multi-Step Adaptive Flow', () => {
  test('should complete fast-track anonymous start, profile gate, tier 3, and result page', async ({ page }) => {
    test.setTimeout(60000)

    // Enable browser console, error, and dialog logs
    page.on('console', (msg) => console.log('BROWSER LOG:', msg.type(), msg.text()))
    page.on('pageerror', (err) => console.log('BROWSER ERROR:', err))
    page.on('dialog', (dialog) => {
      console.log('BROWSER DIALOG:', dialog.message())
      dialog.accept()
    })

    // 1. Navigate to landing page
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    // 2. Click "Tes TB40 Dewasa" button for Fast-Track Anonymous Start
    const adultBtn = page.locator('button').filter({ hasText: 'Tes TB40 Dewasa' }).first()
    await expect(adultBtn).toBeVisible({ timeout: 15000 })
    await adultBtn.click()

    // 3. Verify transition to /test?id=sub_...
    await expect(page).toHaveURL(/.*\/test\?id=sub_.*/, { timeout: 15000 })
    await page.waitForTimeout(1000)

    // 4. Tier 1 - Energi Sosial (Allocation)
    const t1Btn = page.locator('button:has-text("Simpan Tier 1 & Lanjut ke Tier 2")')
    await expect(t1Btn).toBeVisible({ timeout: 10000 })
    await t1Btn.click()
    await page.waitForTimeout(1000)

    // 5. Tier 2 - Orientasi Bakat (Forced Ranking)
    const karsaItem = page.locator('text=/Karsa/i')
    const ciptaItem = page.locator('text=/Cipta/i')
    const rasaItem = page.locator('text=/Rasa/i')

    await expect(karsaItem.first()).toBeVisible({ timeout: 10000 })
    await karsaItem.first().click()
    await ciptaItem.first().click()
    await rasaItem.first().click()
    await page.waitForTimeout(500)

    const t2Btn = page.locator('button:has-text("Simpan Tier 2 & Lihat Laporan Awal")')
    await expect(t2Btn).toBeEnabled({ timeout: 5000 })
    await t2Btn.click()

    // 6. Tier 2 Teaser Card & Big CTA Container Button
    const bigCtaBtn = page.locator('button:has-text("Lengkapi Profil & Lanjutkan ke Tier 3")')
    await expect(bigCtaBtn).toBeVisible({ timeout: 10000 })
    await bigCtaBtn.click()

    // 7. Profile Gate Boundary Modal
    const profileModalTitle = page.locator('text="Lengkapi Profil untuk Membuka Tier 3"')
    await expect(profileModalTitle).toBeVisible({ timeout: 10000 })
    await page.fill('#subjectName', 'Playwright Tester v0.3')
    await page.fill('#ageVal', '25')

    const saveProfileBtn = page.locator('button:has-text("Buka & Lanjut ke Tier 3")')
    await expect(saveProfileBtn).toBeEnabled()
    await saveProfileBtn.click()

    // 7. Tier 3 Sub-Groups & Completion
    const completeReportBtn = page.locator('button:has-text("Lihat Laporan Analisis Lengkap (100%)")')
    await expect(completeReportBtn).toBeVisible({ timeout: 10000 })
    await completeReportBtn.click()

    // 8. Result Page Verification
    await expect(page).toHaveURL(/.*\/result/, { timeout: 15000 })
    await expect(page.locator('text=/Laporan Hasil Bakat TB40/i')).toBeVisible({ timeout: 10000 })
  })
})
