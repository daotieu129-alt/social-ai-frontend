// src/api/customers.api.js
import api from "./client";

export const CustomersAPI = {
  list: (shop_id) => api.get("/customers", { params: { shop_id } }).then((r) => r.data),
  create: (payload) => api.post("/customers", payload).then((r) => r.data),
  addNote: (payload) => api.post("/customer-notes", payload).then((r) => r.data),
};
