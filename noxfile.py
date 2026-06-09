import nox


@nox.session
def tests(session):
    """Install dependencies via Poetry and run the unit test suite."""
    session.log("Installing project dependencies with Poetry...")
    session.run("poetry", "install", external=True)
    session.log("Running unit tests...")
    session.run("poetry", "run", "python", "-m", "unittest", "discover", "-s", "test", "-v", external=True)
