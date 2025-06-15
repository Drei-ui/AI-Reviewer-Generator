from flask import Flask, request, jsonify
from flask_cors import CORS
import pdfplumber
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["POST"],
        "allow_headers": ["Content-Type"]
    }
})

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route('/api/upload', methods=['POST'])
def upload_pdf():
    if 'pdf' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['pdf']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Extract text from PDF
    with pdfplumber.open(file) as pdf:
        text = ''
        for page in pdf.pages:
            text += page.extract_text() or ''

    if not text.strip():
        return jsonify({'error': 'No text found in PDF'}), 400

    # AI Prompt
    prompt = f"""
You are an expert educator. Based on the following content, generate multiple-choice questions.
Each question should have 4 options labeled and, and indicate the correct answer clearly.

Content:
{text[:3000]}  # truncate if too long

Format:
[
  {{
    "question": "What is React?",
    "options": ["a) A database", "b) A frontend library", "c) A compiler", "d) A server"],
    "answer": "b) A frontend library"
  }},
  ...
]
"""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )

        output = response.choices[0].message.content
        questions = eval(output)  # use json.loads() if it's a valid JSON string

        return jsonify({'questions': questions})

    except Exception as e:
        print(f"Error: {str(e)}")  # Better error logging
        return jsonify({'error': 'Failed to generate questions'}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
