import { useState } from "react";
import API from "../api/axios";

export default function Register({ onSwitch }) {
  const [form, setForm] = useState({
    name: "",
    roll_no: "",
    email: "",
    password: "",
    role: ""
  });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/auth/register", form);
      alert("Registered successfully");
      onSwitch();
    } catch (err) {
      alert(err.response?.data?.message || "Register failed");
      console.log(err);
    }
  };

  return (
    <form onSubmit={submit}>
      <h2>Register</h2>

      <input placeholder="Name"
        onChange={e => setForm({ ...form, name: e.target.value })} />

      <input placeholder="Roll No"
        onChange={e => setForm({ ...form, roll_no: e.target.value })} />

      <input placeholder="Email"
        onChange={e => setForm({ ...form, email: e.target.value })} />

      <input type="password" placeholder="Password"
        onChange={e => setForm({ ...form, password: e.target.value })} />

      <select
        onChange={e => setForm({ ...form, role: e.target.value })}>
        <option value="">Select Role</option>
        <option value="Employee">Employee</option>
        <option value="Manager">Manager</option>
      </select>

      <button>Register</button>

      <p onClick={onSwitch} style={{ cursor: "pointer", color: "blue" }}>
        Already have an account? Login
      </p>
    </form>
  );
}
