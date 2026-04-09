import os

from flask import Flask
from dotenv import load_dotenv

from .routes import register_routes


def create_app():
    load_dotenv()
    app = Flask(__name__)
    app.config.from_mapping(
        APP_NAME=os.getenv('APP_NAME', 'westOS AI Gateway'),
        LITELLM_MODEL=os.getenv('LITELLM_MODEL', 'ollama/llama3.2'),
        LITELLM_TEMPERATURE=float(os.getenv('LITELLM_TEMPERATURE', '0.2')),
        LITELLM_MAX_TOKENS=int(os.getenv('LITELLM_MAX_TOKENS', '512')),
        OLLAMA_API_BASE=os.getenv('OLLAMA_API_BASE', 'http://host.docker.internal:11434'),
    )

    register_routes(app)

    return app
