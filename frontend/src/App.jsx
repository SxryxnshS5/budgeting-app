import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import ReceiptsPage from "./pages/ReceiptsPage";
import InsightsPage from "./pages/InsightsPage";

const links = [
  { to: "/", label: "Upload", end: true },
  { to: "/receipts", label: "Receipts" },
  { to: "/insights", label: "Insights" },
];

function Brand() {
  return (
    <NavLink to="/" end className="group flex items-center gap-2.5 select-none">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-cream text-lg shadow-soft transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
        🍴
      </span>
      <span className="text-lg font-extrabold tracking-tight text-ink">
        Fork <span className="text-mauve">&amp;</span> Finance
      </span>
    </NavLink>
  );
}

function NavBar() {
  return (
    <nav className="sticky top-0 z-30 border-b border-white/40 bg-cream/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <Brand />
        <div className="flex items-center gap-1 rounded-full border border-white/60 bg-white/50 p-1 shadow-soft">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-300 ${
                  isActive
                    ? "text-cream"
                    : "text-slate hover:text-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-0 rounded-full bg-ink shadow-soft animate-fade-in" />
                  )}
                  <span className="relative">{l.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <main key={location.pathname} className="mx-auto max-w-5xl px-5 py-10 animate-fade-up">
      <Routes location={location}>
        <Route path="/" element={<UploadPage />} />
        <Route path="/receipts" element={<ReceiptsPage />} />
        <Route path="/insights" element={<InsightsPage />} />
      </Routes>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <NavBar />
        <AnimatedRoutes />
      </div>
    </BrowserRouter>
  );
}
