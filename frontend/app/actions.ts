"use server"

function getApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) {
    throw new Error("API URL not configured")
  }
  return apiUrl
}

// Kick off processing on the backend and return a job id immediately.
// The backend extracts the PDF and calls Claude in the background, so this
// request returns fast and never risks hitting the platform request timeout.
export async function startReview(formData: FormData): Promise<string> {
  const pdfFile = formData.get("pdf") as File
  if (!pdfFile) {
    throw new Error("No PDF file provided")
  }

  const response = await fetch(`${getApiUrl()}/api/upload`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || "Failed to start processing")
  }

  const data = await response.json()
  return data.jobId as string
}

export type ReviewStatus =
  | { status: "processing" }
  | { status: "done"; review: string }
  | { status: "error"; error: string }

// Poll the backend for a job's status. When done, format the questions into
// the readable text the result view expects.
export async function getReviewStatus(jobId: string): Promise<ReviewStatus> {
  const response = await fetch(`${getApiUrl()}/api/jobs/${jobId}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || "Failed to fetch status")
  }

  const data = await response.json()

  if (data.status === "error") {
    return { status: "error", error: data.error || "Processing failed" }
  }

  if (data.status === "done") {
    const questionsText = data.questions
      .map((q: any, index: number) => {
        return `
Question ${index + 1}: ${q.question}

Options:
${q.options.join("\n")}

Correct Answer: ${q.answer}
-------------------`
      })
      .join("\n\n")

    return { status: "done", review: questionsText }
  }

  return { status: "processing" }
}
