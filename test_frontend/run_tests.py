"""Run Jasmine frontend tests headlessly using Playwright."""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


def main():
    spec_runner = Path(__file__).parent / "SpecRunner.html"
    url = f"file://{spec_runner.resolve()}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)

        # Wait for Jasmine to finish
        page.wait_for_selector(".jasmine-overall-result", timeout=30000)

        # Check results
        summary = page.locator(".jasmine-overall-result").inner_text()
        print(summary)

        # Check if there are any failures by looking at the summary text
        has_failures = "failure" in summary.lower() and "0 failures" not in summary.lower()

        if has_failures:
            # Print failure details
            failure_messages = page.locator(".jasmine-failures .jasmine-spec-detail").all_inner_texts()
            if not failure_messages:
                failure_messages = page.locator(".jasmine-failure-message").all_inner_texts()
            for msg in failure_messages:
                print(f"  FAILED: {msg}")
            browser.close()
            sys.exit(1)

        browser.close()
        sys.exit(0)


if __name__ == "__main__":
    main()
