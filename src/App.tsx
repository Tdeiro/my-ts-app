import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import AppShell from "./Components/Shared/Menu/AppShell";
import TournamentsListPage from "./pages/TournamentsListPage";
import CoachRegisterPage from "./pages/CoachRegisterPage";
import LandingPage from "./pages/LandingPage";
import RequireAuth from "./Components/RequireAuth";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AddEventPage from "./pages/AddEventPage";
import RequireCreateAccess from "./Components/RequireCreateAccess";
import TournamentSetupPage from "./pages/TournamentSetupPage";
import RunTournamentPage from "./pages/RunTournamentPage";
import PlayerTournamentInvitePage from "./pages/PlayerTournamentInvitePage";
import TournamentPaymentPage from "./pages/TournamentPaymentPage";
import TournamentPaymentConfirmedPage from "./pages/TournamentPaymentConfirmedPage";
import AccountBillingPage from "./pages/AccountBillingPage";
import AccountCheckoutPage from "./pages/AccountCheckoutPage";
import TournamentViewPage from "./pages/TournamentViewPage";

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
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tournaments" element={<TournamentsListPage />} />
            <Route path="/account" element={<AccountBillingPage />} />
            <Route path="/account/checkout" element={<AccountCheckoutPage />} />
            <Route path="/tournaments/invite" element={<PlayerTournamentInvitePage />} />
            <Route path="/tournaments/payment" element={<TournamentPaymentPage />} />
            <Route path="/tournaments/payment/confirmed" element={<TournamentPaymentConfirmedPage />} />
            <Route path="/tournaments/:id" element={<TournamentViewPage />} />
            <Route
              path="/tournaments/new"
              element={
                <RequireCreateAccess>
                  <AddEventPage />
                </RequireCreateAccess>
              }
            />
            <Route
              path="/tournaments/:id/edit"
              element={
                <RequireCreateAccess>
                  <AddEventPage />
                </RequireCreateAccess>
              }
            />
            <Route
              path="/tournaments/:id/setup"
              element={
                <RequireCreateAccess>
                  <TournamentSetupPage />
                </RequireCreateAccess>
              }
            />
            <Route
              path="/tournaments/:id/run"
              element={
                <RequireCreateAccess>
                  <RunTournamentPage />
                </RequireCreateAccess>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
