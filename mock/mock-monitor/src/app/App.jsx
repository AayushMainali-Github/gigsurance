import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../features/layout/AppShell';
import { OverviewPage } from '../features/overview/OverviewPage';
import { DeliveryPage } from '../features/delivery/DeliveryPage';
import { WeatherPage } from '../features/weather/WeatherPage';
import { AqiPage } from '../features/aqi/AqiPage';
import { CitiesPage } from '../features/cities/CitiesPage';
import { PlatformsPage } from '../features/platforms/PlatformsPage';
import { DriversPage } from '../features/drivers/DriversPage';
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
        <Route path="/platforms" element={<PlatformsPage />} />
        <Route path="/cities" element={<CitiesPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/live" element={<PlaceholderPage title="Live Orders" description="Real-time order monitoring will be added once live endpoints are expanded." />} />
        <Route path="/maps" element={<PlaceholderPage title="Maps" description="Geospatial command views will land in the next phase." />} />
        <Route path="/alerts" element={<PlaceholderPage title="Alerts" description="Alerting and anomaly detection will land in the next phase." />} />
      </Routes>
    </AppShell>
  );
}
