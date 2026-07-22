import { test, expect } from "@playwright/test"

test.describe("New Features & Security Verification", () => {
  test.setTimeout(90000)

  test("1. Admin Register, Combobox Selection, Login, Cohort, Logout, & Share Error", async ({ page }) => {
    const testOrgName = "AutoTestOrg-" + Math.floor(Math.random() * 10000)
    const testPassword = "password123"

    // Listen for console/errors
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()))

    // Step 1: Register new organization on /admin/register
    await page.goto("/admin/register")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(500)
    await expect(page.locator("h1")).toContainText("Daftarkan Organisasi / Event")

    const orgInput = page.locator('input[placeholder*="Bintang Sejahtera"]')
    const passInput = page.locator('input[placeholder="Minimal 6 karakter"]')
    const confirmInput = page.locator('input[placeholder="Ulangi kata sandi"]')

    await orgInput.waitFor({ state: "visible" })
    await page.waitForTimeout(500)
    await orgInput.fill(testOrgName)
    await passInput.fill(testPassword)
    await confirmInput.fill(testPassword)

    await expect(orgInput).toHaveValue(testOrgName)
    await expect(passInput).toHaveValue(testPassword)
    await expect(confirmInput).toHaveValue(testPassword)
    await page.waitForTimeout(300)

    // Listen for console/errors
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()))

    await confirmInput.press("Enter")

    // Wait for response and check result
    await page.waitForTimeout(1500)
    const pageBody = await page.locator("body").innerText()
    console.log("PAGE BODY AFTER REGISTER SUBMIT:", pageBody)

    // Verify success screen
    await expect(page.locator("h2")).toContainText("Organisasi Terdaftar!", { timeout: 10000 })
    await page.screenshot({ path: "screenshots/verify-1-register-success.png" })

    // Step 2: Check Home Page Org Combobox
    await page.goto("/")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(1000)
    await expect(page.locator("#fullName")).toBeVisible()

    // Click the Org Combobox trigger button
    await page.click("#orgName")
    await page.waitForTimeout(300)
    
    // Type in search box
    const searchInput1 = page.locator('input[placeholder="Cari organisasi..."]')
    await expect(searchInput1).toBeVisible()
    await searchInput1.fill(testOrgName)
    await page.waitForTimeout(300)
    
    // Select the org from the list
    const orgOption1 = page.locator('div[class*="overflow-y-auto"] button').filter({ hasText: new RegExp(testOrgName, "i") }).first()
    await expect(orgOption1).toBeVisible({ timeout: 10000 })
    await orgOption1.click()
    
    // Verify selection displayed on button
    await expect(page.locator("#orgName")).toContainText(new RegExp(testOrgName, "i"))
    await page.screenshot({ path: "screenshots/verify-2-home-combobox.png" })

    // Step 3: Admin Login using Combobox
    await page.goto("/admin")
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(1000)
    await expect(page.locator("h1")).toContainText("Admin Dashboard")

    // Open combobox and select registered org
    const adminOrgBtn = page.locator("button#orgName")
    await expect(adminOrgBtn).toBeVisible()
    await adminOrgBtn.click()
    await page.waitForTimeout(300)

    const searchInput2 = page.locator('input[placeholder="Cari organisasi..."]')
    await expect(searchInput2).toBeVisible({ timeout: 5000 })
    await searchInput2.fill(testOrgName)
    await page.waitForTimeout(300)
    
    const orgItem = page.locator('div[class*="overflow-y-auto"] button').filter({ hasText: new RegExp(testOrgName, "i") }).first()
    await expect(orgItem).toBeVisible({ timeout: 10000 })
    await orgItem.click()
    await page.waitForTimeout(500)

    // Enter password
    await page.fill("#password", testPassword)
    await page.waitForTimeout(300)
    await page.click('button[type="submit"]')

    // Verify dashboard loads
    await expect(page.locator("h1")).toContainText("Data Hasil Tes", { timeout: 10000 })
    await expect(page.locator("text=" + testOrgName)).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: "screenshots/verify-3-admin-dashboard.png" })

    // Step 4: Admin Logout from Dashboard
    await page.click('button:has-text("Keluar")')
    await expect(page.locator("h1")).toContainText("Admin Dashboard", { timeout: 10000 })
    await page.screenshot({ path: "screenshots/verify-4-admin-logout.png" })

    // Step 5: Cohort Page Navigation without token (Auth Protection Check)
    await page.goto("/admin/cohort")
    await page.waitForLoadState("domcontentloaded")
    await expect(page.locator("h1")).toContainText("Analisa Kelompok")
    await expect(page.locator("text=Sesi tidak valid")).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: "screenshots/verify-5-cohort-protected.png" })

    // Step 6: Test Share Error Fallback
    await page.goto("/result?code=INVALID_CODE_XYZ")
    await page.waitForLoadState("domcontentloaded")
    await expect(page.locator("text=Tautan Tidak Dapat Dimuat")).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button:has-text("Coba Lagi")')).toBeVisible()
    await expect(page.locator('button:has-text("Kembali ke Beranda")')).toBeVisible()
    await page.screenshot({ path: "screenshots/verify-6-share-error.png" })
  })
})
