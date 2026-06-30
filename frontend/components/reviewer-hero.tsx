import { Sparkles, GraduationCap } from "lucide-react"

export function ReviewerHero() {
  return (
    <div className="text-center space-y-5 relative z-10">
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Powered by Claude
        </span>
      </div>

      <div className="flex justify-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg matrix-glow animate-glow">
          <GraduationCap className="h-9 w-9 text-black" />
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent matrix-text-glow">
            PDF to Quiz
          </span>
        </h1>
        <p className="mx-auto max-w-md text-sm sm:text-base text-muted-foreground leading-relaxed">
          Turn any document into an interactive multiple-choice quiz. Upload a PDF and study
          smarter in seconds.
        </p>
      </div>
    </div>
  )
}
