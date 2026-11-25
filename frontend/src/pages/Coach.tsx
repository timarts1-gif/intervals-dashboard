import { useAsync } from '../hooks/useAsync';
import { api } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { CoachOverview } from '../components/coach/CoachOverview';
import { ErrorState, LoadingState } from '../components/States';

export function Coach() {
  const { data, loading, error } = useAsync(() => api.coach(), []);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Coach"
        subtitle="Trainingsstatus van je atleten over de afgelopen 28 dagen. Deze pagina is ook te delen via /share/ met het share-wachtwoord."
      />
      <Card>{loading ? <LoadingState /> : error ? <ErrorState message={error} /> : data && <CoachOverview data={data} />}</Card>
    </div>
  );
}
