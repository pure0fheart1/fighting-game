# Browser Brawl — Run and Deploy

This repository contains a simple browser-based 2D fighting game you can run locally or deploy to Cloud Run.

## Run Locally

Prerequisites: Node.js 18+

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev`
   - Opens a static server on `http://localhost:3000`
3. Production server (optional):
   `npm start`
   - Serves on port `8080` (or `${PORT}` if provided)

## Controls

- Player 1 (Red): Move A/D, Jump W, Block S, Attack Space
- Player 2 (Blue): Move ←/→, Jump ↑, Block ↓, Attack Enter
- Global: Pause/Resume Esc, Restart Round R

## Deploy to Google Cloud Run

A `cloudbuild.yaml` is included to deploy from source.

- Ensure you have `gcloud` configured and a project selected
- Trigger with Cloud Build:
  `gcloud builds submit --config=cloudbuild.yaml --project YOUR_PROJECT_ID`

The service name is `browser-fighting-game` and defaults to region `us-central1`.
