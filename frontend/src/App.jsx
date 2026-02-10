import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    setMessage("");

    try {
      const url = isLogin
        ? "http://localhost:5000/api/auth/login"
        : "http://localhost:5000/api/auth/register";

      const payload = isLogin
        ? { email, password }
        : { name, email, password };

      const res = await axios.post(url, payload);
      setMessage(res.data.message || "Success");
    } catch (err) {
      setMessage("Something went wrong. Try again.");
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Smart Portal</h1>
        <p className="subtitle">
          {isLogin ? "Login to continue" : "Create your account"}
        </p>

        {!isLogin && (
          <input
            type="text"
            placeholder="Full Name"
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleSubmit}>
          {isLogin ? "Login" : "Register"}
        </button>

        {message && <p className="message">{message}</p>}

        <p className="toggle">
          {isLogin ? "New user?" : "Already have an account?"}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? " Register" : " Login"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default App;
