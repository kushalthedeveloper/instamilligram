# Instamilligram 📸

An Instagram-inspired social platform concept with username/password account access planned. Original brand and UI.

## Current prototype
- Responsive dark/light UI
- Feed with sample posts, likes, comments
- Stories strip
- Explore/Reels visual grid
- Username search and follow interaction
- Create post (image URL)
- Mobile navigation

## Development status
This repository currently contains a front-end prototype. Real multi-user authentication, database persistence, media uploads, private messaging, stories expiry, and deployment need backend integration before production use.

## Security plan
Username/password auth must be implemented server-side with Argon2id or bcrypt password hashing, rate-limited login, secure HttpOnly session cookies, CSRF protections, and recovery codes. Never store plaintext passwords or authentication secrets in the browser. Username-only signup means users must save a recovery code; there is no email reset.

## Run locally
Serve the static files with any local web server, e.g. `python -m http.server 8000`, then visit `http://localhost:8000`.
