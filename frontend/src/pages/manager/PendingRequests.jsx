import { useEffect, useState } from "react";
import API from "../../api/axios";

export default function PendingRequests() {
  const [list, setList] = useState([]);

  const load = () => {
    API.get("/requests/pending")
      .then(res => setList(res.data.requests));
  };

  useEffect(load, []);

  const approve = id => API.put(`/requests/${id}/approve`).then(load);
  const reject = id => API.put(`/requests/${id}/reject`).then(load);

  return (
    <div>
      <h2>Pending Requests</h2>
      {list.map(r => (
        <div key={r.id}>
          <b>{r.title}</b>
          {r.isOverdue && <span style={{color:"red"}}> Overdue</span>}
          <br />
          <button onClick={() => approve(r.id)}>Approve</button>
          <button onClick={() => reject(r.id)}>Reject</button>
        </div>
      ))}
    </div>
  );
}
