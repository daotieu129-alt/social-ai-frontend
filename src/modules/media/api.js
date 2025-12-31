// src/modules/media/api.js
let API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// normalize: trim trailing slash
API_BASE = API_BASE.replace(/\/$/, "");

// if env already ends with "/api" then remove it to avoid "/api/api/..."
if (API_BASE.endsWith("/api")) {
  API_BASE = API_BASE.slice(0, -4);
}

function getToken() {
  return localStorage.getItem("token") || "";
}

async function apiFetch(path, { method = "GET", headers, body } = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body,
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      (typeof data === "string" ? data : "") ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // unwrap backend envelope: { success, message, data }
  if (data && typeof data === "object" && "data" in data) return data.data;
  return data;
}

export const mediaApi = {
  // Topics
  listTopics(shopId) {
    const q = new URLSearchParams();
    if (shopId) q.set("shop_id", shopId);
    return apiFetch(`/api/media/topics?${q.toString()}`);
  },

  // alias để không vỡ code cũ
  getTopics(shopId) {
    return this.listTopics(shopId);
  },

  createTopic(payload) {
    return apiFetch(`/api/media/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  updateTopic(id, payload) {
    return apiFetch(`/api/media/topics/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  deleteTopic(id) {
    return apiFetch(`/api/media/topics/${id}`, { method: "DELETE" });
  },

  // Assets
  listAssets(topicId) {
    return apiFetch(`/api/media/topics/${topicId}/assets`);
  },

  // alias để không vỡ code cũ
  getAssets(topicId) {
    return this.listAssets(topicId);
  },

  uploadAsset(topicId, file) {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch(`/api/media/topics/${topicId}/upload`, {
      method: "POST",
      body: fd,
    });
  },
  deleteAsset(assetId) {
    return apiFetch(`/api/media/assets/${assetId}`, { method: "DELETE" });
  },
};

export const marketingApi = {
  listStyles() {
    return apiFetch(`/api/marketing/styles`);
  },

  // payload: { shop_id, topic_id, cutout_asset_id, style }
  compose(payload) {
    return apiFetch(`/api/marketing/compose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};
