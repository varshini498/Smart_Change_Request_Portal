import { useEffect, useState } from "react";
import API from "../../api/axios";

export default function Dashboard() {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    API.get("/requests/dashboard/counts")
      .then(res => setCounts(res.data.counts));
  }, []);

  return (
    <div>
      <h2>Manager Dashboard</h2>
      <p>Pending: {counts.pending}</p>
      <p>Approved: {counts.approved}</p>
      <p>Rejected: {counts.rejected}</p>
    </div>
  );
}
