export interface ApiError {
  success: false;
  message: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface SaveCalculationParams {
  type: string;
  data: Record<string, unknown>;
}

export interface SaveCalculationResult {
  id: string;
  type: string;
  createdAt: Date;
}

async function getCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/csrf', {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      return data.csrfToken || null;
    }
  } catch {
    // CSRF endpoint not available
  }
  return null;
}

export async function saveCalculation(params: SaveCalculationParams): Promise<ApiResponse<SaveCalculationResult>> {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Cannot save calculation on server' };
  }

  const csrfToken = await getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  try {
    const res = await fetch(`/api/calculations`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return { 
        success: false, 
        message: data.message || `Server error: ${res.status}` 
      };
    }

    return { success: true, data: data.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { success: false, message: `Failed to save calculation: ${message}` };
  }
}

export interface UserProfile {
  id: string;
  phone: string;
  email?: string;
  name: string;
  isActive: boolean;
  isSubscribed: boolean;
  subscriptionExpiry?: string;
}

export async function fetchUserProfile(): Promise<ApiResponse<UserProfile>> {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Cannot fetch profile on server' };
  }

  try {
    const response = await fetch(`/api/user/profile`, {
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { 
        success: false, 
        message: data.message || `Failed to fetch profile: ${response.status}` 
      };
    }

    return { success: true, data: data.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { success: false, message: `Failed to fetch profile: ${message}` };
  }
}

export interface UpdateProfileParams {
  name?: string;
  email?: string;
  newPassword?: string;
  currentPassword?: string;
}

export async function updateUserProfile(params: UpdateProfileParams): Promise<ApiResponse<UserProfile>> {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Cannot update profile on server' };
  }

  const csrfToken = await getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  try {
    const res = await fetch(`/api/user/profile`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return { 
        success: false, 
        message: data.message || `Server error: ${res.status}` 
      };
    }

    return { success: true, data: data.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { success: false, message: `Failed to update profile: ${message}` };
  }
}
