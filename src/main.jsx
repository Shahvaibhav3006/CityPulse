import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard,
  MapPinned,
  TriangleAlert,
  Truck,
  ClipboardCheck,
  Timer,
  RefreshCcw,
  LogOut,
  ShieldCheck,
  Activity,
  Search,
  Plus,
  CheckCircle2,
  AlertOctagon,
  RadioTower
} from 'lucide-react';
import './style.css';
import { supabase, configured } from './supabase';

async function getProfile() {
  let { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  let { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  return data;
}

async function loadData() {
  let [a, b, c, d, e] = await Promise.all([
    supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false }),

    supabase
      .from('fleets')
      .select('*'),

    supabase
      .from('coverage')
      .select('*'),

    supabase
      .from('work_orders')
      .select('*')
      .order('created_at', { ascending: false }),

    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
  ]);

  for (let x of [a, b, c, d, e]) {
    if (x.error) throw x.error;
  }

  return {
    incidents: a.data.map(x => ({
      ...x,
      createdAt: x.created_at,
      slaHours: x.sla_hours
    })),

    fleets: b.data,

    coverage: c.data,

    workOrders: d.data.map(x => ({
      ...x,
      incidentId: x.incident_id
    })),

    profiles: e.data
  };
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [err, setErr] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Road Maintenance'
  });

  async function submit(e) {
    e.preventDefault();
    setErr('');

    try {
      if (!configured) {
        throw Error(
          'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
        );
      }

      if (mode === 'login') {
        let { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });

        if (error) throw error;

        let p = await getProfile();
        onLogin(p);
      } else {
        let { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              name: form.name,
              department: form.department
            }
          }
        });

        if (error) throw error;

        setMode('login');
        setErr(
          'Registration created. Verify email if enabled, then wait for administrator approval.'
        );
      }
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="auth">
      <div className="authBrand">
        <div className="logo">
          <RadioTower /> CityPulse <b>AI</b>
        </div>

        <h1>
          From moving fleets to <span>verified civic action.</span>
        </h1>

        <p>
          Multi-fleet urban intelligence that detects, validates, assigns,
          tracks and independently verifies city issues.
        </p>

        <div className="flow">
          <i>SENSE</i>
          <i>UNDERSTAND</i>
          <i>ACT</i>
          <i>VERIFY</i>
          <i>LEARN</i>
        </div>
      </div>

      <form className="authCard" onSubmit={submit}>
        <small>SECURE CITY OPERATIONS</small>

        <h2>
          {mode === 'login' ? 'Welcome back' : 'Request access'}
        </h2>

        <p>
          {mode === 'login'
            ? 'Sign in with your approved account.'
            : 'New accounts remain pending until an administrator approves them.'}
        </p>

        {mode === 'register' && (
          <input
            placeholder="Full name"
            value={form.name}
            onChange={e =>
              setForm({ ...form, name: e.target.value })
            }
            required
          />
        )}

        <input
          type="email"
          placeholder="Work email"
          value={form.email}
          onChange={e =>
            setForm({ ...form, email: e.target.value })
          }
          required
        />

        <input
          type="password"
          minLength="6"
          placeholder="Password"
          value={form.password}
          onChange={e =>
            setForm({ ...form, password: e.target.value })
          }
          required
        />

        {mode === 'register' && (
          <select
            value={form.department}
            onChange={e =>
              setForm({ ...form, department: e.target.value })
            }
          >
            <option>Road Maintenance</option>
            <option>Drainage</option>
            <option>Traffic</option>
            <option>Waste Management</option>
            <option>Fleet Operations</option>
          </select>
        )}

        <button>
          {mode === 'login' ? 'Login' : 'Create access request'}
        </button>

        {err && <div className="msg">{err}</div>}

        <div className="switch">
          {mode === 'login'
            ? 'New authorized user?'
            : 'Already registered?'}{' '}
          <b
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setErr('');
            }}
          >
            {mode === 'login' ? 'Register' : 'Login'}
          </b>
        </div>
      </form>
    </div>
  );
}

