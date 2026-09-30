# Workspace

[![CI](https://github.com/yavuzibr98/workspace/actions/workflows/ci.yml/badge.svg)](https://github.com/yavuzibr98/workspace/actions/workflows/ci.yml)

A desktop app to chat with a **GitHub repository**, a **YouTube video**, or a **Hugging Face model/dataset** — without downloading, cloning, or watching anything. Workspace fetches only what's needed on demand and lets an LLM answer your questions about it.

## Features

- 🗂️ **GitHub repos** — ask about architecture, features, and code structure; browse branches and files on demand.
- 🎥 **YouTube videos** — ask about content and topics based on the video's transcript, with timestamp references.
- 🤗 **Hugging Face models & datasets** — inspect the card, README, file listing, and (for datasets) real sample rows and exact size.
- Bring your own model: use [OpenRouter](https://openrouter.ai) (any hosted model) or a fully local [Ollama](https://ollama.com) model.
- Local SQLite cache, so repeated questions about the same source don't re-fetch data.
- Light/dark theme.

## Download (Windows)

No install, no build needed — grab the portable `.exe` from the [Releases page](https://github.com/yavuzibr98/workspace/releases/latest) and run it directly. Nothing is installed on your system; it's a single portable executable.

## Running from source

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- npm

### Install & run

```bash
npm install
npm run dev
```

This starts the app in development mode (Electron + hot-reloading renderer).

### Build a distributable

```bash
npm run build      # type-checks and bundles main/preload/renderer
npm run release    # produces a portable Windows executable in dist/
```

## Configuration

All configuration is done from the in-app **Settings** panel — no `.env` file needed:

- **GitHub token** (optional): raises GitHub API rate limits and allows access to private repos you have access to. Create one at [github.com/settings/tokens](https://github.com/settings/tokens) (no scopes needed for public repos).
- **LLM provider**:
  - **OpenRouter**: paste an API key from [openrouter.ai/keys](https://openrouter.ai/keys) and pick a model.
  - **Ollama**: run `ollama serve` locally and pick a pulled model (e.g. `ollama pull llama3.1:8b`) — no API key needed, fully offline/local.

Secrets are encrypted at rest using Electron's OS-backed `safeStorage` and are never displayed in plaintext after being saved.

## Development

```bash
npm run typecheck   # type-check main + renderer
npm run lint        # ESLint
npm run format      # Prettier (writes)
npm run test        # Vitest unit tests
```

## Tech stack

Electron, React, TypeScript, Tailwind CSS, Zustand, better-sqlite3, Octokit, OpenAI SDK (used against OpenRouter/Ollama's OpenAI-compatible APIs).

## License

[MIT](LICENSE)
