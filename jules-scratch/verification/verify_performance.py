from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the app
        page.goto("http://localhost:3000")

        # Wait for the board to be rendered
        expect(page.locator(".bingo-board")).to_be_visible()

        # Interact with the Board BG color picker
        board_bg_picker = page.locator('input[name="boardBg"]')
        board_bg_picker.set_input_files([]) # This is how you can clear a color input if needed, but we'll set a new color
        board_bg_picker.fill("#cccccc")

        # Interact with the Marker Opacity slider
        opacity_slider = page.locator('input[type="range"][value="0.8"]')
        # Sliders are tricky, let's just click and check if the app is responsive
        opacity_slider.click()


        # Interact with the Font Size slider
        font_size_slider = page.locator('input[type="range"][value="1"]')
        font_size_slider.click()

        # Take a screenshot to verify the changes
        page.screenshot(path="jules-scratch/verification/verification.png")

        print("Verification script ran successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)