const menu = [
  ['Command Center', LayoutDashboard],
  ['Incidents', TriangleAlert],
  ['Work Orders', ClipboardCheck],
  ['SLA & Escalations', Timer],
  ['Coverage Intelligence', MapPinned],
  ['Fleet Network', Truck],
  ['Recurring Defects', RefreshCcw],
  ['User Approvals', ShieldCheck]
];

function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState('Command Center');
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');

  async function bootstrap() {
    if (!configured) {
      setReady(true);
      return;
    }

    let { data: { session } } = await supabase.auth.getSession();

    if (session) {
      try {
        setUser(await getProfile());
      } catch {}
    }

    setReady(true);
  }

  useEffect(() => {
    bootstrap();

    let sub = configured
      ? supabase.auth.onAuthStateChange(() => {}).data.subscription
      : null;

    return () => sub?.unsubscribe();
  }, []);

  async function load() {
    if (user?.status === 'APPROVED') {
      try {
        setData(await loadData());
      } catch (e) {
        console.error(e);
      }
    }
  }

  useEffect(() => {
    load();
  }, [user]);

  async function logout() {
    await supabase?.auth.signOut();
    setUser(null);
    setData(null);
  }

  if (!ready) {
    return <div className="loading">Starting CityPulse…</div>;
  }

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  if (user.status !== 'APPROVED') {
    return (
      <div className="auth">
        <div className="authBrand">
          <div className="logo">
            <RadioTower /> CityPulse <b>AI</b>
          </div>

          <h1>
            Access request <span>{user.status.toLowerCase()}.</span>
          </h1>

          <p>
            Your account exists in Supabase, but operational data remains
            locked until an administrator approves your profile.
          </p>
        </div>

        <div className="authCard">
          <small>ACCOUNT STATUS</small>
          <h2>{user.status}</h2>

          <p>
            {user.name}
            <br />
            {user.email}
            <br />
            {user.department}
          </p>

          <button onClick={logout}>Sign out</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="loading">
        Loading CityPulse intelligence…
      </div>
    );
  }

  let allowed = menu.filter(([n]) => {
    if (n === 'User Approvals') {
      return ['COMMAND_CENTER', 'SENIOR_AUTHORITY'].includes(user.role);
    }

    if (
      user.role === 'COMMAND_CENTER' ||
      user.role === 'SENIOR_AUTHORITY'
    ) {
      return true;
    }

    if (user.role === 'DEPARTMENT') {
      return n !== 'Fleet Network';
    }

    if (user.role === 'FLEET_MANAGER') {
      return [
        'Command Center',
        'Coverage Intelligence',
        'Fleet Network'
      ].includes(n);
    }

    return ['Command Center', 'Work Orders'].includes(n);
  });

  return (
    <div className="app">
      <aside>
        <div className="logo">
          <RadioTower /> CityPulse <b>AI</b>
        </div>

        <div className="role">
          <ShieldCheck />

          <span>
            <b>{user.name}</b>
            <small>
              {user.department} · {user.role}
            </small>
          </span>
        </div>

        <nav>
          {allowed.map(([n, I]) => (
            <button
              className={page === n ? 'active' : ''}
              onClick={() => setPage(n)}
              key={n}
            >
              <I />
              {n}
            </button>
          ))}
        </nav>

        <button className="logout" onClick={logout}>
          <LogOut /> Logout
        </button>
      </aside>

      <main>
        <header>
          <div>
            <small>CITY OPERATIONS /</small> <b>{page}</b>
          </div>

          <div className="search">
            <Search />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search intelligence…"
            />
          </div>
        </header>

        <Content
          page={page}
          data={data}
          reload={load}
          q={q}
        />
      </main>
    </div>
  );
}

