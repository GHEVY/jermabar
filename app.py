import numpy as np
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Թույլ ենք տալիս բոլորին կապնվել սերվերին
CORS(app)

# 1. Բեռնում ենք բազան
print("Loading vector database...")
data = np.load("jermabar_final.npz", allow_pickle=True)
words_list = data['words'].tolist()
vectors_array = data['vectors']
word_to_index = {word: i for i, word in enumerate(words_list)}

def get_vector(word):
    idx = word_to_index.get(word.lower().strip())
    if idx is not None:
        return vectors_array[idx]
    return None

def cosine_similarity(v1, v2):
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

# Այս մասը ավելացրինք, որ "Not Found" չգրի
@app.route('/')
def home():
    return "Jermabar API-ն աշխատում է։ Ուղարկեք POST հարցումներ /guess հասցեին։"

@app.route('/guess', methods=['POST'])
def guess():
    data_json = request.get_json()
    if not data_json or 'word' not in data_json:
        return jsonify({"error": "Բառը բացակայում է"}), 400
        
    user_word = data_json.get('word', '').lower().strip()
    secret_word = "համակարգիչ" 
    
    v_user = get_vector(user_word)
    v_target = get_vector(secret_word)
    
    if v_user is None:
        return jsonify({"error": "Բառը չգտնվեց բազայում"}), 404
        
    score = cosine_similarity(v_user, v_target)
    final_score = round(float(score) * 100, 2)
    
    return jsonify({
        "word": user_word,
        "score": final_score,
        "is_correct": user_word == secret_word
    })

if __name__ == '__main__':
    # Render-ի համար կարևոր է վերցնել Port-ը միջավայրից
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)