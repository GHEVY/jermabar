import os
import random
import requests
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import lru_cache

app = Flask(__name__)
CORS(app)

# Settings
HF_TOKEN = os.environ.get("HF_TOKEN")
HF_API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
headers = {"Authorization": f"Bearer {HF_TOKEN}"}

# Load Dictionary
VALID_WORDS = set()
try:
    with open("valid_words.txt", "r", encoding="utf-8") as f:
        for line in f:
            word = line.strip().lower()
            if word: 
                VALID_WORDS.add(word)
    print(f"Loaded {len(VALID_WORDS)} words.")
except Exception as e:
    print(f"Error loading dictionary: {e}")

# AI Vector Logic
@lru_cache(maxsize=1000)
def get_vector(word):
    try:
        response = requests.post(HF_API_URL, headers=headers, json={"inputs": [word]})
        if response.status_code != 200:
            print(f"HF Error: {response.status_code} - {response.text}")
            return None
        vectors = response.json()
        return np.array(vectors[0])
    except Exception as e:
        print(f"Request error: {e}")
        return None

def cosine_similarity(v1, v2):
    n1, n2 = np.linalg.norm(v1), np.linalg.norm(v2)
    return np.dot(v1, v2) / (n1 * n2) if n1 > 0 and n2 > 0 else 0

# Routes
@app.route('/')
def home():
    return "Jermabar API is active."

@app.route('/get_initial_word', methods=['GET'])
def get_initial_word():
    if not VALID_WORDS:
        return jsonify({"error": "Բառարանը դատարկ է"}), 500
    
    random_word = random.choice(list(VALID_WORDS))
    return jsonify({"word": random_word})

@app.route('/guess', methods=['POST'])
def guess():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No data provided"}), 400

    user_word = data.get('word', '').lower().strip()
    secret_word = data.get('secret', '').lower().strip()

    if not user_word or not secret_word:
        return jsonify({"error": "Տվյալները թերի են"}), 400
    
    if user_word not in VALID_WORDS:
        return jsonify({"error": "Բառը չկա բազայում"}), 404

    v_user = get_vector(user_word)
    v_secret = get_vector(secret_word)

    if v_user is None or v_secret is None:
        return jsonify({"error": "AI-ն անհասանելի է (ստուգեք Token-ը)"}), 500

    score = cosine_similarity(v_user, v_secret)
    final_score = max(0, min(100, round(float(score) * 100, 2)))

    return jsonify({
        "word": user_word,
        "score": final_score,
        "is_correct": user_word == secret_word
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
