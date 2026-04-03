
export async function saveCalculation(type: string, data: unknown) {
  if (typeof window === 'undefined') return;
  
  const token = localStorage.getItem('accessToken');
  if (!token) return;

  try {
    await fetch(`/api/calculations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ type, data }),
    });
  } catch (err) {
    console.error('Failed to save calculation:', err);
  }
}

export async function fetchUserProfile() {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  try {
    const response = await fetch(`/api/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (err) {
    return null;
  }
}
