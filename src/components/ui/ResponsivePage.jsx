import { useSyncExternalStore } from "react";
const query = "(min-width: 1024px)";
function subscribe(callback) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const getSnapshot = () => window.matchMedia(query).matches;
const getServerSnapshot = () => true;
export default function ResponsivePage({ desktop, mobile }) {
  const isDesktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return isDesktop ? desktop : mobile;
}
