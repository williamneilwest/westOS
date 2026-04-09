import os

from flask import Flask

from .routes import register_routes


def create_app():
    app = Flask(__name__)
    app.config.from_mapping(APP_NAME=os.getenv('APP_NAME', 'westOS AI Gateway'))

    register_routes(app)

    return app
