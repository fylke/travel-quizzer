"""End-to-end tests for authentication flows."""

import pytest
from playwright.sync_api import Page, expect


@pytest.fixture(autouse=True)
def setup(clean_db):
    """Ensure a clean database for each test."""


def test_welcome_screen_loads(page: Page, base_url: str):
    """The welcome screen should display login form elements."""
    page.goto(base_url)

    expect(page.locator("#authHeading")).to_have_text("✈️ Travel Quiz")
    expect(page.locator("#email")).to_be_visible()
    expect(page.locator("#password")).to_be_visible()
    expect(page.locator("#authButton")).to_have_text("Log In")


def test_register_new_user(page: Page, base_url: str):
    """A new user can register and is taken to the status screen."""
    page.goto(base_url)

    # Switch to register mode
    page.click("#switchToRegister")
    expect(page.locator("#name")).to_be_visible()

    # Fill in registration form
    page.fill("#name", "Test User")
    page.fill("#email", "test@example.com")
    page.fill("#password", "password123")
    page.click("#authButton")

    # Should navigate to status screen
    expect(page.locator("#statusScreen")).to_be_visible(timeout=5000)


def test_login_with_invalid_credentials(page: Page, base_url: str):
    """Login with wrong credentials should show an error."""
    page.goto(base_url)

    page.fill("#email", "nonexistent@example.com")
    page.fill("#password", "wrongpassword")
    page.click("#authButton")

    # Should remain on the welcome screen (quiz screen should not appear)
    expect(page.locator("#quizScreen")).to_be_hidden()
    expect(page.locator("#welcomeScreen")).to_be_visible()


def test_login_after_registration(page: Page, base_url: str, playwright):
    """A user can register and then log in — UI only verifies the login form submits.

    The full register→logout→login cycle is covered by the unit/integration
    test (test_unit/test_main.py::test_login_after_registration) which is more
    reliable and faster.  Here we just confirm the login form works for an
    existing user.
    """
    # Register a user via a separate API request context so the page's
    # cookies are not affected (otherwise the page would already be logged in).
    api_context = playwright.request.new_context(base_url=base_url)
    import json
    resp = api_context.post("/api/register", data=json.dumps({
        "name": "Login Test",
        "email": "login@example.com",
        "password": "mypassword",
    }), headers={"Content-Type": "application/json"})
    assert resp.ok, f"Registration failed: {resp.status} {resp.text()}"
    api_context.dispose()

    # Now test that the login UI works for this user
    page.goto(base_url)
    page.fill("#email", "login@example.com")
    page.fill("#password", "mypassword")
    page.click("#authButton")

    expect(page.locator("#statusScreen")).to_be_visible(timeout=5000)


def test_toggle_between_login_and_register(page: Page, base_url: str):
    """User can switch between login and register modes."""
    page.goto(base_url)

    # Initially in login mode - name field has .hidden class
    expect(page.locator("#name")).to_have_class("hidden")
    expect(page.locator("#switchToRegister")).to_be_visible()

    # Switch to register
    page.click("#switchToRegister")
    expect(page.locator("#name")).not_to_have_class("hidden")
    expect(page.locator("#switchToLogin")).to_be_visible()

    # Switch back to login
    page.click("#switchToLogin")
    expect(page.locator("#name")).to_have_class("hidden")
