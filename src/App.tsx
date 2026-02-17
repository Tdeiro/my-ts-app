import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import AppShell from "./Components/Shared/Menu/AppShell";
import TournamentsListPage from "./pages/TournamentsListPage";
import ClassesPage from "./pages/ClassesPage";
import CoachRegisterPage from "./pages/CoachRegisterPage";
import LandingPage from "./pages/LandingPage";
import RequireAuth from "./Components/RequireAuth";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AddEventPage from "./pages/AddEventPage";

function Layout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/coach/register" element={<CoachRegisterPage />} />
          <Route element={<Layout />}>
            {/* <Route index element={<Navigate to="/dashboard" replace />} /> */}
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route path="/tournaments" element={<TournamentsListPage />} />
            <Route path="/tournaments/new" element={<AddEventPage />} />
            <Route path="/classes" element={<ClassesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
