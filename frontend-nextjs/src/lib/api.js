
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export async function apiRequest(endpoint, options = {}) {
  const { headers = {}, ...config } = options;

  const isFormData = config.body instanceof FormData;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...config,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  return data;
}

// Projects
export const getProjects = () =>
  apiRequest("/api/projects");

export const createProject = (formData) =>
  apiRequest("/api/projects", {
    method: "POST",
    body: formData,
  });

export const updateProject = (id, formData) =>
  apiRequest(`/api/projects/${id}`, {
    method: "PUT",
    body: formData,
  });

export const getCadDownloadLink = (id) =>
  apiRequest(`/api/projects/${id}/cad-file`);

// Manufacturers
export const getManufacturers = () =>
  apiRequest("/api/manufacturers");

export const registerManufacturer = (manufacturer) =>
  apiRequest("/api/manufacturers", {
    method: "POST",
    body: JSON.stringify(manufacturer),
  });

export const getManufacturerMatches = (projectId) =>
  apiRequest(`/api/manufacturers/match/${projectId}`);

// Administrator
export const adminLogin = (email, password) =>
  apiRequest("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const getPendingManufacturers = (token) =>
  apiRequest("/api/admin/manufacturers/pending", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const reviewManufacturer = (
  id,
  decision,
  token,
  additionalDetails = {}
) =>
  apiRequest(`/api/admin/manufacturers/${id}/review`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      decision,
      ...additionalDetails,
    }),
  });

  // RFQ management
export const getRFQs = () => apiRequest("/api/rfqs");

export const createRFQ = (rfqData) =>
  apiRequest("/api/rfqs", {
    method: "POST",
    body: JSON.stringify(rfqData),
  });

export const updateQuotation = (rfqId, manufacturerId, quotationData) =>
  apiRequest(`/api/rfqs/${rfqId}/quotations/${manufacturerId}`, {
    method: "PATCH",
    body: JSON.stringify(quotationData),
  });
