"use client"

import { useEffect, useRef } from "react"

export function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas to full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Matrix characters - using a mix of numbers, letters and symbols
    const characters = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン"
    const fontSize = 14
    const columns = Math.floor(canvas.width / fontSize)

    // Array to track the y position of each column
    const drops: number[] = []

    // Initialize all columns
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100
    }

    // Drawing the characters
    const draw = () => {
      // Add semi-transparent black rectangle on top of previous frame
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Set color and font for the falling characters
      ctx.fillStyle = "#00ff4180" // Semi-transparent green
      ctx.font = `${fontSize}px monospace`

      // Loop through each column
      for (let i = 0; i < drops.length; i++) {
        // Select a random character
        const text = characters[Math.floor(Math.random() * characters.length)]

        // Draw the character
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)

        // Move the drop down
        drops[i]++

        // Send the drop back to the top randomly after it crosses the screen
        // Also randomize the reset position for varied effect
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
      }
    }

    // Animation loop
    const interval = setInterval(draw, 50)

    return () => {
      clearInterval(interval)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 opacity-30"
      style={{ pointerEvents: "none" }}
    />
  )
}
