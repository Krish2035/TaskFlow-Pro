const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

interface RequestOptions extends RequestInit {
  token?: string;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, headers = {}, ...rest } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  } else if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem("taskflow_access_token");
    if (storedToken) {
      requestHeaders["Authorization"] = `Bearer ${storedToken}`;
    }
  }

  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  let response = await fetch(url, {
    headers: requestHeaders,
    credentials: "include", // send httpOnly cookies
    ...rest,
  });

  // Attempt automatic refresh token rotation on 401 Unauthorized
  if (response.status === 401 && !endpoint.includes("/auth/")) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.accessToken && typeof window !== "undefined") {
          localStorage.setItem("taskflow_access_token", refreshData.accessToken);
          requestHeaders["Authorization"] = `Bearer ${refreshData.accessToken}`;
          // Retry original request with refreshed token
          response = await fetch(url, {
            headers: requestHeaders,
            credentials: "include",
            ...rest,
          });
        }
      }
    } catch {
      // Refresh failed, continue with original 401
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || "An unexpected error occurred";
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}
