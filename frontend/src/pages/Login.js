import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Login.css";
import asmitaLogo from "../assets/AsmitA Logo.webp";

const Login = () => {
  const navigate = useNavigate();
  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error("Login failed");
      }

      window.location.href = "/leads";
    } catch (err) {
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <aside className="login-brand">
          <div className="brand-mark">
            <img src={asmitaLogo} alt="My Asmita" />
            <div className="brand-text">my ASMITA</div>
          </div>
        </aside>

        <form className="login-panel" onSubmit={handleLogin}>
          <div className="login-header">
            <h1>Welcome back!</h1>
            <p>Happy to see you again!</p>
          </div>

          <label className="login-label" htmlFor="login-email">
            Email Address
          </label>
          <div className="login-input">
            <span className="login-icon email" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              placeholder="Email Address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <label className="login-label" htmlFor="login-password">
            Password
          </label>
          <div className="login-input with-action">
            <span className="login-icon lock" aria-hidden="true" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button
              type="button"
              className="login-action"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
            />
          </div>

          <button className="login-forgot" type="button">
            Forgot Password?
          </button>

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "SIGN IN"}
          </button>

          <div className="login-footer">Copyright 2026 Asmita</div>
        </form>
      </div>
    </div>
  );
};

export default Login;
