import { Navigate, Route, Routes } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import Welcome from "./pages/Welcome";
import Configuration from "./pages/Configuration";
import PupilData from "./pages/PupilData";
import Results from "./pages/Results";
import ClassEditor from "./pages/ClassEditor";
import { AppShell } from "./components/layout/AppShell";

function ScrollToTopOnNav() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTopOnNav />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "4px"
          }
        }}
      />
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route element={<AppShell />}>
          <Route path="/configure/:projectId" element={<Configuration />} />
          <Route path="/pupils/:projectId" element={<PupilData />} />
          <Route path="/results/:projectId" element={<Results />} />
          <Route path="/editor/:projectId" element={<ClassEditor />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

