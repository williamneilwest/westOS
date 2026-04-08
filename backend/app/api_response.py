from flask import jsonify


def success_response(data, status_code: int = 200):
    return jsonify({'success': True, 'data': data}), status_code


def error_response(message: str, status_code: int = 400):
    return jsonify({'success': False, 'error': message}), status_code

