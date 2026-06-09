import nox


@nox.session
def tests(session):
    """Install dependencies via Poetry and run the unit test suite."""
    session.log("Installing project dependencies with Poetry...")
    session.run("poetry", "install", external=True)
    session.log("Running unit tests...")
    session.run("poetry", "run", "python", "-m", "unittest", "discover", "-s", "test", "-v", external=True)


@nox.session
def e2e(session):
    """Install dependencies and run Playwright end-to-end tests."""
    session.log("Installing project dependencies with Poetry and test dependencies...")
    session.run("poetry", "install", "--with", "test", external=True)
    session.log("Patching Playwright platform detection for Ubuntu 26.04...")
    session.run(
        "python",
        "-c",
        (
            "import pathlib, playwright, glob; "
            "base = pathlib.Path(playwright.__file__).parent / 'driver' / 'package' / 'lib'; "
            "targets = list(base.glob('**/hostPlatform.js')) + list(base.glob('coreBundle.js')); "
            "[("
            "p.write_text("
            "p.read_text()"
            '.replace(\'"ubuntu" + distroInfo.version + archSuffix\', \'"ubuntu24.04" + archSuffix\')'
            ".replace(\"'ubuntu' + distroInfo.version + archSuffix\", \"'ubuntu24.04' + archSuffix\")"
            ")"
            ") for p in targets if p.exists()]"
        ),
    )
    session.log("Installing Playwright browsers...")
    session.run("playwright", "install", "chromium")
    session.log("Running Playwright E2E tests...")
    session.run("pytest", "tests_e2e/", "--browser", "chromium", "-v", env={"PYTHONPATH": "src"})
