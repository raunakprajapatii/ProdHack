import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import './LoginPage.css';
import logo from './assets/logo.svg';
import { API_BASE_URL } from './config/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = 'Name is required';
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const endpoint = isLogin ? 'login' : 'signup';
      const body = isLogin
        ? { email: formData.email, password: formData.password }
        : { name: formData.name, email: formData.email, password: formData.password };

      const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        alert(data.error || `${isLogin ? 'Login' : 'Signup'} failed`);
      }
    } catch {
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: ''
    });
    setErrors({});
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-header-box">
          <div className="login-header">
            <div className="login-logo">
              <img src={logo} alt="ProdHack Logo" className="logo-img" />
            </div>
            <h2 className="login-title">
              {isLogin ? 'Enter the Arena' : 'Create Player ID'}
            </h2>
            <p className="login-subtitle">
              {isLogin
                ? 'Sign in and keep your focus streak alive.'
                : 'Build your profile and start earning XP.'
              }
            </p>
          </div>

          <div className="login-form-fields">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="login-label">
                  Full Name
                </label>
                <div className="input-wrapper">
                  <div className="input-icon-left">
                    <User className="icon-input" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`input-field ${errors.name ? 'input-error' : ''}`}
                    placeholder="Enter your full name"
                  />
                </div>
                {errors.name && <p className="input-error-text">{errors.name}</p>}
              </div>
            )}

            <div>
              <label htmlFor="email" className="login-label">
                Email Address
              </label>
              <div className="input-wrapper">
                <div className="input-icon-left">
                  <Mail className="icon-input" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`input-field ${errors.email ? 'input-error' : ''}`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && <p className="input-error-text">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="login-label">
                Password
              </label>
              <div className="input-wrapper">
                <div className="input-icon-left">
                  <Lock className="icon-input" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`input-field input-with-icon-right ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="icon-toggle" />
                  ) : (
                    <Eye className="icon-toggle" />
                  )}
                </button>
              </div>
              {errors.password && <p className="input-error-text">{errors.password}</p>}
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="login-label">
                  Confirm Password
                </label>
                <div className="input-wrapper">
                  <div className="input-icon-left">
                    <Lock className="icon-input" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`input-field ${errors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="Confirm your password"
                  />
                </div>
                {errors.confirmPassword && <p className="input-error-text">{errors.confirmPassword}</p>}
              </div>
            )}

            {isLogin && (
              <div className="login-remember-forgot">
                <div className="remember-me">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="checkbox-input"
                  />
                  <label htmlFor="remember-me" className="checkbox-label">
                    Remember me
                  </label>
                </div>
                <div className="forgot-password">
                  <button type="button" className="forgot-password-btn">
                    Forgot password?
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="submit-button-wrapper">
            <button
              type="submit"
              disabled={isLoading}
              onClick={handleSubmit}
              className="submit-button"
            >
              {isLoading ? (
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  Processing...
                </div>
              ) : (
                isLogin ? 'Sign in' : 'Create account'
              )}
            </button>
          </div>

          <div className="toggle-login-signup">
            <span className="toggle-text">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={toggleMode}
              className="toggle-button"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
