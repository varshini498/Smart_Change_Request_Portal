import { useState, useEffect } from 'react';
import API from '../../api/axios';

export default function PendingRequests() {
  const [requests, setRequests] = useState([]);

  const fetchPending = () => {
    API.get('/requests/pending')
      .then(res => setRequests(res.data.requests))
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchPending(); }, []);

  const handleAction = async (id, action) => {
    try {
      await API.put(`/requests/${id}/${action}`, { comment: `${action} by manager` });
      fetchPending();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Pending Requests</h2>
      {requests.length === 0 && <p>No pending requests.</p>}
      <ul>
        {requests.map(r => (
          <li key={r.id}>
            {r.title} - {r.status} {r.isOverdue && <span style={{ color:'red' }}>Overdue</span>}
           <button className="approve-btn" onClick={()=>handleAction(r.id,'approve')}>Approve</button>
<button className="reject-btn" onClick={()=>handleAction(r.id,'reject')}>Reject</button>

          </li>
        ))}
      </ul>
    </div>
  );
}
