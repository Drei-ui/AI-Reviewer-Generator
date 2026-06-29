from flask import Flask, request, jsonify
from flask_cors import CORS
import pdfplumber
from anthropic import Anthropic
import os
import json
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Allowed frontend origins (comma-separated). Defaults to local dev;
# set FRONTEND_ORIGIN to your deployed frontend URL in production.
frontend_origins = [
    o.strip()
    for o in os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(",")
    if o.strip()
]
CORS(app, resources={
    r"/api/*": {
        "origins": frontend_origins,
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

    # Extract text from PDF. Only the first MAX_CHARS characters are sent to the
    # model, so stop reading pages as soon as we have enough — this avoids
    # spending many seconds extracting a large document (which can exceed the
    # web server's worker timeout) when a few pages already cover the prompt.
    MAX_CHARS = 3000
    try:
        with pdfplumber.open(file) as pdf:
            text = ''
            for page in pdf.pages:
                text += page.extract_text() or ''
                if len(text) >= MAX_CHARS:
                    break
    except Exception as e:
        print(f"PDF extraction error: {str(e)}")
        return jsonify({'error': 'Could not read the PDF'}), 400

    if not text.strip():
        return jsonify({'error': 'No text found in PDF'}), 400

    # AI Prompt
    prompt = f"""You are an expert educator. Based on the following content, generate multiple-choice questions.
Each question should have 4 options labeled a) through d), and indicate the correct answer clearly.

Content:
{text[:MAX_CHARS]}"""

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
