from flask import Flask, request, jsonify
from flask_cors import CORS
import pdfplumber
from anthropic import Anthropic
import os
import json
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

# Initialize Anthropic (Claude) client
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

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
    prompt = f"""You are an expert educator. Based on the following content, generate multiple-choice questions.
Each question should have 4 options labeled a) through d), and indicate the correct answer clearly.

Content:
{text[:3000]}"""

    try:
        response = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
            output_config={
                "format": {
                    "type": "json_schema",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "questions": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "question": {"type": "string"},
                                        "options": {
                                            "type": "array",
                                            "items": {"type": "string"}
                                        },
                                        "answer": {"type": "string"}
                                    },
                                    "required": ["question", "options", "answer"],
                                    "additionalProperties": False
                                }
                            }
                        },
                        "required": ["questions"],
                        "additionalProperties": False
                    }
                }
            }
        )

        # output_config.format guarantees the first block is text with valid JSON
        output = next(b.text for b in response.content if b.type == "text")
        data = json.loads(output)

        return jsonify({'questions': data['questions']})

    except Exception as e:
        print(f"Error: {str(e)}")  # Better error logging
        return jsonify({'error': 'Failed to generate questions'}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
