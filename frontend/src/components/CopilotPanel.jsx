import { useState } from 'react';
import { Bot, LoaderCircle, SendHorizonal, Sparkles } from 'lucide-react';
import API from '../api/axios';

const SUGGESTIONS = [
  'Show request 1',
  'Show pending requests',
  'Why rejected?',
  'Give me about request 3',
  'Tell me about Upgrade Node.js Version',
  'Show Leave Request',
];

export default function CopilotPanel() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      type: 'text',
      message: 'Ask by serial number, title, pending requests, or rejection reason.',
      data: [],
    },
  ]);

  const submit = async (nextQuery) => {
    const value = String(nextQuery ?? query).trim();
    if (!value) return;

    const userMessage = { role: 'user', type: 'text', message: value, data: [] };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await API.post('/copilot/ask', {
        query: value,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          type: res.data?.type || 'text',
          message: res.data?.message || 'No response received.',
          data: res.data?.data || [],
        },
      ]);
      setQuery('');
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          type: 'text',
          message: error.response?.data?.message || 'Copilot could not answer right now.',
          data: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`copilot-shell ${open ? 'open' : ''}`}>
      {open ? (
        <section className="copilot-panel card fade-in">
          <div className="copilot-header">
            <div>
              <strong>AI Copilot</strong>
              <p>Find requests, list pending items, or check rejection reason</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>

          <div className="copilot-suggestions">
            {SUGGESTIONS.map((item) => (
              <button key={item} type="button" className="copilot-chip" onClick={() => submit(item)}>
                <Sparkles size={14} />
                {item}
              </button>
            ))}
          </div>

          <div className="copilot-thread">
            {messages.map((entry, index) => (
              <div key={`${entry.role}-${index}`} className={`copilot-message ${entry.role}`}>
                <div className="copilot-bubble">
                  <p>{entry.message}</p>
                  <StructuredResponse data={entry.data} type={entry.type} />
                </div>
              </div>
            ))}
            {loading ? (
              <div className="copilot-message assistant">
                <div className="copilot-bubble loading">
                  <LoaderCircle size={16} className="auth-spinner" />
                  Thinking...
                </div>
              </div>
            ) : null}
          </div>

          <div className="copilot-footer">
            <div className="copilot-compose">
              <input
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) submit();
                }}
                placeholder='Try "Show pending requests" or "Why rejected?"'
              />
              <button type="button" className="btn btn-primary" disabled={loading} onClick={() => submit()}>
                <SendHorizonal size={16} />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <button type="button" className="copilot-trigger" onClick={() => setOpen(true)}>
          <Bot size={18} />
          Copilot
        </button>
      )}
    </div>
  );
}

function StructuredResponse({ data, type }) {
  if (!data) return null;

  if (type === 'data' && Array.isArray(data) && data.length > 0) {
    return (
      <ul className="copilot-list">
        {data.map((row, index) => (
          <li key={row.id || row.requestId || `${row.role || 'row'}-${index}`}>
            {'text' in row
              ? row.text
              : row.role
              ? `${row.role}${row.name ? ` - ${row.name}` : ''} - ${row.status || 'N/A'}${row.date ? ` (${row.date})` : ''}`
              : `#${row.id || '-'} ${row.title || 'Request'}${row.status ? ` - ${row.status}` : ''}`}
          </li>
        ))}
      </ul>
    );
  }

  if (type === 'data' && !Array.isArray(data) && typeof data === 'object') {
    const topLevelEntries = Object.entries(data).filter(([, value]) => !Array.isArray(value) && value && typeof value !== 'object');
    const approvals = Array.isArray(data.approvals) ? data.approvals : [];
    const comments = Array.isArray(data.comments) ? data.comments : [];

    return (
      <div className="copilot-data-card">
        {topLevelEntries.map(([key, value]) => (
          <div key={key} className="copilot-data-row">
            <span>{formatKey(key)}</span>
            <strong>{String(value)}</strong>
          </div>
        ))}

        {approvals.length > 0 ? (
          <div className="copilot-data-section">
            <strong>Approvals</strong>
            <ul className="copilot-list">
              {approvals.map((item, index) => (
                <li key={`${item.role}-${index}`}>
                  {item.role}{item.name ? ` - ${item.name}` : ''} - {item.status}{item.date ? ` (${item.date})` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {comments.length > 0 ? (
          <div className="copilot-data-section">
            <strong>Comments</strong>
            <ul className="copilot-list">
              {comments.map((item, index) => (
                <li key={`${item.role}-${index}`}>
                  {item.role || item.action}: {item.comment}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}

function formatKey(value) {
  return String(value || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}
