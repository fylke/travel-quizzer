"""Run end-to-end Playwright tests."""

import sys
import pytest


def main():
    sys.exit(pytest.main(["tests_e2e/", "-v"]))


if __name__ == "__main__":
    main()
