# Quiz Images (media/)

Quiz images are stored locally in the `media/` directory (gitignored). The app serves them via `/media/<path>`.

## Naming Convention

```
media/<destination_id>/<hint_level>a.jpg
media/<destination_id>/<hint_level>b.jpg
```

Each destination has two images per hint level. For example, destination 3 at hint level 5:

```
media/3/5a.jpg
media/3/5b.jpg
```

The API returns these paths automatically based on the destination ID and current hint difficulty.

## Setup

1. Create the `media/` directory at the project root
2. For each destination, create a subdirectory named by its database ID
3. Place images using the naming convention above

## Container Deployment

The `media/` directory is bind-mounted read-only into the container:

```yaml
volumes:
  - ./media:/app/media:ro
```
