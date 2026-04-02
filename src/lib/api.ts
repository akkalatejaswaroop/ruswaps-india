const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function saveCalculation(type: string, data: unknown) {
  console.warn('saveCalculation should only be called from client components');
}

export async function fetchUserProfile() {
  console.warn('fetchUserProfile should only be called from client components');
  return null;
}

export { API_URL };
