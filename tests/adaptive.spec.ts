import { test, expect } from "@playwright/test"

test.describe("TB40 Frontend E2E - Adaptive Assessment (v0.2)", () => {
  test("should complete the entire adaptive assessment flow successfully", async ({
    page,
  }) => {
    // Listen for console logs
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()))
    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message))

    // 1. Navigate to the homepage
    await page.goto("/")

    // Wait for the local API health check to set server status
    await page.waitForTimeout(2000)

    // 2. Fill the registration form
    await page.fill("#fullName", "Playwright Tester")

    // Click Nickname button "Tester"
    await page.click('button:has-text("Tester")')

    // Fill Age
    await page.fill("#age", "25")

    // Select Metode Cepat (v0.2) - it is default, but click it to be sure
    await page.click('button:has-text("Metode Cepat (v0.2)")')

    // Submit form
    await page.click('button[type="submit"]:has-text("Mulai Penilaian Bakat")')

    // 3. Verify transition to /test page
    await expect(page).toHaveURL(/.*\/test/)
    await page.waitForTimeout(1000)

    // 4. Tier 1 - Energi Sosial (Allocation)
    // Check if slider exists and set it to a value by pressing ArrowRight
    const sliderThumb = page.locator('[role="slider"]')
    await expect(sliderThumb).toBeVisible()
    await sliderThumb.focus()
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await page.waitForTimeout(500)

    // Click "Simpan & Lanjut"
    await page.click('button:has-text("Simpan & Lanjut")')
    await page.waitForTimeout(1000)

    // 5. Tier 2 - Orientasi Bakat (Forced Ranking)
    // Click Cipta, Rasa, Karsa in order
    await page.click('button:has-text("Cipta (Pikir / Logika)")')
    await page.waitForTimeout(200)
    await page.click('button:has-text("Rasa (Hati / Emosi)")')
    await page.waitForTimeout(200)
    await page.click('button:has-text("Karsa (Aksi / Kerja Fisik)")')
    await page.waitForTimeout(500)

    // Click "Lanjut ke Evaluasi 40 Pilar"
    await page.click('button:has-text("Lanjut ke Evaluasi 40 Pilar")')
    await page.waitForTimeout(1000)

    // 6. Tier 3 - Evaluasi 40 Pilar (Pagination Pages 1 to 5)
    // Page 1
    await expect(page.locator("text=Halaman 1 / 5")).toBeVisible()
    await page.click('button:has-text("Lanjut")')
    await page.waitForTimeout(500)

    // Page 2
    await expect(page.locator("text=Halaman 2 / 5")).toBeVisible()
    await page.click('button:has-text("Lanjut")')
    await page.waitForTimeout(500)

    // Page 3
    await expect(page.locator("text=Halaman 3 / 5")).toBeVisible()
    await page.click('button:has-text("Lanjut")')
    await page.waitForTimeout(500)

    // Page 4
    await expect(page.locator("text=Halaman 4 / 5")).toBeVisible()
    await page.click('button:has-text("Lanjut")')
    await page.waitForTimeout(500)

    // Page 5 - Last Page
    await expect(page.locator("text=Halaman 5 / 5")).toBeVisible()
    // Submit final assessment
    await page.click('button:has-text("Mulai Analisa Bakat")')

    // 7. Verify transition to /result page
    // Wait for the results to load
    await page.waitForURL(/.*\/result/, { timeout: 15000 })
    await expect(page).toHaveURL(/.*\/result/)

    // Verify results contents
    await expect(
      page.locator("h3:has-text('Ringkasan Karakter & Jiwa')")
    ).toBeVisible()
    await expect(page.locator("text=Laporan Analisa Editorial")).toBeVisible()

    // Log LocalStorage values to console
    const savedUmum = await page.evaluate(() =>
      localStorage.getItem("tb40_umum")
    )
    const savedAnswersV1 = await page.evaluate(() =>
      localStorage.getItem("tb40_answers")
    )
    const savedAnswersV2 = await page.evaluate(() =>
      localStorage.getItem("tb40_answers_v2_tier3")
    )
    console.log("DEBUG - tb40_umum in localStorage:", savedUmum)
    console.log("DEBUG - tb40_answers in localStorage:", savedAnswersV1)
    console.log(
      "DEBUG - tb40_answers_v2_tier3 in localStorage:",
      savedAnswersV2
    )

    // Trigger share modal
    // Let's click "Bagikan Hasil" in the sidebar
    await page.click('button:has-text("Bagikan Hasil")')
    await page.waitForTimeout(1000)

    // Check if modal title is visible
    await expect(
      page.locator('h2:has-text("Bagikan Hasil Penilaian")')
    ).toBeVisible()

    // Check if the QR code container (svg inside bg-card modal) is visible
    await expect(page.locator("div.bg-card svg").first()).toBeVisible()
  })
})
