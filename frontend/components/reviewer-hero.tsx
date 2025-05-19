import { FileText } from "lucide-react"

export function ReviewerHero() {
  return (
    <div className="text-center space-y-4 relative z-10">
      <div className="flex justify-center">
        <div className="bg-gradient-to-br from-primary to-secondary p-4 rounded-full shadow-lg matrix-glow animate-glow">
          <FileText className="h-10 w-10 text-black" />
        </div>
      </div>
      <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent matrix-text-glow">
        PDF Reviewer
      </h1>
    </div>
  )
}
