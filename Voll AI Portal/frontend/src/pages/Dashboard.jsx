import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutTemplate, Headset, Settings, FileText,
  PenTool, Code2, CheckCircle2, Layers,
  MessageSquare, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

/* ── Period options ─────────────────────────────────────────── */
const PERIODS = [
  { label: '7 dias', days: 7 },
  { label: '14 dias', days: 14 },
  { label: '30 dias', days: 30 },
];

/* ── Custom tooltip ─────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const { date, total } = payload[0]?.payload ?? {};
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__date">{label} · {date}</p>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__label">Ações realizadas</span>
        <span className="chart-tooltip__value">{total}</span>
      </div>
    </div>
  );
};

/* ── Skeleton components ────────────────────────────────────── */
const StatSkeleton = () => (
  <div className="sk-stat-card">
    <div className="sk sk-icon" />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="sk sk-h-xs sk-w-55" />
      <div className="sk sk-h-lg sk-w-30" />
    </div>
  </div>
);

const FeatureSkeleton = () => (
  <div className="sk-feature-card">
    <div className="sk sk-icon" style={{ borderRadius: 'var(--radius-md)' }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="sk sk-h-md sk-w-75" />
      <div className="sk sk-h-sm sk-w-full" />
      <div className="sk sk-h-sm sk-w-65" />
    </div>
    <div className="sk sk-h-xs sk-w-20" style={{ marginTop: 4 }} />
  </div>
);

const ChartSkeleton = () => (
  <div className="usage-card">
    <div className="usage-card__header">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="sk sk-h-md" style={{ width: 200 }} />
        <div className="sk sk-h-xs" style={{ width: 140 }} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[60, 60, 60].map((w, i) => (
          <div key={i} className="sk sk-h-md" style={{ width: w, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    </div>
    <div className="usage-card__body">
      <div className="sk sk-chart" />
    </div>
  </div>
);

/* ── Dashboard ──────────────────────────────────────────────── */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDays, setActiveDays] = useState(7);
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState({ atendimentosHoje: 0, fluxosAtivos: 0, respostasEnviadas: 0 });

  const fetchData = useCallback(async (days) => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, chartRes] = await Promise.all([
        fetch(`http://localhost:3001/api/dashboard/metrics?userId=${user.id}`),
        fetch(`http://localhost:3001/api/dashboard/chart?userId=${user.id}&days=${days}`)
      ]);

      if (!metricsRes.ok || !chartRes.ok) throw new Error('Falha ao carregar dados');

      const metricsData = await metricsRes.json();
      const rawChartData = await chartRes.json();

      setMetrics(metricsData);

      const mappedChartData = rawChartData.map(item => ({
        label: item.date.substring(0, 5), // DD/MM
        date: item.date,
        total: item.total
      }));
      setChartData(mappedChartData);

    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os dados. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData(activeDays);
  }, [fetchData, activeDays]);

  const handlePeriod = useCallback((days) => {
    if (days === activeDays) return;
    setActiveDays(days);
  }, [activeDays]);

  const stats = [
    { label: 'Atendimentos Otimizados', value: metrics.atendimentosHoje, icon: <CheckCircle2 size={22} />, variant: 'primary' },
    { label: 'Fluxos Ativos', value: metrics.fluxosAtivos, icon: <Layers size={22} />, variant: 'secondary' },
    { label: 'Respostas Enviadas', value: metrics.respostasEnviadas, icon: <MessageSquare size={22} />, variant: 'primary' },
  ];

  const features = [
    { title: 'Modelos de Fluxo de Atendimento', desc: 'Estruture fluxos de suporte padronizados para garantir consistência no atendimento.', icon: <LayoutTemplate size={22} />, path: '/chatbots' },
    { title: 'Assistente de Redação Voll', desc: 'Crie respostas otimizadas e alinhadas ao tom de voz da marca em segundos.', icon: <Headset size={22} />, path: '/responses' },
    { title: 'Modelos de Automação Interna', desc: 'Configure lógicas de triagem e processos internos de forma estruturada.', icon: <Settings size={22} />, path: '/automations' },
    { title: 'Base de Conhecimento e APIs', desc: 'Documente integrações e endpoints para agilizar a resolução de chamados.', icon: <FileText size={22} />, path: '/docs' },
    { title: 'Revisão e Qualidade de Texto', desc: 'Refine comunicações para garantir clareza e profissionalismo.', icon: <PenTool size={22} />, path: '/refine' },
    { title: 'Padrões de Resposta (Prompts)', desc: 'Gerencie o banco de comandos corporativos para uso padronizado na Voll.', icon: <Code2 size={22} />, path: '/prompts' },
  ].filter(f => !user?.allowed_screens || user.allowed_screens.includes(f.path));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Olá, Admin! 👋</h1>
        <p>Portal de Atendimento Voll — Selecione uma ferramenta para começar.</p>
      </div>

      {error && (
        <div style={{ color: 'var(--voll-red)', backgroundColor: 'rgba(224,8,46,0.1)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div className="stats-grid">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
          : stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className={`stat-icon ${s.variant}`}>{s.icon}</div>
              <div className="stat-info">
                <h3>{s.label}</h3>
                <p>{s.value}</p>
              </div>
            </div>
          ))}
      </div>

      <div className="usage-section">
        {loading ? (
          <ChartSkeleton />
        ) : (
          <div className="usage-card">
            <div className="usage-card__header">
              <div className="usage-card__heading">
                <h3>Visão Geral de Uso</h3>
                <p>Total de ações realizadas pelos colaboradores na plataforma.</p>
              </div>

              <div className="usage-filter">
                {PERIODS.map(({ label, days }) => (
                  <button
                    key={days}
                    className={`usage-filter__btn${activeDays === days ? ' usage-filter__btn--active' : ''}`}
                    onClick={() => handlePeriod(days)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="usage-card__body">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 6, right: 4, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--voll-red)" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="var(--voll-red)" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}
                    axisLine={false}
                    tickLine={false}
                    interval={activeDays > 14 ? 4 : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={38}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Ações realizadas"
                    stroke="var(--voll-red)"
                    strokeWidth={2}
                    fill="url(#areaGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: 'var(--voll-red)', strokeWidth: 2, stroke: 'var(--bg-surface)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="features-grid">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <FeatureSkeleton key={i} />)
          : features.map((f, i) => (
            <div
              key={i}
              className="feature-card"
              onClick={() => navigate(f.path)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(f.path)}
            >
              <div className="feature-icon">{f.icon}</div>
              <div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
              <div className="feature-card-arrow">
                <ArrowRight size={16} />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Dashboard;
