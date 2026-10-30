import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import SpatialBackground from '../ui/SpatialBackground';
import OfflineBanner from '../ui/OfflineBanner';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[var(--background)] relative flex flex-col selection:bg-blue-500/20 selection:text-blue-900">
      <OfflineBanner />
      <SpatialBackground density={16} />
      
      {/* Top Navbar */}
      <Navigation />
      
      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16 relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
