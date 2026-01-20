from playwright.sync_api import Page, expect, sync_playwright
import os

def test_translation(page: Page):
    print("Navigating to home page...")
    page.goto("http://localhost:3000")

    print("Checking Dashboard...")
    expect(page.get_by_text("Guest Portfolio Overview")).to_be_visible(timeout=10000)
    expect(page.get_by_text("+ Add Asset")).to_be_visible()

    print("Checking Table Headers...")
    # Try text locator if role fails
    expect(page.get_by_text("Category", exact=True)).to_be_visible()
    expect(page.get_by_text("Name/Code")).to_be_visible()
    expect(page.get_by_text("Target %")).to_be_visible()

    # Check Add Asset
    print("Checking Add Asset...")
    page.get_by_role("button", name="+ Add Asset").click()

    expect(page.get_by_placeholder("Asset Name").last).to_be_visible()

    # Check Selector
    print("Checking Category Selector...")
    page.get_by_title("Category: Stock").last.click()

    # Check options
    expect(page.get_by_role("button", name="Bond")).to_be_visible()
    expect(page.get_by_role("button", name="Commodity")).to_be_visible()
    expect(page.get_by_role("button", name="Cash")).to_be_visible()

    print("Taking screenshot...")
    page.screenshot(path="/home/jules/verification/verification.png")
    print("Verification complete.")

if __name__ == "__main__":
    os.makedirs("/home/jules/verification", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_translation(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="/home/jules/verification/failed_verification.png")
            raise e
        finally:
            browser.close()
