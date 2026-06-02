import os
import re
import json
import requests
import numpy as np
from dotenv import load_dotenv
from backend.data import KNOWLEDGE_CHUNKS

load_dotenv()

# --- CUSTOM TF-IDF VECTORIZER & SEMANTIC SEARCH ---
def tokenize(text):
    """Clean and split text into lowercase alphanumeric words."""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    return text.split()

# Prepare knowledge base tokens
chunk_tokens = []
for chunk in KNOWLEDGE_CHUNKS:
    # Combine title, content, and keywords to create a comprehensive text profile
    combined_text = f"{chunk['title']} {chunk['content']} {' '.join(chunk['keywords'])}"
    chunk_tokens.append(tokenize(combined_text))

# Build Vocabulary
vocab = sorted(list(set(word for tokens in chunk_tokens for word in tokens)))
vocab_idx = {word: i for i, word in enumerate(vocab)}

# Document Frequency (DF) & Inverse Document Frequency (IDF)
N = len(KNOWLEDGE_CHUNKS)
df = np.zeros(len(vocab))
for tokens in chunk_tokens:
    unique_words = set(tokens)
    for word in unique_words:
        if word in vocab_idx:
            df[vocab_idx[word]] += 1

# IDF calculation with smoothing
idf = np.log((1 + N) / (1 + df)) + 1

# Precompute document vectors
doc_vectors = []
for tokens in chunk_tokens:
    tf = np.zeros(len(vocab))
    for word in tokens:
        if word in vocab_idx:
            tf[vocab_idx[word]] += 1
    doc_vectors.append(tf * idf)
doc_vectors = np.array(doc_vectors)

def get_retrieved_context(query, threshold=0.1):
    """
    Finds the most relevant knowledge chunk using cosine similarity
    and returns it along with the similarity score.
    """
    q_tokens = tokenize(query)
    if not q_tokens or len(vocab) == 0:
        return None, 0.0

    # Calculate query TF-IDF vector
    q_tf = np.zeros(len(vocab))
    for word in q_tokens:
        if word in vocab_idx:
            q_tf[vocab_idx[word]] += 1
    
    q_vector = q_tf * idf
    q_norm = np.linalg.norm(q_vector)
    
    if q_norm == 0:
        return None, 0.0

    similarities = []
    for doc_vec in doc_vectors:
        doc_norm = np.linalg.norm(doc_vec)
        if doc_norm == 0:
            similarities.append(0.0)
            continue
        sim = np.dot(q_vector, doc_vec) / (q_norm * doc_norm)
        similarities.append(sim)

    max_idx = np.argmax(similarities)
    max_sim = similarities[max_idx]

    # Keyword boosting: give a score bonus if query words match keywords directly
    keyword_matches = 0
    for word in q_tokens:
        if word in KNOWLEDGE_CHUNKS[max_idx]["keywords"]:
            keyword_matches += 1
    
    if keyword_matches > 0:
        max_sim += min(0.2, keyword_matches * 0.05)

    if max_sim >= threshold:
        return KNOWLEDGE_CHUNKS[max_idx], max_sim
    return None, max_sim


# --- OFFLINE/FALLBACK CONVERSATIONAL ENGINE ---
def generate_offline_response(query, matched_chunk, score):
    """Generates a structured conversational response locally using facts in data.py."""
    query_lower = query.lower()
    
    # Handle basic greetings
    if any(greet in query_lower for greet in ["hi", "hello", "hey", "greetings"]):
        return (
            "Hello! I am Bhukya Sai's AI Assistant. I can tell you about Sai's education, "
            "skills, work experience, projects, or certifications. How can I help you today?"
        )
    if "help" in query_lower:
        return (
            "I can answer questions like:\n"
            "- What projects has Sai done?\n"
            "- Explain the Car-Trade price analysis project.\n"
            "- What are Sai's technical skills?\n"
            "- Where did Sai intern?\n"
            "- How can I contact Sai?"
        )

    if not matched_chunk:
        return (
            "I couldn't find a direct answer to that in Bhukya Sai's portfolio logs. "
            "You can ask me about his B.Tech degree, Python/SQL skills, the Car-Trade project, "
            "his data analyst internship at Analytics Space, or how to contact him!"
        )

    # Use matched chunk to reply with templates
    title = matched_chunk["title"]
    content = matched_chunk["content"]
    
    # Custom conversational wrapping based on the context type
    if matched_chunk["id"] == "about_sai":
        return f"Here is a summary of who Bhukya Sai is:\n\n{content}"
    elif matched_chunk["id"] == "contact_info":
        return f"You can reach Bhukya Sai through the following details:\n\n{content}"
    elif matched_chunk["id"] == "skills_technical":
        return f"Bhukya Sai's professional skill set includes:\n\n{content}"
    elif "exp_" in matched_chunk["id"]:
        return f"Regarding work experience, here are the details for {title}:\n\n{content}"
    elif "proj_" in matched_chunk["id"]:
        return f"Here is an overview of the {title} project:\n\n{content}"
    elif matched_chunk["id"] == "certifications_details":
        return f"Here are Bhukya Sai's professional certifications:\n\n{content}"
    
    return f"Regarding '{title}', here is the information from Bhukya's profile:\n\n{content}"


# --- AI CHAT ENTRY POINT (RAG WITH OPENAI OR LOCAL TF-IDF FALLBACK) ---
def ask_ai(query):
    """
    Main chat handler. Attempts to query OpenAI API using retrieved context.
    Falls back to custom local template response if no key is configured or on failure.
    """
    matched_chunk, score = get_retrieved_context(query)
    
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        # Use local offline response
        print(f"[AI] Key not configured. Replying with local match (score: {score:.2f}).")
        return generate_offline_response(query, matched_chunk, score)
    
    # Build RAG system prompt
    context_str = "None available."
    if matched_chunk:
        context_str = f"Topic: {matched_chunk['title']}\nInformation: {matched_chunk['content']}"

    system_prompt = (
        "You are a helpful, professional, and friendly AI Portfolio Assistant for Bhukya Sai, "
        "a Data Analyst. You answer questions from recruiters and clients about Bhukya Sai's "
        "skills, education, projects, and work experience.\n\n"
        "GUIDELINES:\n"
        "1. Answer queries truthfully based on the facts provided below. If the information isn't "
        "in the context or you aren't sure, state that you don't have that specific record, and offer "
        "to let the recruiter send Sai a direct message via the contact form.\n"
        "2. Keep answers concise, highly professional, and structured (use bullet points where appropriate).\n"
        "3. Highlight Sai's expertise in Data Analytics, Python, SQL, Power BI, and Generative AI.\n\n"
        f"FACTUAL CONTEXT ABOUT BHUKYA SAI:\n{context_str}\n\n"
        "Provide a helpful answer directly addressing the user's question."
    )

    try:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {openai_key}"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            "temperature": 0.5,
            "max_tokens": 400
        }
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            res_data = response.json()
            return res_data["choices"][0]["message"]["content"]
        else:
            print(f"[AI] OpenAI API error (status {response.status_code}): {response.text}")
            # Fallback
            return generate_offline_response(query, matched_chunk, score)
            
    except Exception as e:
        print(f"[AI] Failed to reach OpenAI: {e}. Falling back to offline engine.")
        return generate_offline_response(query, matched_chunk, score)
