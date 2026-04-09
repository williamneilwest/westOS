from flask import Blueprint, request

from ..api_response import error_response, success_response
from ..services.csv_analyzer import analyze_csv_file

work_bp = Blueprint('work', __name__)


@work_bp.post('/api/work/analyze-csv')
def analyze_csv():
    try:
        uploaded_file = request.files.get('file')
        result = analyze_csv_file(uploaded_file)
        return success_response(result)
    except ValueError as error:
        return error_response(str(error), 400)
