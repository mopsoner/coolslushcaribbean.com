import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { isAuthenticated } from "@/lib/auth";

export function useAdminAuth() {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (!isAuthenticated()) {
        setLocation("/admin/login");
        setIsChecking(false);
        return;
      }

      // Verify token with server
      try {
        const token = localStorage.getItem("adminToken");
        const response = await fetch("/api/auth/check", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok || !(await response.json()).authenticated) {
          // Token invalid, clear and redirect
          localStorage.removeItem("adminToken");
          setLocation("/admin/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("adminToken");
        setLocation("/admin/login");
      } finally {
        setIsChecking(false);
      }
    }

    checkAuth();
  }, [setLocation]);

  return !isChecking;
}
