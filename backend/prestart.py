import sys
import time

from sqlalchemy import inspect, text

from app import create_app
from app.db import db


MAX_RETRIES = 10
RETRY_DELAY_SECONDS = 2


def main() -> int:
    print('[BOOT] Running prestart checks')

    app = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            app = create_app()
            with app.app_context():
                db.session.execute(text('SELECT 1'))
            print(f'[DB] Connection successful on attempt {attempt}')
            break
        except Exception as error:
            print(f'[DB] Connection attempt {attempt}/{MAX_RETRIES} failed: {error}')
            if attempt == MAX_RETRIES:
                print('[ERROR] Database connection retries exhausted')
                return 1
            time.sleep(RETRY_DELAY_SECONDS)

    if app is None:
        print('[ERROR] Failed to create app during prestart')
        return 1

    with app.app_context():
        expected_tables = sorted(db.metadata.tables.keys())
        print(f'[MODELS] Expected tables: {", ".join(expected_tables) if expected_tables else "(none)"}')
        actual_tables = sorted(inspect(db.engine).get_table_names())
        print(f'[DB] Detected tables: {", ".join(actual_tables) if actual_tables else "(none)"}')

    print('[BOOT] Prestart checks passed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
