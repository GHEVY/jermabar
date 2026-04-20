from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# 1. Օգտագործում ենք ամենահուսալի մոդելը
HF_TOKEN = os.getenv("HF_TOKEN")
API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

# 2. Բառարանի բեռնում (եթե ֆայլը չկա, որ չփլվի)
def load_dictionary():
    try:
        if os.path.exists('valid_words.txt'):
            with open('valid_words.txt', 'r', encoding='utf-8') as f:
                return set(line.split()[0].lower() for line in f)
    except:
        pass
    return {"խնձոր", "տանձ", "սեղան", "աթոռ"} # Պահեստային բառեր

allowed_words = load_dictionary()

def get_embedding(text):
    try:
        response = requests.post(API_URL, headers=HEADERS, json={"inputs": text}, timeout=15)
        if response.status_code == 503: return "loading"
        if response.status_code != 200: return "error"
        
        result = response.json()
        return np.array(result)
    except:
        return "error"

@app.route('/get_initial_word', methods=['GET'])
def get_initial_word():
    return jsonify({"word": "խնձոր"})

@app.route('/guess', methods=['POST'])
def guess():
    data = request.json
    user_word = data.get('word', '').lower().strip()
    secret_word = "խնձոր"

    # Եթե բառը չկա, ուղղակի 400 տանք
    if allowed_words and user_word not in allowed_words:
        return jsonify({"error": "Չկա բազայում"}), 400

    v_user = get_embedding(user_word)
    v_secret = get_embedding(secret_word)

    if v_user == "loading" or v_user == "error":
        return jsonify({"error": "AI-ն արթնանում է, սպասիր 10 վայրկյան"}), 503

    similarity = np.dot(v_user, v_secret) / (np.linalg.norm(v_user) * np.linalg.norm(v_secret))
    return jsonify({"word": user_word, "percentage": round(float(similarity) * 100, 2)})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
