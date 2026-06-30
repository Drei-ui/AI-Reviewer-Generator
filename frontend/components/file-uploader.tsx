"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { UploadCloud, AlertCircle, FileText, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ReviewResult } from "@/components/review-result"
import { startReview, getReviewStatus, warmBackend, type Question } from "@/app/actions"

// Poll up to ~5 minutes (120 polls x 2.5s) before giving up.
const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 120
// Keep in sync with the backend's MAX_FILE_MB.
const MAX_FILE_BYTES = 10 * 1024 * 1024

const LOADING_STEPS = [
  "Uploading your PDF…",
  "Reading the document…",
  "Generating questions with AI…",
  "Almost there…",
]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [step, setStep] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Wake the (sleep-after-idle) backend as soon as the page loads.
  useEffect(() => {
    warmBackend().catch(() => {})
  }, [])

  // Advance the loading message while processing.
  useEffect(() => {
    if (!isUploading) {
      setStep(0)
      return
    }
    const id = setInterval(() => {
      setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1))
    }, 4000)
    return () => clearInterval(id)
  }, [isUploading])

  const acceptFile = (selected: File | undefined | null) => {
    setError(null)
    if (!selected) return
    if (selected.type !== "application/pdf") {
      setError("Please upload a PDF file.")
      return
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError("PDF is too large (max 10MB). Please choose a smaller file.")
      return
    }
    setFile(selected)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError("Please select a file to upload.")
      return
    }

    try {
      setIsUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append("pdf", file)

      const jobId = await startReview(formData)

      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

        let result
        try {
          result = await getReviewStatus(jobId)
        } catch {
          continue
        }

        if (result.status === "done") {
          setQuestions(result.questions)
          setIsUploading(false)
          return
        }
        if (result.status === "error") {
          setError(result.error || "Failed to process the PDF. Please try again.")
          setIsUploading(false)
          return
        }
      }

      setError("This is taking longer than expected. Please try again.")
      setIsUploading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process the PDF. Please try again.")
      console.error(err)
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setQuestions(null)
    setError(null)
  }

  if (questions) {
    return <ReviewResult questions={questions} onReset={resetForm} />
  }

  return (
    <div className="w-full rounded-3xl border border-primary/25 bg-gradient-to-b from-black/80 to-[#00140a]/80 backdrop-blur-md p-6 sm:p-8 relative z-10 matrix-glow">
      {error && (
        <Alert variant="destructive" className="mb-5 border-destructive/40 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isUploading ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-primary matrix-glow" />
            <div
              className="absolute inset-2 animate-spin rounded-full border-b-2 border-secondary"
              style={{ animationDirection: "reverse", animationDuration: "1.4s" }}
            />
            <div className="absolute inset-0 grid place-items-center">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-base font-medium text-foreground transition-all">
            {LOADING_STEPS[step]}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Large documents can take up to a minute.
          </p>
          <div className="mt-5 flex gap-1.5">
            {LOADING_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i <= step ? "w-6 bg-primary" : "w-1.5 bg-primary/25"
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragActive(false)
              acceptFile(e.dataTransfer.files?.[0])
            }}
            className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all cursor-pointer ${
              dragActive
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-primary/30 hover:border-primary/60 hover:bg-primary/[0.04]"
            }`}
          >
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 transition-transform group-hover:scale-110">
              <UploadCloud className="h-8 w-8 text-primary matrix-text-glow" />
            </div>
            <p className="text-base font-semibold text-foreground">
              {dragActive ? "Drop your PDF here" : "Drag & drop your PDF"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              or <span className="text-primary underline-offset-2 group-hover:underline">browse</span> · PDF up to 10MB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => acceptFile(e.target.files?.[0])}
              className="hidden"
            />
          </div>

          {file && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-black/40 px-4 py-3 animate-in fade-in slide-in-from-bottom-1">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              disabled={!file}
              className="gap-2 bg-gradient-to-r from-primary to-secondary px-6 text-black font-semibold transition-all hover:opacity-90 disabled:opacity-40 matrix-glow"
            >
              <Sparkles className="h-4 w-4" />
              Generate Quiz
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
