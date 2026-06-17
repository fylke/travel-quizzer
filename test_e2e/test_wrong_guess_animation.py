"""End-to-end tests for wrong guess animation feedback.

Validates Requirements: 1.1, 2.1, 3.1, 3.2, 5.1, 5.2, 5.3
"""

import re

import pytest
from playwright.sync_api import Page, expect


@pytest.fixture(autouse=True)
def setup(clean_db):
    """Ensure a clean database for each test."""


def _register_and_start(page: Page, base_url: str):
    """Register a user and navigate to the quiz screen."""
    page.goto(base_url)
    page.click("#switchToRegister")
    page.fill("#name", "Tester")
    page.fill("#email", "tester@test.com")
    page.fill("#password", "password123")
    page.click("#authButton")
    expect(page.locator("#statusScreen")).to_be_visible(timeout=5000)
    page.click("#runRandomQuizBtn")
    expect(page.locator("#quizScreen")).to_be_visible(timeout=5000)
    expect(page.locator("#hint")).not_to_be_empty(timeout=5000)


def test_wrong_answer_adds_animation_classes(page: Page, base_url: str):
    """Submit wrong answer → input has .wrong-guess-shake and .wrong-guess-glow classes."""
    _register_and_start(page, base_url)

    page.fill("#answerInput", "London")
    page.click("text=Submit Answer")

    input_el = page.locator("#answerInput")
    # Animation classes should be applied after wrong answer
    expect(input_el).to_have_class(re.compile(r"wrong-guess-shake"), timeout=3000)
    expect(input_el).to_have_class(re.compile(r"wrong-guess-glow"), timeout=3000)


def test_empty_input_animates_without_alert(page: Page, base_url: str):
    """Submit empty input → animation plays, no alert dialog appears."""
    _register_and_start(page, base_url)

    # Track if any dialog (alert) appears
    dialog_appeared = []
    page.on("dialog", lambda dialog: (dialog_appeared.append(True), dialog.dismiss()))

    # Clear input and submit
    page.fill("#answerInput", "")
    page.click("text=Submit Answer")

    input_el = page.locator("#answerInput")
    # Animation classes should be applied
    expect(input_el).to_have_class(re.compile(r"wrong-guess-shake"), timeout=3000)
    expect(input_el).to_have_class(re.compile(r"wrong-guess-glow"), timeout=3000)

    # No alert dialog should have appeared
    assert len(dialog_appeared) == 0, "Alert dialog appeared but should not have"


def test_animation_ends_classes_removed_input_usable(page: Page, base_url: str):
    """Animation ends → classes removed, input usable."""
    _register_and_start(page, base_url)

    page.fill("#answerInput", "London")
    page.click("text=Submit Answer")

    input_el = page.locator("#answerInput")
    # Verify animation starts
    expect(input_el).to_have_class(re.compile(r"wrong-guess-shake"), timeout=3000)

    # Wait for animation to complete (600ms animation + 1000ms fallback + buffer)
    page.wait_for_timeout(1500)

    # Classes should be removed after animation ends
    expect(input_el).not_to_have_class(re.compile(r"wrong-guess-shake"), timeout=3000)
    expect(input_el).not_to_have_class(re.compile(r"wrong-guess-glow"), timeout=3000)

    # Input should still be usable
    expect(input_el).to_be_enabled()
    page.fill("#answerInput", "test typing")
    assert page.locator("#answerInput").input_value() == "test typing"


def test_reduced_motion_static_border_only(page: Page, base_url: str):
    """With prefers-reduced-motion emulated → static red border only, no motion classes."""
    # Emulate reduced motion BEFORE navigating
    page.emulate_media(reduced_motion="reduce")

    _register_and_start(page, base_url)

    page.fill("#answerInput", "London")
    page.click("text=Submit Answer")

    input_el = page.locator("#answerInput")

    # Should have static class instead of animation classes
    expect(input_el).to_have_class(re.compile(r"wrong-guess-static"), timeout=3000)

    # Should NOT have motion-based animation classes
    expect(input_el).not_to_have_class(re.compile(r"wrong-guess-shake"))
    expect(input_el).not_to_have_class(re.compile(r"wrong-guess-glow"))
