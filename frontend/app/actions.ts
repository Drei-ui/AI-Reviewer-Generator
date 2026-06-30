"use server"

function getApiUrl() {
  // .trim() also strips a stray leading BOM (U+FEFF counts as JS whitespace),
  // which otherwise makes the URL unparseable ("TypeError: Failed to parse URL").
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (!apiUrl) {
    throw new Error("API URL not configured")
  }
  return apiUrl
}

// Best-effort wake-up for the free-tier backend, which sleeps after idle and
// takes ~50s to cold-start. Pinged when the uploader mounts so the instance is
// awake by the time the user submits. Failures are ignored on purpose.
export async function warmBackend(): Promise<void> {
  try {
    await fetch(`${getApiUrl()}/api/health`, { cache: "no-store" })
  } catch {
    // ignore — best-effort
  }
}

// POST with a few retries and a hard per-attempt timeout. A cold or
// redeploying backend can briefly refuse or stall connections; the timeout
// guarantees we fail fast (and retry) instead of hanging near the platform's
// function time limit.
async function postWithRetry(
  url: string,
  makeInit: () => RequestInit,
  retries = 2,
  perAttemptTimeoutMs = 20000,
): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), perAttemptTimeoutMs)
    try {
      return await fetch(url, { ...makeInit(), signal: controller.signal })
    } catch (err) {
      lastErr = err
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      }
    } finally {
      clearTimeout(timer)
    }
  }
  console.error("postWithRetry exhausted:", lastErr)
  throw new Error(
    `Couldn't reach the server (${String(lastErr)}). It may be starting up — please try again.`,
  )
}

// Kick off processing on the backend and return a job id immediately.
export async function startReview(formData: FormData): Promise<string> {
  const pdfFile = formData.get("pdf") as File
  if (!pdfFile) {
    throw new Error("No PDF file provided")
  }

  // Send the PDF as a RAW request body, not multipart. Forwarding a rebuilt
  // FormData/Blob from a server action can hang in the Next.js runtime; a plain
  // byte body is sent cleanly with a content-length. The backend accepts both.
  const buf = Buffer.from(await pdfFile.arrayBuffer())
  const makeInit = (): RequestInit => ({
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: buf,
    cache: "no-store",
  })

  const response = await postWithRetry(`${getApiUrl()}/api/upload`, makeInit)

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    // Surface the backend's specific message (e.g. "PDF too large (max 10MB)").
    throw new Error(data.error || `Upload failed (${response.status})`)
  }

  const data = await response.json()
  return data.jobId as string
}

export type Question = {
  question: string
  options: string[]
  answer: string
}

export type ReviewStatus =
  | { status: "processing" }
  | { status: "done"; questions: Question[] }
  | { status: "error"; error: string }

// Poll the backend for a job's status, returning the structured questions when
// done so the UI can render an interactive quiz.
export async function getReviewStatus(jobId: string): Promise<ReviewStatus> {
  const response = await fetch(`${getApiUrl()}/api/jobs/${jobId}`, {
    cache: "no-store",
  })

  // Definitive: the job is gone (worker restarted / spun down mid-job).
  if (response.status === 404) {
    return {
      status: "error",
      error: "The server restarted and lost this job. Please upload again.",
    }
  }

  // Other non-2xx are likely transient — throw so the caller can keep polling.
  if (!response.ok) {
    throw new Error(`Status check failed (${response.status})`)
  }

  const data = await response.json()

  if (data.status === "error") {
    return { status: "error", error: data.error || "Processing failed" }
  }

  if (data.status === "done") {
    return { status: "done", questions: (data.questions ?? []) as Question[] }
  }

  return { status: "processing" }
}
