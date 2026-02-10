import { useState } from "react";
import API from "../../api/axios";

export default function CreateRequest() {
  const [data, setData] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    await API.post("/requests/create", data);
    alert("Request Created");
  };

  return (
    <form onSubmit={submit}>
      <h2>Create Request</h2>
      <input placeholder="Title" onChange={e => setData({...data, title: e.target.value})} />
      <textarea placeholder="Description" onChange={e => setData({...data, description: e.target.value})} />
      <select onChange={e => setData({...data, priority: e.target.value})}>
        <option>Normal</option>
        <option>High</option>
      </select>
      <input type="date" onChange={e => setData({...data, dueDate: e.target.value})} />
      <button>Create</button>
    </form>
  );
}
