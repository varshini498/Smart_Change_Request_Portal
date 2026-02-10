import { useEffect, useState } from "react";
import API from "../../api/axios";

export default function MyRequests() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    API.get("/requests").then(res => setRequests(res.data.requests));
  }, []);

  return (
    <div>
      <h2>My Requests</h2>
      {requests.map(r => (
        <div key={r.id}>
          <h4>{r.title}</h4>
          <p>Status: {r.status}</p>
          {r.isOverdue && <b style={{color:"red"}}>Overdue</b>}
        </div>
      ))}
    </div>
  );
}
