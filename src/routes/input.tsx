import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/input")({
  head: () => ({
    meta: [
      { title: "New Launch — AdVantage" },
      { name: "description", content: "Describe your product and let the GTM swarm build your launch pack." },
    ],
  }),
  component: InputRedirect,
});

/** Legacy route — scrolls to embedded tool on home */
function InputRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/", hash: "tool", replace: true });
  }, [navigate]);
  return null;
}
