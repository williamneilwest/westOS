def get_tools():
    return [
        {
            "name": "summary",
            "label": "Generate Summary",
            "description": "Summarize file contents",
        },
        {
            "name": "preview",
            "label": "Preview Data",
            "description": "View structured preview",
        },
        {
            "name": "row_count",
            "label": "Row Count",
            "description": "Count rows in the uploaded CSV",
        },
        {
            "name": "column_summary",
            "label": "Column Summary",
            "description": "Inspect column names and inferred data types",
        },
    ]
