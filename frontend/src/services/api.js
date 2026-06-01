import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
});

export const uploadReceipt = (file) => {
  const formData = new FormData();
  formData.append("receipt", file);
  // Do NOT set Content-Type manually — axios sets it automatically with
  // the correct multipart boundary when the body is a FormData object.
  return api.post("/receipts", formData);
};

export const getReceipts = () => api.get("/receipts");

export const getInsights = () => api.get("/insights");
