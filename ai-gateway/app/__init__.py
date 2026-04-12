import os

from flask import Flask
from dotenv import load_dotenv

from .routes import register_routes
from .services.chat import warmup_chat_completion


def create_app():
    load_dotenv()
    app = Flask(__name__)
    default_model = os.getenv('OPENAI_MODEL', os.getenv('LITELLM_MODEL', 'ollama/mistral'))
    default_temperature = os.getenv('OPENAI_TEMPERATURE', os.getenv('LITELLM_TEMPERATURE', '0.2'))
    app.config.from_mapping(
        APP_NAME=os.getenv('APP_NAME', 'westOS AI Gateway'),
        LITELLM_MODEL=default_model,
        LITELLM_TEMPERATURE=float(default_temperature),
        OLLAMA_API_BASE=os.getenv('OLLAMA_API_BASE', 'http://host.docker.internal:11434'),
    )

    try:
        warmup_chat_completion(
            app.config['LITELLM_MODEL'],
            app.config['LITELLM_TEMPERATURE'],
            app.config['OLLAMA_API_BASE'],
        )
    except Exception as error:
        app.logger.warning('LiteLLM warmup failed: %s', error)

    register_routes(app)

    return app
