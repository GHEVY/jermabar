from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import numpy as np
import os

app = Flask(__name__)
CORS(app)


HF_TOKEN = os.getenv("HF_TOKEN")
API_URL = "https://api-inference.huggingface.co/models/Metric-AI/armenian-text-embeddings-1"
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

# 2. Բեռնում ենք բառարանը (valid_words.txt)
def load_dictionary():
    try:
        with open('valid_words.txt', 'r', encoding='utf-8') as f:
            # Վերցնում ենք միայն բառերը
            return set(line.split()[0].lower() for line in f)
    except FileNotFoundError:
        print("Սխալ: valid_words.txt ֆայլը չի գտնվել!")
        return set()

allowed_words = load_dictionary()

# 3. Ֆունկցիա AI-ից վեկտոր ստանալու համար
def get_embedding(text):
    try:
        response = requests.post(API_URL, headers=HEADERS, json={"inputs": text})
        
        # Եթե API-ն սխալ է վերադարձրել (օրինակ 401 կամ 404)
        if response.status_code != 200:
            print(f"API Error: {response.status_code} - {response.text}")
            return "loading"

        result = response.json()
        
        if isinstance(result, dict) and "error" in result:
            return "loading"
            
        embedding = np.array(result)
        if embedding.ndim > 1:
            embedding = embedding[0]
        return embedding
        
    except Exception as e:
        print(f"Exception in get_embedding: {e}")
        return "loading"

# 4. Հիմնական Route-ը խաղի համար
@app.route('/guess', methods=['POST'])
def guess():
    data = request.json
    user_word = data.get('word', '').lower().strip()
    secret_word = "խնձոր"  # Առայժմ ստատիկ, հետո կարող ես փոխել

    # Ստուգում 1: Արդյո՞ք բառը կա բառարանում
    if user_word not in allowed_words:
        return jsonify({"error": "Այսպիսի բառ չկա բառարանում"}), 400

    # Ստուգում 2: Ստանում ենք վեկտորները AI-ից
    v_user = get_embedding(user_word)
    v_secret = get_embedding(secret_word)

    if v_user == "loading" or v_secret == "loading":
        return jsonify({"error": "AI-ն դեռ պատրաստվում է, փորձեք 10 վայրկյանից"}), 503

    # Հաշվում ենք նմանությունը (Cosine Similarity)
    similarity = np.dot(v_user, v_secret) / (np.linalg.norm(v_user) * np.linalg.norm(v_secret))
    percentage = round(float(similarity) * 100, 2)

    return jsonify({
        "word": user_word,
        "percentage": percentage
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
