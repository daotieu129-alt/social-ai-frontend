// src/api/media.js
// Fetch wrapper tối giản, tự gắn Authorization từ localStorage("token").
// Nếu project của bạn dùng client.js/axios riêng, có thể thay phần apiFetch bằng client đó.

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "") || "";

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
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const mediaApi = {
  // Topics
  listTopics(shopId) {
    const q = new URLSearchParams();
    if (shopId) q.set("shop_id", shopId);
    return apiFetch(`/api/media/topics?${q.toString()}`);
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
  uploadAsset(topicId, file) {
    const fd = new FormData();
    fd.append("file", file); // backend expects field name: "file"
    return apiFetch(`/api/media/topics/${topicId}/upload`, {
      method: "POST",
      body: fd,
    });
  },
  updateAsset(assetId, payload) {
    return apiFetch(`/api/media/assets/${assetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  deleteAsset(assetId) {
    return apiFetch(`/api/media/assets/${assetId}`, { method: "DELETE" });
  },
};
