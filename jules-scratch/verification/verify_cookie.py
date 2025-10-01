from playwright.sync_api import Page, expect

def test_cookie_loading(page: Page):
    """
    This test verifies that the application saves the board state to a cookie
    and automatically loads it on a subsequent visit.
    """
    # 1. Arrange: Go to the application homepage.
    page.goto("http://localhost:3000")

    # 2. Act: Click the "Save to Text Box" button to create the cookie.
    save_button = page.get_by_role("button", name="Save to Text Box")
    save_button.click()

    # Wait for the success message to appear and disappear to ensure the save is complete.
    expect(page.get_by_text("Board saved to text box and cookie!")).to_be_visible()
    expect(page.get_by_text("Board saved to text box and cookie!")).not_to_be_visible()

    # 3. Act: Reload the page.
    page.reload()

    # 4. Assert: Check that the board loaded from the cookie.
    # The "Board loaded successfully!" message is a good indicator.
    expect(page.get_by_text("Board loaded successfully!")).to_be_visible()

    # 5. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/cookie_verification.png")