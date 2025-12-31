// src/api/scheduler.api.js
import api from "./client";

export const SchedulerAPI = {
  // PRO + auth
  getAccounts: (shop_id) =>
    api.get("/scheduler/accounts", { params: { shop_id } }).then((r) => r.data),

  createAccount: (payload) =>
    api.post("/scheduler/accounts", payload).then((r) => r.data),

  getScheduledPosts: (shop_id) =>
    api
      .get("/scheduler/scheduled-posts", { params: { shop_id } })
      .then((r) => r.data),

  createScheduledPost: (payload) =>
    api.post("/scheduler/scheduled-posts", payload).then((r) => r.data),

  updateScheduledPost: (id, patch) =>
    api.patch(`/scheduler/scheduled-posts/${id}`, patch).then((r) => r.data),

  deleteScheduledPost: (id) =>
    api.delete(`/scheduler/scheduled-posts/${id}`).then((r) => r.data),

  retryScheduledPost: (id) =>
    api.post(`/scheduler/scheduled-posts/${id}/retry`).then((r) => r.data),

  retryDeadPosts: (shop_id) =>
    api.post("/scheduler/retry-dead", { shop_id }).then((r) => r.data),

  // ⚠️ Internal/Cron only (FE gọi sẽ lỗi Invalid scheduler secret nếu env có SCHEDULER_SECRET)
  runDuePosts: () => api.post("/scheduler/run-due-posts").then((r) => r.data),

  // ✅ User-safe Post now
  postNow: (id) =>
    api.post(`/scheduler/scheduled-posts/${id}/post-now`).then((r) => r.data),
};
