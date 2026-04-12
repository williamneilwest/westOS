from collections import Counter

from .data_processing import detect_category_column, summarize_non_empty_values
from .dataset_reader import read_dataset

PREVIEW_ROW_LIMIT = 25


def build_csv_analysis(filename, content):
    if not filename.lower().endswith('.csv'):
        raise ValueError('Only CSV files are supported.')

    if not content:
        raise ValueError('The CSV file is empty.')

    parsed = read_dataset(filename, content, file_type_hint='csv')
    headers = parsed['headers']
    rows = parsed['rows']

    if not headers:
        raise ValueError('The CSV file must include a header row.')

    category_column = detect_category_column(headers)
    category_counts = Counter()

    if category_column:
        for row in rows:
            category = str(row.get(category_column, '')).strip() or 'Unspecified'
            category_counts[category] += 1

    completeness = summarize_non_empty_values(rows, headers)
    top_categories = [
        {'label': label, 'count': count}
        for label, count in category_counts.most_common(5)
    ]

    insights = []

    if rows:
        insights.append(f'{len(rows)} rows loaded across {len(headers)} columns.')
    else:
        insights.append('Header row detected but no data rows were present.')

    if category_column and top_categories:
        top_category = top_categories[0]
        insights.append(
            f'Most frequent {category_column.lower()} is {top_category["label"]} ({top_category["count"]} rows).'
        )

    if completeness:
        sparsest_column = min(completeness, key=lambda item: item['filled'])
        insights.append(
            f'Least complete column is {sparsest_column["column"]} with {sparsest_column["filled"]} filled values.'
        )

    return {
        'fileName': filename,
        'rowCount': len(rows),
        'columnCount': len(headers),
        'columns': headers,
        'categoryColumn': category_column,
        'topCategories': top_categories,
        'columnCompleteness': completeness[:6],
        'sampleRows': rows[:3],
        'previewRows': rows[:PREVIEW_ROW_LIMIT],
        'previewRowCount': min(len(rows), PREVIEW_ROW_LIMIT),
        'insights': insights,
    }


def analyze_csv_file(file_storage):
    if file_storage is None or not file_storage.filename:
        raise ValueError('A CSV file is required.')

    content = file_storage.stream.read()
    return build_csv_analysis(file_storage.filename, content)
