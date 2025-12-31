// src/api/client.js
import axios from "axios";

const raw = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const baseURL = raw.endsWith("/api") ? raw : `${raw}/api`;

const api = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
