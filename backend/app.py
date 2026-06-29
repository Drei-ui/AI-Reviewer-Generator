from flask import Flask, request, jsonify
from flask_cors import CORS
import fitz  # PyMuPDF
from anthropic import Anthropic
import os
import json
import time
import uuid
import sqlite3
import threading
from contextlib import closing
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Allowed frontend origins (comma-separated). Defaults to local dev;
# set FRONTEND_ORIGIN to your deployed frontend URL in production.
frontend_origins = [
    o.strip()
    for o in os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(",")
    if o.strip()
]
CORS(app, resources={
    r"/api/*": {
        "origins": frontend_origins,
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"]
    }
})

# Initialize Anthropic (Claude) client
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Reject uploads larger than this. Matches the uploader's "max 10MB" hint.
MAX_FILE_MB = 10
# Upper bound on characters sent to the model. The whole document is read; this
# is only a guard so a pathologically text-dense PDF can't overflow the model's
# context window. It sits far above any realistic <=10MB study document
# (~1,000 chars/page, so this covers ~400 pages).
MAX_CHARS = 400_000

# SQLite-backed job store. Processing happens in a background thread so the
# upload request can return immediately — large PDFs take longer than a
# synchronous request (and the platform's request timeouts) would allow.
# Persisting to SQLite (instead of an in-memory dict) means a job survives a
# worker restart or crash within the running container.
# NOTE: on hosts with an ephemeral filesystem (e.g. Render free tier) the DB
# file is cleared on full redeploys/spin-downs; point JOBS_DB_PATH at a
# persistent disk, or use an external store, for durability across those.
JOB_TTL_SECONDS = 60 * 60  # forget finished jobs after an hour
DB_PATH = os.getenv("JOBS_DB_PATH", os.path.join(os.path.dirname(__file__), "jobs.db"))
db_lock = threading.Lock()


def _connect():
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _init_db():
    with db_lock, closing(_connect()) as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                questions TEXT,
                error TEXT,
                created REAL NOT NULL
            )"""
        )
        conn.commit()


_init_db()


def _set_job(job_id, status, questions=None, error=None, created=None):
    with db_lock, closing(_connect()) as conn:
        if created is None:
            row = conn.execute("SELECT created FROM jobs WHERE id=?", (job_id,)).fetchone()
            created = row[0] if row else time.time()
        conn.execute(
            """INSERT INTO jobs (id, status, questions, error, created)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 status=excluded.status,
                 questions=excluded.questions,
                 error=excluded.error""",
            (
                job_id,
                status,
                json.dumps(questions) if questions is not None else None,
                error,
                created,
            ),
        )
        conn.commit()


def _get_job(job_id):
    with db_lock, closing(_connect()) as conn:
        row = conn.execute(
            "SELECT status, questions, error FROM jobs WHERE id=?", (job_id,)
        ).fetchone()
    if row is None:
        return None
    return {
        "status": row[0],
        "questions": json.loads(row[1]) if row[1] else [],
        "error": row[2],
    }


def _purge_old_jobs():
    cutoff = time.time() - JOB_TTL_SECONDS
    with db_lock, closing(_connect()) as conn:
        conn.execute("DELETE FROM jobs WHERE created < ?", (cutoff,))
        conn.commit()


def process_pdf(job_id, pdf_bytes):
    """Extract text from every page and ask Claude to generate questions."""
    try:
        # PyMuPDF extracts text quickly with a small, bounded memory footprint
        # (pdfplumber peaks ~400MB+ on large image-heavy PDFs and OOMs a small
        # instance; PyMuPDF stays well under that).
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        parts = []
        total = 0
        for page in doc:
            page_text = page.get_text() or ''
            parts.append(page_text)
            total += len(page_text)
            if total >= MAX_CHARS:
                break
        doc.close()
        text = "".join(parts)[:MAX_CHARS]
    except Exception as e:
        print(f"Job {job_id} extraction error: {str(e)}")
        _set_job(job_id, status="error", error="Could not read the PDF")
        return

    if not text.strip():
        _set_job(job_id, status="error", error="No text found in PDF")
        return

    prompt = f"""You are an expert educator. Based on the following content, generate a comprehensive set of multiple-choice questions (aim for 15-30) that cover the key concepts from across the entire document.
Each question must have 4 options, each labeled a) through d) (e.g. "a) ...").
The "answer" field must be the full text of the correct option exactly as it appears in the options list, including its letter label (e.g. "b) ...") — not just the letter.

Content:
{text}"""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}],
            output_config={
                "format": {
                    "type": "json_schema",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "questions": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "question": {"type": "string"},
                                        "options": {
                                            "type": "array",
                                            "items": {"type": "string"}
                                        },
                                        "answer": {"type": "string"}
                                    },
                                    "required": ["question", "options", "answer"],
                                    "additionalProperties": False
                                }
                            }
                        },
                        "required": ["questions"],
                        "additionalProperties": False
                    }
                }
            }
        )

        # output_config.format guarantees the first block is text with valid JSON
        output = next(b.text for b in response.content if b.type == "text")
        data = json.loads(output)
        _set_job(job_id, status="done", questions=data["questions"])

    except Exception as e:
        print(f"Job {job_id} generation error: {str(e)}")
        _set_job(job_id, status="error", error="Failed to generate questions")


@app.route('/api/upload', methods=['POST'])
def upload_pdf():
    if 'pdf' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['pdf']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    pdf_bytes = file.read()
    if len(pdf_bytes) > MAX_FILE_MB * 1024 * 1024:
        return jsonify({'error': f'PDF too large (max {MAX_FILE_MB}MB)'}), 413

    _purge_old_jobs()

    job_id = uuid.uuid4().hex
    _set_job(job_id, status="processing", created=time.time())
    threading.Thread(
        target=process_pdf, args=(job_id, pdf_bytes), daemon=True
    ).start()

    return jsonify({'jobId': job_id}), 202


@app.route('/api/jobs/<job_id>', methods=['GET'])
def job_status(job_id):
    job = _get_job(job_id)
    if job is None:
        return jsonify({'error': 'Job not found'}), 404

    status = job.get("status")
    if status == "done":
        return jsonify({'status': 'done', 'questions': job.get("questions", [])})
    if status == "error":
        return jsonify({'status': 'error', 'error': job.get("error", "Processing failed")})
    return jsonify({'status': 'processing'})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
