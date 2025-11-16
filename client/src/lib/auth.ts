export function isAuthenticated(): boolean {
  const token = localStorage.getItem("adminToken");
  return !!token;
}

export function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "/admin/login";
}