function Content({ page, data, reload, q }) {
  let inc = data.incidents;

  if (q) {
    inc = inc.filter(x =>
      (x.id + x.type + x.area + x.department)
        .toLowerCase()
        .includes(q.toLowerCase())
    );
  }

  if (page === 'Command Center')
    return <Dashboard d={data} />;

  if (page === 'Incidents')
    return <Incidents rows={inc} reload={reload} />;

  if (page === 'Work Orders')
    return <Orders d={data} reload={reload} />;

  if (page === 'SLA & Escalations')
    return <SLA rows={inc} />;

  if (page === 'Coverage Intelligence')
    return <Coverage d={data} />;

  if (page === 'Fleet Network')
    return <Fleet d={data} />;

  if (page === 'Recurring Defects')
    return <Recurring rows={inc} />;

  if (page === 'User Approvals')
    return (
      <Approvals
        rows={data.profiles}
        reload={reload}
      />
    );

  return null;
}

function Approvals({ rows, reload }) {
  async function set(id, status, role) {
    let { error } = await supabase
      .from('profiles')
      .update({ status, role })
      .eq('id', id);

    if (error) {
      alert(error.message);
    } else {
      reload();
    }
  }

  return (
    <section>
      <Title
        k="ACCESS CONTROL"
        h="User approvals"
        p="Registration does not grant operational access. Approve identity and role here."
      />

      <div className="panel table">
        <div className="tr head">
          <span>User</span>
          <span>Department</span>
          <span>Requested</span>
          <span>Role</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {rows.map(x => (
          <div className="tr" key={x.id}>
            <span>
              <b>{x.name}</b>
              <small>{x.email}</small>
            </span>

            <span>{x.department}</span>

            <span>
              {new Date(x.created_at).toLocaleDateString()}
            </span>

            <span>{x.role}</span>
            <span>{x.status}</span>

            <span>
              <button
                onClick={() =>
                  set(x.id, 'APPROVED', x.role)
                }
              >
                Approve
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ n, l, t }) {
  return (
    <div className="stat">
      <small>{l}</small>
      <strong>{n}</strong>
      <span>{t}</span>
    </div>
  );
}

function Dashboard({ d }) {
  let critical = d.incidents.filter(
    x => x.severity === 'Critical'
  ).length;

  let awaiting = d.incidents.filter(
    x => x.status === 'Awaiting Verification'
  ).length;

  let online = d.fleets.reduce(
    (a, x) => a + x.online,
    0
  );

  return (
    <section>
      <div className="hero">
        <div>
          <small>● LIVE URBAN INTELLIGENCE</small>

          <h1>
            City operations, <span>closed loop.</span>
          </h1>

          <p>
            Sense → understand → act → verify → learn.
          </p>
        </div>

        <div className="healthy">
          <Activity /> Network healthy
          <br />
          <small>93% sensing confidence</small>
        </div>
      </div>

      <div className="stats">
        <Stat
          n={d.incidents.length}
          l="ACTIVE INCIDENTS"
          t="verified city issues"
        />

        <Stat
          n={critical}
          l="CRITICAL"
          t="priority response"
        />

        <Stat
          n={online}
          l="FLEET ONLINE"
          t="passive sensing"
        />

        <Stat
          n={awaiting}
          l="AWAITING VERIFY"
          t="repair re-check"
        />
      </div>

      <div className="grid">
        <div className="panel">
          <h3>Live incident intelligence</h3>

          <div className="fakeMap">
            {d.incidents.map((x, i) => (
              <div
                className={
                  'pin ' + x.severity.toLowerCase()
                }
                style={{
                  left: 16 + i * 19 + '%',
                  top: 25 + (i % 2) * 34 + '%'
                }}
                key={x.id}
              >
                <span>{x.type}</span>
              </div>
            ))}

            <div className="roads r1"></div>
            <div className="roads r2"></div>
            <div className="roads r3"></div>
          </div>
        </div>

        <div className="panel">
          <h3>Priority feed</h3>

          {d.incidents.slice(0, 4).map(x => (
            <div className="feed" key={x.id}>
              <i className={x.severity.toLowerCase()}></i>

              <span>
                <b>{x.type}</b>
                <small>
                  {x.area} · {x.confidence}% AI confidence
                </small>
              </span>

              <em>{x.status}</em>
            </div>
          ))}
        </div>
      </div>

      <div className="panel lifecycle">
        <h3>Closed-loop maintenance</h3>

        {[
          'AI Detected',
          'Multi-fleet Validated',
          'Department Assigned',
          'SLA Tracking',
          'Repair Evidence',
          'AI Re-verified'
        ].map((x, i) => (
          <React.Fragment key={x}>
            <div>
              <b>{i + 1}</b>
              <span>{x}</span>
            </div>

            {i < 5 && <strong>→</strong>}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

function Incidents({ rows, reload }) {
  async function status(id, s) {
    let { error } = await supabase
      .from('incidents')
      .update({
        status: s,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      alert(error.message);
    } else {
      reload();
    }
  }

  return (
    <section>
      <Title
        k="INTELLIGENCE CENTER"
        h="Verified incidents"
        p="Every issue carries evidence, confidence, ownership and lifecycle status."
      />

      <div className="panel table">
        <div className="tr head">
          <span>ID / Issue</span>
          <span>Location</span>
          <span>Priority</span>
          <span>Owner</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {rows.map(x => (
          <div className="tr" key={x.id}>
            <span>
              <b>{x.type}</b>
              <small>
                {x.id} · {x.confidence}% confidence
              </small>
            </span>

            <span>{x.area}</span>

            <span>
              <em
                className={
                  'sev ' + x.severity.toLowerCase()
                }
              >
                {x.severity}
              </em>
            </span>

            <span>{x.department}</span>
            <span>{x.status}</span>

            <span>
              <select
                value={x.status}
                onChange={e =>
                  status(x.id, e.target.value)
                }
              >
                <option>Detected</option>
                <option>Assigned</option>
                <option>Repairing</option>
                <option>Awaiting Verification</option>
                <option>Resolved</option>
              </select>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Orders({ d, reload }) {
  const [id, setId] = useState(
    d.incidents[0]?.id || ''
  );

  async function add() {
    let { error } = await supabase
      .from('work_orders')
      .insert({
        incident_id: id,
        department: d.incidents.find(
          x => x.id === id
        )?.department,
        assignee: 'Demo Field Team',
        status: 'Assigned',
        note: 'Created from CityPulse dashboard'
      });

    if (error) {
      alert(error.message);
    } else {
      reload();
    }
  }

  async function verify(id, result) {
    let status =
      result === 'resolved'
        ? 'Resolved'
        : 'Assigned';

    let { error } = await supabase
      .from('verifications')
      .insert({
        incident_id: id,
        result
      });

    if (!error) {
      await supabase
        .from('incidents')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      await supabase
        .from('audit_log')
        .insert({
          incident_id: id,
          action: 'AI_REVERIFICATION',
          details: { result }
        });
    }

    if (error) {
      alert(error.message);
    } else {
      reload();
    }
  }

  return (
    <section>
      <Title
        k="CIVIC ACTION"
        h="Work orders & repair verification"
        p="A repair is not considered closed until it is re-observed."
      />

      <div className="create panel">
        <select
          value={id}
          onChange={e => setId(e.target.value)}
        >
          {d.incidents.map(x => (
            <option key={x.id} value={x.id}>
              {x.id} — {x.type}
            </option>
          ))}
        </select>

        <button onClick={add}>
          <Plus /> Create work order
        </button>
      </div>

      <div className="cards">
        {d.workOrders.map(w => {
          let i = d.incidents.find(
            x => x.id === w.incidentId
          );

          return (
            <div className="card" key={w.id}>
              <small>{w.id}</small>

              <h3>
                {w.incidentId} · {i?.type}
              </h3>

              <p>
                {w.department} → {w.assignee}
              </p>

              <b>{w.status}</b>

              {i?.status === 'Awaiting Verification' && (
                <div className="verify">
                  <button
                    onClick={() =>
                      verify(i.id, 'resolved')
                    }
                  >
                    <CheckCircle2 /> Defect absent
                  </button>

                  <button
                    onClick={() =>
                      verify(i.id, 'reopen')
                    }
                  >
                    <AlertOctagon /> Still present
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SLA({ rows }) {
  function left(x) {
    let end =
      new Date(x.createdAt).getTime() +
      x.slaHours * 3600000;

    let ms = end - Date.now();

    if (x.status === 'Resolved') {
      return 'Closed';
    }

    let h = Math.floor(
      Math.abs(ms) / 3600000
    );

    return ms < 0
      ? `${h}h overdue`
      : `${h}h remaining`;
  }

  return (
    <section>
      <Title
        k="ACCOUNTABILITY ENGINE"
        h="SLA & escalations"
        p="Configurable response deadlines keep unresolved issues visible."
      />

      <div className="cards">
        {rows.map(x => {
          let l = left(x);
          let bad = l.includes('overdue');

          return (
            <div
              className={
                'card sla ' +
                (bad ? 'breach' : '')
              }
              key={x.id}
            >
              <small>
                {x.id} · {x.severity}
              </small>

              <h3>{x.type}</h3>

              <p>
                {x.area} · {x.department}
              </p>

              <strong>{l}</strong>

              <span>
                {bad
                  ? 'ESCALATION REQUIRED'
                  : 'Within response window'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Coverage({ d }) {
  return (
    <section>
      <Title
        k="ROUTE-GAP INTELLIGENCE"
        h="Coverage confidence"
        p="Fleet duty is never changed; CityPulse measures what was naturally observed and exposes gaps."
      />

      <div className="coverage">
        {d.coverage.map(x => (
          <div
            className="cov panel"
            key={x.area}
          >
            <div>
              <b>{x.area}</b>

              <em
                className={x.state.toLowerCase()}
              >
                {x.state}
              </em>
            </div>

            <div className="bar">
              <i
                style={{
                  width: x.fresh + '%'
                }}
              ></i>
            </div>

            <span>
              {x.fresh}% recent healthy observation
              confidence
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Fleet({ d }) {
  return (
    <section>
      <Title
        k="PASSIVE MULTI-FLEET NETWORK"
        h="Fleet & sensor health"
        p="Every fleet keeps its original operational duty; sensing runs as a secondary layer."
      />

      <div className="cards">
        {d.fleets.map(x => (
          <div
            className="card fleet"
            key={x.id}
          >
            <Truck />

            <small>{x.id}</small>

            <h3>{x.name}</h3>

            <p>
              <b>Primary duty:</b> {x.duty}
            </p>

            <p>
              <b>Natural coverage:</b>{' '}
              {x.coverage}
            </p>

            <strong>
              {x.online}/{x.total}
            </strong>

            <span>
              online · {x.health}% sensor health
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Recurring({ rows }) {
  let r = rows.filter(x => x.recurring);

  return (
    <section>
      <Title
        k="LEARNING LAYER"
        h="Recurring defect intelligence"
        p="Repeated failures at the same road segment are linked instead of treated as unrelated complaints."
      />

      <div className="cards">
        {r.map(x => (
          <div
            className="card recur"
            key={x.id}
          >
            <RefreshCcw />

            <small>ROOT-CAUSE FLAG</small>

            <h3>{x.area}</h3>

            <strong>
              {x.occurrences} occurrences
            </strong>

            <p>
              {x.type} has returned after previous
              repair cycles.
            </p>

            <span>
              Recommended: engineering/root-cause
              inspection
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Title({ k, h, p }) {
  return (
    <div className="title">
      <small>{k}</small>
      <h1>{h}</h1>
      <p>{p}</p>
    </div>
  );
}

createRoot(
  document.getElementById('root')
).render(<App />);
