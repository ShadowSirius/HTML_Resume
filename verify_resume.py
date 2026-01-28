from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the local HTML file
        page.goto(f"file://{os.getcwd()}/resume.html")
        page.set_viewport_size({"width": 1400, "height": 900})

        time.sleep(2)

        print("Capturing Split View...")
        page.screenshot(path="1_split_view.png")

        print("Clicking Project...")
        page.click("#btn-s_two_segment_pmsm")

        time.sleep(2)

        print("Capturing Unified View...")
        page.screenshot(path="2_unified_view.png")

        print("Clicking Reset...")
        page.click("#zoom-reset")

        time.sleep(2)

        print("Capturing Reset View...")
        page.screenshot(path="3_reset_view.png")

        browser.close()

if __name__ == "__main__":
    run()
