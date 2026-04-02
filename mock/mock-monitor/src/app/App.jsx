import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../features/layout/AppShell';
import { OverviewPage } from '../features/overview/OverviewPage';
import { DeliveryPage } from '../features/delivery/DeliveryPage';
import { WeatherPage } from '../features/weather/WeatherPage';
import { AqiPage } from '../features/aqi/AqiPage';
import { CitiesPage } from '../features/cities/CitiesPage';
import { PlatformsPage } from '../features/platforms/PlatformsPage';
import { DriversPage } from '../features/drivers/DriversPage';
import { MapsPage } from '../features/maps/MapsPage';
import { LivePage } from '../features/live/LivePage';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { AlertsPage } from '../features/alerts/AlertsPage';

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
        <Route path="/maps" element={<MapsPage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
      </Routes>
    </AppShell>
  );
}
