import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminShell } from '../features/layout/AdminShell';
import { OverviewPage } from '../features/overview/OverviewPage';
import { PremiumsPage } from '../features/premiums/PremiumsPage';
import { PayoutsPage } from '../features/payouts/PayoutsPage';
import { FinancePage } from '../features/finance/FinancePage';
import { ReviewsPage } from '../features/reviews/ReviewsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminShell />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: '/overview', element: <OverviewPage /> },
      { path: '/premiums', element: <PremiumsPage /> },
      { path: '/payouts', element: <PayoutsPage /> },
      { path: '/finance', element: <FinancePage /> },
      { path: '/reviews', element: <ReviewsPage /> },
      { path: '*', element: <Navigate to="/overview" replace /> }
    ]
  }
]);
