# Deployment TODO

## On this computer

- [ ] **Merge `deployment` into `main` and push**
  The CI/CD pipeline triggers on pushes to `main`.
  ```bash
  git switch main
  git merge deployment
  git push origin main
  ```

- [ ] **Verify GitHub Actions secrets are set**
  Go to: repo → Settings → Secrets and variables → Actions

  | Secret | Purpose |
  |---|---|
  | `FLASK_SECRET_KEY` | Flask session signing (use a long random string) |
  | `QNAP_HOST` | QNAP IP address or hostname |
  | `QNAP_SSH_PORT` | SSH port (usually 22) |
  | `QNAP_USER` | SSH username on the QNAP |
  | `QNAP_SSH_KEY` | Private SSH key (the QNAP must have the public key) |
  | `QNAP_GHCR_TOKEN` | GitHub PAT with `read:packages` scope |

- [ ] **Copy `data/countries.json` to the QNAP** (it's gitignored, not in the image)
  ```bash
  scp data/countries.json <user>@<qnap>:/share/Container/travel-quizzer/data/countries.json
  ```

---

## On the QNAP server

- [ ] **Create required directories**
  ```bash
  mkdir -p /share/Container/travel-quizzer/database
  mkdir -p /share/Container/travel-quizzer/data
  mkdir -p /share/Container/travel-quizzer/media/countries
  ```

- [ ] **Place quiz images into `media/countries/<id>/`**
  One subdirectory per country ID (1–8), two images per hint level:
  ```
  media/countries/1/5a.jpg   media/countries/1/5b.jpg
  media/countries/1/4a.jpg   media/countries/1/4b.jpg
  ...
  media/countries/1/1a.jpg   media/countries/1/1b.jpg
  ```
  Country IDs:
  | ID | Country |
  |----|---------|
  | 1  | Bhutan |
  | 2  | Bulgaria |
  | 3  | Indonesia |
  | 4  | Argentina |
  | 5  | Israel |
  | 6  | Myanmar |
  | 7  | Australia |
  | 8  | Azerbaijan |

- [ ] **Confirm SSH access works from GitHub Actions**
  The deploy workflow SSHes into the QNAP. Make sure the QNAP's `~/.ssh/authorized_keys` has the public key matching `QNAP_SSH_KEY`.

- [ ] **Confirm Docker is available on the QNAP**
  Container Station installs Docker. Verify:
  ```bash
  docker --version
  ```

---

## After first deploy

- [ ] **Check container logs on QNAP**
  ```bash
  docker logs travel-quizzer
  ```

- [ ] **Verify the app is reachable**
  Open `http://<qnap-ip>:9696` in your browser.

- [ ] **Log in with the seeded admin account**
  Email: `admin@example.com`  
  Password: `adminpass123`

- [ ] **Change the admin password** via the admin panel or by re-seeding with a new `countries.json`.
