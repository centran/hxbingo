from playwright.sync_api import sync_playwright, Page, expect
import time

def verify_battle_mode(page: Page):
    # 1. Arrange: Go to the application homepage.
    # The dev server is running on port 3000.
    page.goto("http://localhost:3000")

    # 2. Act: Enable battle mode.
    battle_mode_toggle = page.locator("#battle-mode-toggle")
    battle_mode_toggle.check()

    # 3. Act: Start playing.
    start_playing_button = page.get_by_role("button", name="Start Playing")
    start_playing_button.click()

    # 4. Act: Mark some squares.
    squares = page.locator(".bingo-board").first.locator(".relative.flex")
    squares.nth(0).click()
    squares.nth(1).click()
    squares.nth(2).click()

    # 5. Act: Click a battle square.
    battle_squares = page.locator(".battle-square")
    battle_squares.nth(0).click()

    # 6. Act: Wait for the animation to complete.
    # The animation takes a few seconds. We can wait for the message to appear.
    expect(page.get_by_text("A marked square has been removed!")).to_be_visible(timeout=10000)

    # 7. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_battle_mode(page)
        browser.close()

if __name__ == "__main__":
    main()
