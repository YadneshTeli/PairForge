import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';
import { ROLES } from './types';
import { Note, PageHead, pretty } from './ui';

type Criterion = { id: string; role: string; key: string; label: string; sortOrder: number; active: boolean };
type Weight = { role: string; weight: number };
type Report = { id: string; targetType: string; targetId: string; reason: string; createdAt: string; reporterName: string };

export function AdminPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isAdmin = session?.user.isAdmin === true;
  const criteria = useQuery({
    queryKey: ['admin-criteria'],
    enabled: isAdmin,
    queryFn: () => api<{ criteria: Criterion[] }>('/admin/rating-criteria'),
  });
  const weights = useQuery({
    queryKey: ['admin-weights'],
    enabled: isAdmin,
    queryFn: () => api<{ weights: Weight[] }>('/admin/role-weights'),
  });
  const reports = useQuery({
    queryKey: ['admin-reports'],
    enabled: isAdmin,
    queryFn: () => api<{ reports: Report[] }>('/admin/reports'),
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-criteria'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-weights'] });
  };

  const toggle = useMutation({
    mutationFn: (item: Criterion) => api(`/admin/rating-criteria/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !item.active }),
    }),
    onSuccess: refresh,
  });

  if (!isAdmin) return <Navigate to="/feed" replace />;

  async function saveWeight(event: FormEvent<HTMLFormElement>, role: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    try {
      await api(`/admin/role-weights/${role}`, {
        method: 'PATCH',
        body: JSON.stringify({ weight: Number(data.get('weight')) }),
      });
      setNotice(`Weight for ${pretty(role)} saved.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the weight');
    }
  }

  async function addCriterion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    try {
      await api('/admin/rating-criteria', {
        method: 'POST',
        body: JSON.stringify({
          role: String(data.get('role')),
          key: String(data.get('key')),
          label: String(data.get('label')),
        }),
      });
      event.currentTarget.reset();
      setNotice('Criterion added.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the criterion');
    }
  }

  async function setPremium(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    try {
      await api(`/admin/profiles/${String(data.get('profileId'))}/premium`, {
        method: 'PATCH',
        body: JSON.stringify({ isPremium: data.get('premium') === 'on' }),
      });
      setNotice('Premium flag updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update premium');
    }
  }

  return (
    <div className="stack">
      <PageHead title="Admin" lede="Tune rating criteria and role weights, review reports, and grant premium. Checkout stays off until Razorpay is connected." />
      {error && <Note tone="error">{error}</Note>}
      {notice && <Note tone="ok">{notice}</Note>}
      {(criteria.isLoading || weights.isLoading) && <p className="meta">Loading configuration…</p>}
      {criteria.error && <Note tone="error">{(criteria.error as Error).message}</Note>}

      <section className="card stack">
        <h2>Role weights</h2>
        {(weights.data?.weights ?? []).map((item) => (
          <form className="row" key={item.role} onSubmit={(event) => saveWeight(event, item.role)}>
            <label className="field grow">{pretty(item.role)}
              <input name="weight" type="number" min={0.1} max={10} step={0.1} defaultValue={item.weight} />
            </label>
            <button type="submit">Save</button>
          </form>
        ))}
      </section>

      <section className="card stack">
        <h2>Rating criteria</h2>
        {(criteria.data?.criteria ?? []).map((item) => (
          <div className="row spread" key={item.id}>
            <span><strong>{pretty(item.role)}</strong> · {item.label} · {item.key}</span>
            <button className="ghost" type="button" onClick={() => toggle.mutate(item)}>{item.active ? 'Turn off' : 'Turn on'}</button>
          </div>
        ))}
        <form className="stack" onSubmit={addCriterion}>
          <label className="field">Role
            <select name="role" defaultValue="developer">
              {ROLES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label className="field">Key<input name="key" required pattern="[a-z][a-z0-9_]{0,40}" placeholder="would_join" /></label>
          <label className="field">Label<input name="label" required /></label>
          <button type="submit">Add criterion</button>
        </form>
      </section>

      <section className="card stack">
        <h2>Premium</h2>
        <form className="stack" onSubmit={setPremium}>
          <label className="field">Profile id<input name="profileId" required placeholder="UUID" /></label>
          <label className="choice"><input type="checkbox" name="premium" defaultChecked /> Premium</label>
          <button type="submit">Update flag</button>
        </form>
      </section>

      <section className="card stack">
        <h2>Reports</h2>
        {reports.isLoading && <p className="meta">Loading reports…</p>}
        {reports.error && <Note tone="error">{(reports.error as Error).message}</Note>}
        {(reports.data?.reports ?? []).length === 0 && !reports.isLoading && <p className="meta">No reports yet.</p>}
        {(reports.data?.reports ?? []).map((report) => (
          <article key={report.id} className="stack">
            <strong>{report.reporterName}</strong>
            <p className="meta">{pretty(report.targetType)} · {new Date(report.createdAt).toLocaleString()}</p>
            <p>{report.reason}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
