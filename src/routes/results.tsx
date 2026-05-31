import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Legacy route — marketing dashboard is the home for completed runs */
export const Route = createFileRoute("/results")({
  component: () => <Navigate to="/dashboard" />,
});
