import { useAuth } from "../auth/AuthContext.jsx";
import FanDashboard from "./dashboards/FanDashboard.jsx";
import CelebrityDashboard from "./dashboards/CelebrityDashboard.jsx";
import AgentDashboard from "./dashboards/AgentDashboard.jsx";
import ManagerDashboard from "./dashboards/ManagerDashboard.jsx";

export default function Dashboard() {
  const { user } = useAuth();

  switch (user.role) {
    case "fan":
      return <FanDashboard />;
    case "celebrity":
      return <CelebrityDashboard />;
    case "agent":
      return <AgentDashboard />;
    case "manager":
      return <ManagerDashboard />;
    default:
      return (
        <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-gray-500">
          No dashboard is available for this account type yet.
        </div>
      );
  }
}
