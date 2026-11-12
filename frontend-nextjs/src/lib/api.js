const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://global-manufacturer-matchmaker.onrender.com"
    : "http://localhost:5000");

export async function apiRequest(endpoint, options = {}) {
  const { headers = {}, ...config } = options;

  const isFormData =
    typeof FormData !== "undefined" && config.body instanceof FormData;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...config,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    cache: "no-store",
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

export const createProject = (formData, token) =>
  apiRequest("/api/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

export const updateProject = (id, formData, token) =>
  apiRequest(`/api/projects/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

export const deleteProject = (id, token) =>
  apiRequest(`/api/projects/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const getCadDownloadLink = (id, token) =>
  apiRequest(`/api/projects/${id}/cad-file`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

// Manufacturers
export const getManufacturers = () =>
  apiRequest("/api/manufacturers/");

export const registerManufacturer = (manufacturer) =>
  apiRequest("/api/manufacturers/", {
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
export const getRFQs = (token) =>
  apiRequest("/api/rfqs", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const createRFQ = (rfqData, token) =>
  apiRequest("/api/rfqs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(rfqData),
  });

  // Award RFQ to a selected manufacturer (administrator only)
export const awardRFQ = (rfqId, manufacturerId, token) =>
  apiRequest(`/api/rfqs/${rfqId}/award`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ manufacturerId }),
  });

export const updateQuotation = (rfqId, manufacturerId, quotationData) =>
  apiRequest(`/api/rfqs/${rfqId}/quotations/${manufacturerId}`, {
    method: "PATCH",
    body: JSON.stringify(quotationData),
  });

  // Supplier authentication
export const activateManufacturer = (
  contactEmail,
  activationToken,
  password
) =>
  apiRequest("/api/manufacturers/activate", {
    method: "POST",
    body: JSON.stringify({
      contactEmail,
      activationToken,
      password,
    }),
  });

export const manufacturerLogin = (contactEmail, password) =>
  apiRequest("/api/manufacturers/login", {
    method: "POST",
    body: JSON.stringify({
      contactEmail,
      password,
    }),
  });

// Supplier RFQs
export const getSupplierRFQs = (token) =>
  apiRequest("/api/rfqs/supplier/my-rfqs", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const submitSupplierQuotation = (
  rfqId,
  manufacturerId,
  quotationData,
  token
) =>
  apiRequest(
    `/api/rfqs/${rfqId}/quotations/${manufacturerId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(quotationData),
    }
  );

  // Generate a manufacturer activation token (administrator only)
export const generateManufacturerActivationToken = (manufacturerId, token) =>
  apiRequest(`/api/admin/manufacturers/${manufacturerId}/activation-token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  export const getManufacturersAwaitingActivation = (token) =>
  apiRequest("/api/admin/manufacturers/awaiting-activation", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });