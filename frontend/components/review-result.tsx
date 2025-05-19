"use client"

import { FileText, RotateCcw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface ReviewResultProps {
  review: string
  onReset: () => void
}

export function ReviewResult({ review, onReset }: ReviewResultProps) {
  const handleDownload = () => {
    const blob = new Blob([review], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "pdf-review.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="w-full shadow-lg border border-primary/30 bg-gradient-to-b from-black/80 to-[#001800]/80 backdrop-blur-sm relative z-10 matrix-glow">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-lg border-b border-primary/20">
        <CardTitle className="flex items-center gap-2 text-foreground matrix-text-glow">
          <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-1.5 rounded-full">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          Document Review
        </CardTitle>
        <CardDescription>AI-generated review of your document</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="prose prose-sm max-w-none prose-invert">
          {review.split("\n").map((paragraph, index) =>
            paragraph.trim() ? (
              <p key={index} className={index === 0 ? "text-lg font-medium text-primary matrix-text-glow" : ""}>
                {paragraph}
              </p>
            ) : (
              <br key={index} />
            ),
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-b-lg border-t border-primary/20">
        <Button
          onClick={onReset}
          variant="outline"
          className="gap-2 border-primary/30 hover:bg-primary/10 text-foreground"
        >
          <RotateCcw className="h-4 w-4 text-primary" />
          Review another document
        </Button>
        <Button
          onClick={handleDownload}
          className="gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-black font-medium matrix-glow"
        >
          <Download className="h-4 w-4" />
          Download Review
        </Button>
      </CardFooter>
    </Card>
  )
}
