// utils/postData.js
export async function postData(url, payload, options = {}) {
  const {
    headers = {},
    credentials,
    signal,
  } = options;

  console.log("[postData] Request URL:", url);
  console.log("[postData] JSON payload:", payload);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...headers,
      },
      body: JSON.stringify(payload),
      credentials,
      signal,
    });

    console.log("[postData] Response status:", response.status);

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    const responseData = isJson
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const error = new Error(
        `POST failed with status ${response.status} ${response.statusText}`
      );
      error.status = response.status;
      error.response = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    const isNetworkError = error instanceof TypeError;

    console.error("[postData] Request failed:", error);

    if (isNetworkError) {
      throw new Error(
        "Network error: Could not reach the PHP server. Check localhost URL, Apache/PHP server status, and CORS settings."
      );
    }

    throw error;
  }
}