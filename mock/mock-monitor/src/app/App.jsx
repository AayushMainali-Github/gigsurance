import { LoaderCircle } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../features/layout/AppShell';
import { OverviewPage } from '../features/overview/OverviewPage';
import { DeliveryPage } from '../features/delivery/DeliveryPage';
import { WeatherPage } from '../features/weather/WeatherPage';
import { AqiPage } from '../features/aqi/AqiPage';
import { CitiesPage } from '../features/cities/CitiesPage';
import { PlatformsPage } from '../features/platforms/PlatformsPage';
import { DriversPage } from '../features/drivers/DriversPage';
import { LivePage } from '../features/live/LivePage';
import { AlertsPage } from '../features/alerts/AlertsPage';

const MapsPage = lazy(() => import('../features/maps/MapsPage').then((module) => ({ default: module.MapsPage })));
const AnalyticsPage = lazy(() => import('../features/analytics/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));

function RouteLoader() {
  return (
    <section className="card placeholder-card route-loader">
      <div className="panel-heading">
        <div className="panel-title-row">
          <span className="panel-icon"><LoaderCircle size={18} strokeWidth={2} /></span>
          <h2>Loading workspace</h2>
        </div>
      </div>
      <p>The selected monitor surface is being loaded.</p>
    </section>
  );
}

export function App() {
  return (
    <AppShell>
      <Suspense fallback={<RouteLoader />}>
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
      </Suspense>
    </AppShell>
  );
}
