import type { JSX } from "react";
import { Navigate } from "react-router-dom";
import { getLoggedInRole, hasCreatorAccess, isLoggedIn } from "../auth/tokens";

export default function RequireCreateAccess({
  children,
}: {
  children: JSX.Element;
}) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  const role = getLoggedInRole();
  if (!hasCreatorAccess(role)) return <Navigate to="/dashboard" replace />;

  return children;
}
