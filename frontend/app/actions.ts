"use server"

export async function reviewPdf(formData: FormData) {
  try {
    const pdfFile = formData.get("pdf") as File
    
    if (!pdfFile) {
      throw new Error("No PDF file provided")
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) {
      throw new Error("API URL not configured")
    }
    
    const response = await fetch(`${apiUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to process PDF')
    }

    const data = await response.json()
    
    // Format the questions into a readable text
    const questionsText = data.questions.map((q: any, index: number) => {
      return `
Question ${index + 1}: ${q.question}

Options:
${q.options.join('\n')}

Correct Answer: ${q.answer}
-------------------`
    }).join('\n\n')

    return questionsText

  } catch (error) {
    console.error("Error processing PDF:", error)
    throw new Error("Failed to process the PDF")
  }
}
