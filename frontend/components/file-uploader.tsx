"use client"

import type React from "react"

import { useState } from "react"
import { Upload, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoadingAnimation } from "@/components/loading-animation"
import { ReviewResult } from "@/components/review-result"
import { startReview, getReviewStatus } from "@/app/actions"

// Poll up to ~5 minutes (120 polls x 2.5s) before giving up.
const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 120

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setError(null)

    if (!selectedFile) {
      return
    }

    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a PDF file")
      return
    }

    setFile(selectedFile)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setError("Please select a file to upload")
      return
    }

    try {
      setIsUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append("pdf", file)

      const jobId = await startReview(formData)

      // Poll the backend until the job finishes or errors.
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

        const result = await getReviewStatus(jobId)

        if (result.status === "done") {
          setReview(result.review)
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
      setError("Failed to process the PDF. Please try again.")
      console.error(err)
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setReview(null)
    setError(null)
  }

  if (review) {
    return <ReviewResult review={review} onReset={resetForm} />
  }

  return (
    <Card className="w-full shadow-lg border border-primary/30 bg-gradient-to-b from-black/80 to-[#001800]/80 backdrop-blur-sm relative z-10 matrix-glow">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-lg border-b border-primary/20">
        <CardTitle className="text-foreground matrix-text-glow">Upload PDF</CardTitle>
        <CardDescription>Upload a PDF document to get an AI-powered review</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingAnimation />
            <p className="mt-6 text-sm text-muted-foreground">Processing your document...</p>
            <div className="mt-2 text-xs text-primary animate-pulse matrix-text-glow">This may take a few moments</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div
              className="border border-primary/30 rounded-lg p-12 text-center cursor-pointer hover:bg-gradient-to-r hover:from-primary/5 hover:to-secondary/5 transition-colors"
              onClick={() => document.getElementById("pdf-upload")?.click()}
            >
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-3 rounded-full">
                  <Upload className="h-6 w-6 text-primary matrix-text-glow" />
                </div>
              </div>
              <div className="text-sm font-medium mb-1 text-foreground">
                {file ? file.name : "Click to upload or drag and drop"}
              </div>
              <p className="text-xs text-muted-foreground">PDF (max 10MB)</p>
              <input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                type="submit"
                disabled={!file || isUploading}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300 text-black font-medium matrix-glow"
              >
                {"Generate Review"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
