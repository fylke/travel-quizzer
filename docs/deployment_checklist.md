# Deployment Checklist

A manual checklist covering the steps that **cannot be automated through code** — user/key creation, infrastructure prep, and troubleshooting.

---

## Prerequisites

### GitHub Secrets

Configure these in the repository under **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|--------|---------|
| `FLASK_SECRET_KEY` | Flask session signing — use a long random string (≥32 chars) |
| `QNAP_HOST` | QNAP IP address or hostname |
| `QNAP_SSH_PORT` | SSH port (usually `22`) |
| `QNAP_USER` | SSH username on the QNAP |
| `QNAP_SSH_KEY` | Private SSH key for deploy access |
| `QNAP_GHCR_TOKEN` | GitHub PAT with `read:packages` scope |

### SSH Key Setup

1. Generate a dedicated deploy key (if one doesn't exist):
   ```bash
   ssh-keygen -t ed25519 -C "deploy@travel-quizzer" -f deploy_key
   ```
2. Add the **public** key to the QNAP user's `~/.ssh/authorized_keys`.
3. Paste the **private** key contents into the `QNAP_SSH_KEY` GitHub secret.
4. Verify connectivity:
   ```bash
   ssh -i deploy_key -p <port> <user>@<qnap-host> "echo ok"
   ```

### GitHub Container Registry Token

1. Create a GitHub Personal Access Token with the `read:packages` scope.
2. Store it in the `QNAP_GHCR_TOKEN` secret — the deploy workflow uses it to pull images on the QNAP.

---

## QNAP Server Setup

### Create directories

```bash
mkdir -p /share/Container/travel-quizzer/database
mkdir -p /share/Container/travel-quizzer/data
mkdir -p /share/Container/travel-quizzer/media/countries
```

### Verify Docker is available

Container Station installs Docker. Confirm:

```bash
docker --version
```

### Upload data files

`data/countries.json` is gitignored and not baked into the image. Copy it manually:

```bash
scp data/countries.json <user>@<qnap>:/share/Container/travel-quizzer/data/countries.json
```

### Place quiz images

Each destination needs images organized by country ID and hint level:

```
media/countries/<id>/<level>a.jpg
media/countries/<id>/<level>b.jpg
```

Levels run 1 (easiest) through 5 (hardest). Current country IDs:

| ID | Country |
|----|---------|
| 1 | Bhutan |
| 2 | Bulgaria |
| 3 | Indonesia |
| 4 | Argentina |
| 5 | Israel |
| 6 | Myanmar |
| 7 | Australia |
| 8 | Azerbaijan |

---

## Post-Deploy Verification

- [ ] Check container logs:
  ```bash
  docker logs travel-quizzer
  ```
- [ ] Confirm the app responds at `http://<qnap-ip>:9696`.
- [ ] Log in with the seeded admin account (`admin@example.com` / `adminpass123`).
- [ ] **Change the default admin password immediately** via the admin panel or by re-seeding.

---

## Troubleshooting

### Deploy workflow fails to SSH

- Confirm the QNAP's SSH daemon is running and listening on the expected port.
- Ensure `QNAP_SSH_KEY` contains the full private key including `-----BEGIN/END-----` lines.
- Check `authorized_keys` permissions on the QNAP (`chmod 600`).

### Container won't start

- Check logs: `docker logs travel-quizzer`
- Verify the bind-mounted directories exist and have correct ownership.
- Ensure port `9696` is not already in use on the host.

### Image pull fails on QNAP

- Verify `QNAP_GHCR_TOKEN` has `read:packages` scope and hasn't expired.
- Test manually:
  ```bash
  echo $TOKEN | docker login ghcr.io -u <github-user> --password-stdin
  docker pull ghcr.io/<org>/travel-quizzer:latest
  ```

### Database issues

- The SQLite file lives at `/share/Container/travel-quizzer/database/quiz_data.db`.
- If the container starts fresh with an empty database, run the seed script inside the container or copy a pre-seeded DB.
- File permission problems: ensure the container user can write to the `database/` directory.
