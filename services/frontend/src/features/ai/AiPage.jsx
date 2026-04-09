import { useState } from 'react';
import { sendAiChat } from '../../app/services/api';

export function AiPage() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!message.trim()) {
      setError('Enter a prompt to test the gateway.');
      return;
    }

    setError('');
    setIsSending(true);

    try {
      const result = await sendAiChat(message.trim());
      setResponse(result.message);
    } catch (requestError) {
      setResponse('');
      setError(requestError.message);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="module">
      <header className="module__header">
        <span className="module__tag">/ai</span>
        <h2>AI</h2>
        <p>The AI module is reserved for gateway-backed workflows and model tooling, not generic backend logic.</p>
      </header>

      <div className="card-grid">
        <article className="card card--cool">
          <h3>Gateway prompt</h3>
          <p>Use the AI gateway directly for small prompt tests. This keeps model traffic isolated from backend application logic.</p>

          <form className="upload-form" onSubmit={handleSubmit}>
            <label className="textarea-field">
              <span>Prompt</span>
              <textarea
                rows="5"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Summarize the risks in a CSV support queue."
              />
            </label>
            <button className="button" disabled={isSending} type="submit">
              {isSending ? 'Sending...' : 'Send to AI Gateway'}
            </button>
          </form>

          {error ? <p className="status-text status-text--error">{error}</p> : null}
        </article>
        <article className="card">
          <h3>Boundary</h3>
          <p>Imported from the archive in spirit: keep AI-specific flows inside the gateway and present only narrow tools in the UI.</p>
          {response ? <p className="response-block">{response}</p> : <p>No gateway response yet.</p>}
        </article>
      </div>
    </section>
  );
}
