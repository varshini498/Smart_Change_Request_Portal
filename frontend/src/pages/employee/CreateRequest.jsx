import { useState } from 'react';
import API from '../../api/axios';

export default function CreateRequest() {
  const [form, setForm] = useState({ title:'', description:'', priority:'Normal', dueDate:'' });
  const [message, setMessage] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await API.post('/requests/create', form);
      setMessage(res.data.message);
      setForm({ title:'', description:'', priority:'Normal', dueDate:'' });
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error creating request');
    }
  };

  return (
    <div>
      <h2>Create Request</h2>
      <form onSubmit={handleSubmit}>
        <input name="title" placeholder="Title" value={form.title} onChange={handleChange} required />
        <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} required />
        <select name="priority" value={form.priority} onChange={handleChange}>
          <option>Normal</option>
          <option>High</option>
          <option>Low</option>
        </select>
        <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} />
        <button type="submit">Submit</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
