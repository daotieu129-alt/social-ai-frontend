// src/api/inbox.api.js
import api from "./client";

export const InboxAPI = {
  // Conversations
  getFacebookConversations: (params = {}) =>
    api
      .get("/inbox/facebook/conversations", { params })
      .then((r) => r.data),
  // params thường: { shop_id, page_id?, limit?, cursor? }

  getFacebookMessages: (conversationId, params = {}) =>
    api
      .get(`/inbox/facebook/conversations/${conversationId}/messages`, { params })
      .then((r) => r.data),

  // Manual send
  sendFacebookMessage: (conversationId, payload) =>
    api
      .post(`/inbox/facebook/conversations/${conversationId}/send`, payload)
      .then((r) => r.data),
  // payload thường: { text }

  // Handover
  handover: (conversationId, payload = {}) =>
    api
      .post(`/inbox/facebook/conversations/${conversationId}/handover`, payload)
      .then((r) => r.data),

  removeHandover: (conversationId) =>
    api
      .delete(`/inbox/facebook/conversations/${conversationId}/handover`)
      .then((r) => r.data),

  // Meta
  updateConversationMeta: (conversationId, patch) =>
    api
      .patch(`/inbox/facebook/conversations/${conversationId}/meta`, patch)
      .then((r) => r.data),

  // Rules
  getRules: (shop_id) =>
    api.get("/inbox/facebook/rules", { params: { shop_id } }).then((r) => r.data),

  createRule: (payload) =>
    api.post("/inbox/facebook/rules", payload).then((r) => r.data),
  // payload thường: { shop_id, reply_text, keywords: [] }

  updateRule: (id, patch) =>
    api.patch(`/inbox/facebook/rules/${id}`, patch).then((r) => r.data),

  deleteRule: (id) =>
    api.delete(`/inbox/facebook/rules/${id}`).then((r) => r.data),

  // Working hours
  getHours: (shop_id) =>
    api.get("/inbox/facebook/hours", { params: { shop_id } }).then((r) => r.data),

  setHours: (payload) =>
    api.put("/inbox/facebook/hours", payload).then((r) => r.data),
  // payload thường: { shop_id, ...hoursConfig }
};
