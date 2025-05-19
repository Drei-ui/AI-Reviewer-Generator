import { FileUploader } from "@/components/file-uploader"
import { ReviewerHero } from "@/components/reviewer-hero"
import { MatrixBackground } from "@/components/matrix-background"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-24 bg-gradient-to-b from-black via-black/95 to-[#001a00]">
      <MatrixBackground />
      <div className="max-w-3xl w-full space-y-8">
        <ReviewerHero />
        <FileUploader />
      </div>
    </main>
  )
}
