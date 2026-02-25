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
import CreateClassPage from "./pages/CreateClassPage";
import RequireCreateAccess from "./Components/RequireCreateAccess";
import TournamentSetupPage from "./pages/TournamentSetupPage";
import TournamentGroupsPage from "./pages/TournamentGroupsPage";
import TeamsPage from "./pages/TeamsPage";
import PlayerTournamentInvitePage from "./pages/PlayerTournamentInvitePage";
import TournamentPaymentPage from "./pages/TournamentPaymentPage";
import UpcomingEventsPage from "./pages/UpcomingEventsPage";

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
            <Route path="/events/upcoming" element={<UpcomingEventsPage />} />
            <Route path="/tournaments/invite" element={<PlayerTournamentInvitePage />} />
            <Route path="/tournaments/payment" element={<TournamentPaymentPage />} />
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
              path="/tournaments/:id/groups"
              element={
                <RequireCreateAccess>
                  <TournamentGroupsPage />
                </RequireCreateAccess>
              }
            />
            <Route path="/classes" element={<ClassesPage />} />
            <Route
              path="/teams"
              element={
                <RequireCreateAccess>
                  <TeamsPage />
                </RequireCreateAccess>
              }
            />
            <Route
              path="/classes/new"
              element={
                <RequireCreateAccess>
                  <CreateClassPage />
                </RequireCreateAccess>
              }
            />
            <Route
              path="/classes/:id/edit"
              element={
                <RequireCreateAccess>
                  <CreateClassPage />
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
