/** Client-side launch flow session helpers */
export function clearLaunchSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("launch:input");
  sessionStorage.removeItem("launch:launchId");
  sessionStorage.removeItem("launch:result");
  sessionStorage.removeItem("advantage:marketing-workspace");
}

export function goToLaunchTool() {
  if (typeof window === "undefined") return;
  clearLaunchSession();
  window.location.assign("/#tool");
}
