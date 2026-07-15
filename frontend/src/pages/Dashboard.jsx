import { useAuth } from "../auth/AuthContext.jsx";
import AvatarUploader from "../components/AvatarUploader.jsx";
import FanDashboard from "./dashboards/FanDashboard.jsx";
import CelebrityDashboard from "./dashboards/CelebrityDashboard.jsx";
import AgentDashboard from "./dashboards/AgentDashboard.jsx";
import ManagerDashboard from "./dashboards/ManagerDashboard.jsx";
import SalesAgentDashboard from "./dashboards/SalesAgentDashboard.jsx";

function RoleDashboard({ role }) {
  switch (role) {
    case "fan":
      return <FanDashboard />;
    case "celebrity":
      return <CelebrityDashboard />;
    case "agent":
      return <AgentDashboard />;
    case "manager":
      return <ManagerDashboard />;
    case "sales_agent":
      return <SalesAgentDashboard />;
    default:
      return (
        <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-gray-500">
          No dashboard is available for this account type yet.
        </div>
      );
  }
}

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mx-auto max-w-4xl px-6 pt-8">
        <div className="card">
          <AvatarUploader />
        </div>
      </div>
      <RoleDashboard role={user.role} />
    </div>
  );
}
