import csv
import io
from abc import ABC, abstractmethod

from .data_processing import normalize_headers


class DatasetReader(ABC):
    @abstractmethod
    def read(self, filename, content):
        """Return a tuple of (headers, rows) for the dataset content."""


class CsvDatasetReader(DatasetReader):
    def read(self, filename, content):
        decoded = content.decode('utf-8-sig', errors='replace')
        reader = csv.DictReader(io.StringIO(decoded))
        headers = normalize_headers(reader.fieldnames)
        reader.fieldnames = headers
        rows = [dict(row) for row in reader]
        return headers, rows


_READERS = {
    'csv': CsvDatasetReader(),
}


def resolve_dataset_type(filename, file_type_hint=''):
    hint = str(file_type_hint or '').strip().lower()
    if hint in _READERS:
        return hint

    lower_name = str(filename or '').strip().lower()
    if lower_name.endswith('.csv'):
        return 'csv'

    return ''


def read_dataset(filename, content, file_type_hint=''):
    dataset_type = resolve_dataset_type(filename, file_type_hint=file_type_hint)
    if not dataset_type:
        raise ValueError('Unsupported dataset type.')

    reader = _READERS.get(dataset_type)
    if reader is None:
        raise ValueError('No reader registered for dataset type.')

    headers, rows = reader.read(filename, content)
    return {
        'datasetType': dataset_type,
        'headers': headers,
        'rows': rows,
    }
