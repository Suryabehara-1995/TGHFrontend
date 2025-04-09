import React, { useState, useEffect } from "react";
import axios from "axios";
import { Form, Input, Button, message, Checkbox } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import "./SignIn.css";
import config from "../config"; // Import the config file

const SignIn = ({ setToken, setUserName, setPermissions }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const savedToken = Cookies.get("token");
    const savedUserName = Cookies.get("userName");
    const savedPermissions = Cookies.get("permissions");
    if (savedToken && savedUserName && savedPermissions) {
      setToken(savedToken);
      setUserName(savedUserName);
      setPermissions(JSON.parse(savedPermissions));
      navigate("/dashboard");
    }
  }, [setToken, setUserName, setPermissions, navigate]);

  const handleSubmit = async () => {
    try {
      const response = await axios.post(`${config.apiBaseUrl}/login`, { // Use config.apiBaseUrl
        email,
        password,
      });
      const { token, name, permissions } = response.data;

      // Set state
      setToken(token);
      setUserName(name);
      setPermissions(permissions);

      // Store in cookies with expiration (e.g., 7 days)
      Cookies.set("token", token, { expires: 7, secure: true, sameSite: "Strict" });
      Cookies.set("userName", name, { expires: 7, secure: true, sameSite: "Strict" });
      Cookies.set("permissions", JSON.stringify(permissions), {
        expires: 7,
        secure: true,
        sameSite: "Strict",
      });

      message.success("Login successful");
      navigate("/dashboard"); // Navigate to dashboard without refresh
    } catch (error) {
      message.error("Invalid email or password");
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Left side GIF */}
        {/* Note: You didn’t include this in your code snippet, so I’m assuming it’s commented out */}

        {/* Right side Login Form */}
        <div className="login-card">
          <div className="logo" style={{ padding: "16px", textAlign: "center" }}>
            <img
              width="120"
              src="https://www.thegoodhealth.co.in/web/image/website/1/logo/www.thegoodhealth.co.in?unique=7145bcf"
              alt="Logo"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>
          <h2>The Good Health</h2>
          <p>Sign in to your account to continue</p>
          <Form onFinish={handleSubmit} layout="vertical" className="login-form">
            <Form.Item name="email" rules={[{ required: true, message: "Please input your email!" }]}>
              <Input
                prefix={<UserOutlined />}
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: "Please input your password!" }]}>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Item>
            <Form.Item className="remember-me" style={{ textAlign: "center" }}>
              <Checkbox>Remember me</Checkbox>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" className="login-button">
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default SignIn;