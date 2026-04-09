const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const aiBaseUrl = import.meta.env.VITE_AI_BASE_URL || '';

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorPayload = await response.json();
      message = errorPayload.error || message;
    } catch {
      // Keep the default message when the response body is not JSON.
    }

    throw new Error(message);
  }

  return response.json();
}

export function getBackendHealth() {
  return request(backendBaseUrl, '/api/health');
}

export function getSystemStatus() {
  return request(backendBaseUrl, '/api/system/status');
}

export function analyzeCsvFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  return request(backendBaseUrl, '/api/work/analyze-csv', {
    method: 'POST',
    body: formData
  });
}

export function getAiHealth() {
  return request(aiBaseUrl, '/ai/health');
}

export function sendAiChat(message) {
  return request(aiBaseUrl, '/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });
}
