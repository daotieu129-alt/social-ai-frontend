// src/api/facebook.api.js
import api from "./client";

export const FacebookAPI = {
  // GET /api/facebook/login-url?shop_id=...
  getLoginUrl: async (shopId) => {
    if (!shopId) return null;

    const res = await api.get("/facebook/login-url", {
      params: { shop_id: shopId },
    });

    // BE trả { loginUrl } :contentReference[oaicite:2]{index=2}
    return res?.data?.loginUrl || null;
  },
};
