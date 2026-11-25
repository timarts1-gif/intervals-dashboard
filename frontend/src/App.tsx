import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Overview } from './pages/Overview';
import { Training } from './pages/Training';
import { Performance } from './pages/Performance';
import { PowerAnalysis } from './pages/PowerAnalysis';
import { Development } from './pages/Development';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="training" element={<Training />} />
        <Route path="performance" element={<Performance />} />
        <Route path="power" element={<PowerAnalysis />} />
        <Route path="development" element={<Development />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
