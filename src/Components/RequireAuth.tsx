import type { JSX } from "react";
import { Navigate } from "react-router-dom";
import { isLoggedIn } from "../auth/tokens";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  if (!isLoggedIn()) return <Navigate to="/login" />;
  return children;
}
