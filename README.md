# Browser Brawl

A simple 2D browser-based fighting game built with HTML5 Canvas. Play locally or deploy to Cloud Run.

## Run Locally

Prerequisites: Node.js 18+

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev`
3. Open the game at `http://localhost:3000`

## Controls

- Player 1 (Red): Move A/D, Jump W, Block S, Attack Space
- Player 2 (Blue): Move ←/→, Jump ↑, Block ↓, Attack Enter
- Pause/Resume: Esc
- CPU Toggle: Button at the top toggles CPU control for Player 2 (default: On)
- On mobile screens, on-screen buttons control Player 1

## Docker

Build and run with Docker:

```bash
docker build -t browser-brawl .
docker run -p 8080:8080 browser-brawl
```

Open `http://localhost:8080`.

## Deploy to Cloud Run (optional)

This repo includes a `cloudbuild.yaml` that deploys directly to Cloud Run using Cloud Build.

- Ensure you have `gcloud` configured and permissions to deploy Cloud Run services.
- Trigger a build:

```bash
gcloud builds submit --config=cloudbuild.yaml --project YOUR_PROJECT_ID
```

The service will be deployed as `browser-fighting-game` in region `us-central1`. Use `mcp-cloudbuild.js` if you want to integrate with MCP tooling.
