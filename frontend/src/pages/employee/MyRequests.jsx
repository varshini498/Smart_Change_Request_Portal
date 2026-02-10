import { useState, useEffect } from 'react';
import API from '../../api/axios';

export default function MyRequests() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    API.get('/requests')
      .then(res => setRequests(res.data.requests))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2>My Requests</h2>
      {requests.length === 0 && <p>No requests found.</p>}
      <ul>
        {requests.map(r => (
          <li key={r.id}>
            <strong>{r.title}</strong> - {r.status} {r.isOverdue && <span style={{ color:'red' }}>Overdue</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
