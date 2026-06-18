# Quiz Images (media/)

Quiz images are stored locally in the `media/` directory (gitignored). The app serves them via `/media/<path>`.

## Naming Convention

```
media/<table>/<id>/<hint_level>a.jpg
media/<table>/<id>/<hint_level>b.jpg
```

Each entry has two images per hint level. For example, country with ID 3 at hint level 5:

```
media/countries/3/5a.jpg
media/countries/3/5b.jpg
```

The API returns these paths automatically based on the quiz type, destination ID, and current hint difficulty.

## Setup

1. Create the `media/` directory at the project root
2. Inside `media/`, create a subdirectory per quiz type (e.g. `countries/`)
3. Inside each quiz-type directory, create subdirectories named by database ID
4. Place images using the naming convention above

## Container Deployment

The `media/` directory is bind-mounted read-only into the container:

```yaml
volumes:
  - ./media:/app/media:ro
```
