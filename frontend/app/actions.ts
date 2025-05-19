"use server"

import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"

export async function reviewPdf(formData: FormData) {
  try {
    const pdfFile = formData.get("pdf") as File

    if (!pdfFile) {
      throw new Error("No PDF file provided")
    }

    // Convert the file to a buffer
    const bytes = await pdfFile.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate the review using Claude (which has PDF understanding capabilities)
    const { text } = await generateText({
      model: anthropic("claude-3-5-sonnet"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please review this PDF document and provide a comprehensive analysis. Include the following in your review:\n\n1. A summary of the main content and purpose\n2. Key points or arguments presented\n3. Structure and organization assessment\n4. Writing style and clarity evaluation\n5. Strengths of the document\n6. Areas for improvement\n\nKeep your review professional, constructive, and detailed.",
            },
            {
              type: "image",
              image: buffer,
              media_type: "application/pdf",
            },
          ],
        },
      ],
    })

    return text
  } catch (error) {
    console.error("Error processing PDF:", error)
    throw new Error("Failed to process the PDF")
  }
}
