export function LoadingAnimation() {
  return (
    <div className="flex items-center justify-center">
      <div className="relative h-16 w-16">
        <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-t-2 border-b-2 border-primary animate-spin matrix-glow"></div>
        </div>
        <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
          <div
            className="h-8 w-8 rounded-full border-t-2 border-b-2 border-secondary animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          ></div>
        </div>
        <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
          <div
            className="h-4 w-4 rounded-full border-t-2 border-b-2 border-accent animate-spin"
            style={{ animationDuration: "0.75s" }}
          ></div>
        </div>
      </div>
    </div>
  )
}
