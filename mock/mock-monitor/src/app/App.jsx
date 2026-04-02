import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../features/layout/AppShell';
import { OverviewPage } from '../features/overview/OverviewPage';
import { DeliveryPage } from '../features/delivery/DeliveryPage';
import { WeatherPage } from '../features/weather/WeatherPage';
import { AqiPage } from '../features/aqi/AqiPage';
import { PlaceholderPage } from '../features/layout/PlaceholderPage';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/weather" element={<WeatherPage />} />
        <Route path="/aqi" element={<AqiPage />} />
        <Route path="/platforms" element={<PlaceholderPage title="Platforms" description="Platform intelligence workspace will land in the next phase." />} />
        <Route path="/cities" element={<PlaceholderPage title="Cities" description="City drilldowns and dashboard cards will land in the next phase." />} />
        <Route path="/drivers" element={<PlaceholderPage title="Drivers" description="Driver-level investigative workflows will land in the next phase." />} />
        <Route path="/live" element={<PlaceholderPage title="Live Orders" description="Real-time order monitoring will be added once live endpoints are expanded." />} />
        <Route path="/maps" element={<PlaceholderPage title="Maps" description="Geospatial command views will land in the next phase." />} />
        <Route path="/alerts" element={<PlaceholderPage title="Alerts" description="Alerting and anomaly detection will land in the next phase." />} />
      </Routes>
    </AppShell>
  );
}
