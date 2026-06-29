# AI Reviewer Generator

Turn any PDF into a set of multiple-choice review questions. Upload a document — lecture notes, a textbook chapter, study material — and the app uses **Claude** to generate practice questions with labeled options and answers, served behind a Matrix-themed web UI.

## How it works

```
┌──────────────┐   PDF upload    ┌──────────────┐   extracted text   ┌─────────┐
│  Next.js UI  │ ──────────────► │  Flask API   │ ─────────────────► │ Claude  │
│  (frontend)  │ ◄────────────── │  (backend)   │ ◄───────────────── │  Opus   │
└──────────────┘  questions JSON └──────────────┘   MCQ JSON         └─────────┘
```

1. The user uploads a PDF in the Next.js frontend.
2. A server action forwards it to the Flask backend (`POST /api/upload`).
3. The backend extracts text with `pdfplumber` and sends it to Claude.
4. Claude returns multiple-choice questions as structured JSON, which the UI renders.

## Tech stack

| Layer    | Stack                                                            |
| -------- | --------------------------------------------------------------- |
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui      |
| Backend  | Flask, flask-cors, pdfplumber                                   |
| AI       | Claude (`claude-opus-4-8`) via the official `anthropic` SDK     |

## Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.10+
- An **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com)

## Getting started

### 1. Clone

```bash
git clone https://github.com/Drei-ui/AI-Reviewer-Generator.git
cd AI-Reviewer-Generator
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env` with your Anthropic key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
```

Create `frontend/.env.local` pointing at the backend:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 4. Run both servers

From the project root, use the helper scripts:

```bash
# Windows
dev.bat

# macOS / Linux
./dev.sh
```

Or run each manually in separate terminals:

```bash
# Terminal 1 — backend
cd backend && flask run        # http://localhost:5000

# Terminal 2 — frontend
cd frontend && npm run dev      # http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000), upload a PDF, and click **Generate Review**.

## Configuration

| Variable              | Location              | Description                                      |
| --------------------- | --------------------- | ------------------------------------------------ |
| `ANTHROPIC_API_KEY`   | `backend/.env`        | Your Anthropic API key (required).               |
| `FRONTEND_ORIGIN`     | `backend/.env`        | Allowed frontend origin(s) for CORS, comma-separated. Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Base URL of the Flask backend.                   |

Example env files are provided at [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example).

To use a cheaper/faster model, change the `model` in [`backend/app.py`](backend/app.py) (e.g. `claude-haiku-4-5`).

## Deployment

The frontend deploys to **Vercel** and the backend to **Render**. Deploy the backend first so you have its URL for the frontend.

### Backend → Render

This repo includes a [`render.yaml`](render.yaml) blueprint.

1. Push this repo to GitHub (already done if you cloned it from there).
2. In the [Render dashboard](https://dashboard.render.com), click **New → Blueprint** and select this repository. Render reads `render.yaml` and provisions the `ai-reviewer-backend` web service.
3. In the service's **Environment** tab, set:
   - `ANTHROPIC_API_KEY` — your Anthropic key
   - `FRONTEND_ORIGIN` — your Vercel URL (e.g. `https://your-app.vercel.app`); you can fill this in after the frontend is deployed
4. Deploy. Note the resulting URL, e.g. `https://ai-reviewer-backend.onrender.com`.

The blueprint runs the app with Gunicorn (`gunicorn app:app --bind 0.0.0.0:$PORT`). On Render's free tier the service sleeps when idle, so the first request after a pause may take a few seconds.

### Frontend → Vercel

1. In [Vercel](https://vercel.com/new), import this repository.
2. Set **Root Directory** to `frontend` (Vercel auto-detects Next.js).
3. Add an environment variable:
   - `NEXT_PUBLIC_API_URL` — your Render backend URL from the step above
4. Deploy.

After both are live, set `FRONTEND_ORIGIN` on Render to your final Vercel URL and redeploy the backend.

## API

### `POST /api/upload`

Multipart form upload with a single `pdf` field.

**Response**

```json
{
  "questions": [
    {
      "question": "What is React?",
      "options": ["a) A database", "b) A frontend library", "c) A compiler", "d) A server"],
      "answer": "b) A frontend library"
    }
  ]
}
```

Errors return `{ "error": "..." }` with a `400` (bad/empty input) or `500` (generation failure).

## Project structure

```
AI-Reviewer-Generator/
├── backend/
│   ├── app.py             # Flask API — PDF extraction + Claude call
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx        # Home page
│   │   └── actions.ts      # Server action that calls the backend
│   └── components/         # UI (uploader, results, Matrix background)
├── dev.bat / dev.sh        # Start frontend + backend together
└── README.md
```

## License

MIT
