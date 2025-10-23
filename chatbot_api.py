#!/usr/bin/env python3
"""
ChemCalc Chatbot API Backend
Provides proxy endpoints for OpenAI and YouTube APIs
"""

import os
import sys
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from openai import OpenAI

# Add Manus API client path
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient

app = Flask(__name__)
CORS(app)

# Initialize OpenAI client
openai_client = OpenAI()

# Initialize YouTube API client
youtube_api = ApiClient()

# System prompt for the chatbot
SYSTEM_PROMPT = """You are a helpful boat repair assistant for ChemCalc.co. Your role is to:

1. Understand user queries about boat repair, maintenance, and restoration
2. Extract key topics and product needs from their questions
3. Provide helpful, concise responses

When responding, structure your answer as JSON with these fields:
- "text": A friendly, helpful response to the user (2-3 sentences)
- "search_query": A YouTube search query for finding relevant boat repair videos
- "product_keywords": An array of keywords to match affiliate products (e.g., ["epoxy", "sandpaper", "gelcoat"])

Example query: "How do I fix a gelcoat scratch?"
Example response:
{
    "text": "Fixing gelcoat scratches involves sanding, filling, and polishing. I'll find some tutorial videos and recommend the products you'll need.",
    "search_query": "boat gelcoat scratch repair tutorial",
    "product_keywords": ["gelcoat", "sandpaper", "polish", "compound", "buffer"]
}

Keep responses concise and focused on boat repair. Always provide actionable search queries and relevant product keywords."""

@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    """Main chatbot endpoint"""
    try:
        data = request.json
        query = data.get('query', '')
        history = data.get('history', [])
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        # Build conversation history
        messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]
        
        # Add recent history (last 5 messages)
        for msg in history[-5:]:
            messages.append(msg)
        
        # Get LLM response
        response = openai_client.chat.completions.create(
            model='gpt-4.1-mini',
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        # Parse LLM response
        llm_response = response.choices[0].message.content
        
        try:
            parsed = json.loads(llm_response)
            response_text = parsed.get('text', llm_response)
            search_query = parsed.get('search_query', f'boat repair {query}')
            product_keywords = parsed.get('product_keywords', [])
        except json.JSONDecodeError:
            # Fallback if LLM doesn't return JSON
            response_text = llm_response
            search_query = f'boat repair {query}'
            product_keywords = extract_keywords_fallback(query)
        
        # Search YouTube
        videos = search_youtube(search_query)
        
        # Return combined response
        return jsonify({
            'text': response_text,
            'videos': videos,
            'product_keywords': product_keywords
        })
        
    except Exception as e:
        print(f"Error in chatbot endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/youtube-search', methods=['GET'])
def youtube_search():
    """YouTube search endpoint"""
    try:
        query = request.args.get('q', '')
        max_results = int(request.args.get('maxResults', 5))
        
        if not query:
            return jsonify({'error': 'Query parameter q is required'}), 400
        
        videos = search_youtube(query, max_results)
        return jsonify({'videos': videos})
        
    except Exception as e:
        print(f"Error in YouTube search: {str(e)}")
        return jsonify({'error': 'YouTube search failed'}), 500

def search_youtube(query, max_results=5):
    """Search YouTube using Manus API"""
    try:
        response = youtube_api.call_api('Youtube/search', query={
            'q': query,
            'hl': 'en',
            'gl': 'US'
        })
        
        videos = []
        contents = response.get('contents', [])
        
        for item in contents[:max_results]:
            if item.get('type') == 'video':
                video_data = item.get('video', {})
                videos.append({
                    'title': video_data.get('title', ''),
                    'videoId': video_data.get('videoId', ''),
                    'url': f"https://www.youtube.com/watch?v={video_data.get('videoId', '')}",
                    'thumbnail': video_data.get('thumbnails', [{}])[0].get('url', '') if video_data.get('thumbnails') else '',
                    'channel': video_data.get('channelTitle', ''),
                    'publishedTime': video_data.get('publishedTimeText', ''),
                    'views': video_data.get('viewCountText', ''),
                    'duration': video_data.get('lengthText', '')
                })
        
        return videos
        
    except Exception as e:
        print(f"YouTube search error: {str(e)}")
        return []

def extract_keywords_fallback(query):
    """Extract keywords from query as fallback"""
    # Common boat repair product categories
    categories = [
        'epoxy', 'resin', 'gelcoat', 'fiberglass', 'polyester',
        'sandpaper', 'sanding', 'polish', 'compound', 'buffer',
        'paint', 'primer', 'thinner', 'solvent', 'acetone',
        'brush', 'roller', 'spray', 'mask', 'tape',
        'glue', 'adhesive', 'sealant', 'filler', 'fairing'
    ]
    
    query_lower = query.lower()
    keywords = [cat for cat in categories if cat in query_lower]
    
    return keywords[:5]  # Return top 5 matches

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

