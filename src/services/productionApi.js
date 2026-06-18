const API_BASE = "https://kushalyouth.com/api";

async function handleResponse(response) {
  console.log("[API] Response status:", response.status);

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let data = null;

  try {
    data = isJson ? await response.json() : await response.text();
  } catch {
    throw new Error(`Failed to parse server response (HTTP ${response.status})`);
  }

  if (!response.ok) {
    if (!isJson) {
      throw new Error(
        `API request failed with HTTP ${response.status}. Check backend file path or Vite proxy target.`
      );
    }

    throw new Error(data?.message || `HTTP ${response.status}`);
  }

  if (isJson && data?.success === false) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

async function apiRequest(endpoint, { method = "GET", payload, signal } = {}) {
  const url = `${API_BASE}${endpoint}`;

  const options = {
    method,
    headers: {
      Accept: "application/json",
    },
    signal,
  };

  if (payload !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(payload);
    console.log("[API] Request URL:", url);
    console.log("[API] Payload:", payload);
  } else {
    console.log("[API] Request URL:", url);
  }

  try {
    const response = await fetch(url, options);
    return await handleResponse(response);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    console.error("[API] Error:", error);

    if (error instanceof TypeError) {
      throw new Error(
        "Network error: check PHP server, API path, or Vite proxy configuration"
      );
    }

    throw error;
  }
}

export const fetchEntriesApi = (signal) =>
  apiRequest("/entriesv2.php", { method: "GET", signal });

export const createEntryApi = (payload, signal) =>
  apiRequest("/entriesv2.php", { method: "POST", payload, signal });

export const updateEntryApi = (payload, signal) =>
  apiRequest("/entriesv2.php", { method: "PUT", payload, signal });

export const deleteEntryApi = (id, signal) =>
  apiRequest(`/entriesv2.php?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    signal,
  });