"use client";

import { usePathname } from "next/navigation";
import Navbar from "./navbar";

export default function ClientNavbar() {
  const pathname = usePathname();
  
  // Omit navbar on auth routes and admin panel routes
  const isAuthRoute = 
    pathname === "/login" || 
    pathname === "/signup" || 
    pathname === "/admin-login" || 
    pathname === "/register-subscriber/login";
  
  const isAdminRoute = pathname.startsWith("/admin");
  
  if (isAuthRoute || isAdminRoute) return null;
  
  return <Navbar />;
}
