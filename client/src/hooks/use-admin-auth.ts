import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export function useAdminAuth() {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/check", {
          credentials: "include",
        });

        if (!response.ok || !(await response.json()).authenticated) {
          setLocation("/admin/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setLocation("/admin/login");
      } finally {
        setIsChecking(false);
      }
    }

    checkAuth();
  }, [setLocation]);

  return !isChecking;
}
