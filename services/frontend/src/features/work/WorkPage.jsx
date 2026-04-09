import { useState } from 'react';
import { analyzeCsvFile } from '../../app/services/api';

export function WorkPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setError('Select a CSV file before running the analyzer.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await analyzeCsvFile(selectedFile);
      setAnalysis(result.data);
    } catch (requestError) {
      setAnalysis(null);
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="module">
      <header className="module__header">
        <span className="module__tag">/work</span>
        <h2>Work</h2>
        <p>Use the CSV analyzer to turn operational exports into a quick read on volume, categories, and data quality.</p>
      </header>

      <div className="work-layout">
        <article className="card card--cool">
          <h3>CSV Analyzer</h3>
          <p>Upload one operational CSV at a time. The analyzer returns the useful summary, not a raw dump.</p>

          <form className="upload-form" onSubmit={handleSubmit}>
            <label className="upload-input">
              <span>{selectedFile ? selectedFile.name : 'Choose a CSV file'}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              />
            </label>

            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Analyzing...' : 'Analyze CSV'}
            </button>
          </form>

          {error ? <p className="status-text status-text--error">{error}</p> : null}
        </article>

        <article className="card">
          <h3>What it extracts</h3>
          <ul className="card__list">
            <li>Row and column counts</li>
            <li>Top category groupings</li>
            <li>Column completeness signals</li>
          </ul>
        </article>
      </div>

      {analysis ? (
        <section className="analysis-grid">
          <article className="card">
            <h3>Overview</h3>
            <div className="metric-grid">
              <div className="metric-tile">
                <span>Rows</span>
                <strong>{analysis.rowCount}</strong>
              </div>
              <div className="metric-tile">
                <span>Columns</span>
                <strong>{analysis.columnCount}</strong>
              </div>
              <div className="metric-tile">
                <span>Category field</span>
                <strong>{analysis.categoryColumn || 'None'}</strong>
              </div>
            </div>
          </article>

          <article className="card">
            <h3>Top categories</h3>
            {analysis.topCategories.length ? (
              <div className="stack-list">
                {analysis.topCategories.map((item) => (
                  <div className="stack-row" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p>No category breakdown was available for this file.</p>
            )}
          </article>

          <article className="card">
            <h3>Data quality</h3>
            <div className="stack-list">
              {analysis.columnCompleteness.map((item) => (
                <div className="stack-row" key={item.column}>
                  <span>{item.column}</span>
                  <strong>{item.filled} filled</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="card">
            <h3>Insights</h3>
            <ul className="card__list">
              {analysis.insights.map((insight) => (
                <li key={insight}>{insight}</li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}
    </section>
  );
}
