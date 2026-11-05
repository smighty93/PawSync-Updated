import AppRoutes from "./routes/AppRoutes";
import { useAuth } from "./context/AuthContext";

function App() {
  const { profile } = useAuth();
  const theme = profile?.role === "admin" ? "admin" : profile?.role === "veterinarian" ? "vet" : "owner";
  return <div className={`pawsync theme-${theme}`}><AppRoutes /></div>;
}
export default App;
