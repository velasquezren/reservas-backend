import { Head, Link, usePage } from '@inertiajs/react';
import {
    CalendarCheck,
    CalendarClock,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Users,
    Banknote,
    Star,
    CalendarX,
    Clock,
    ArrowUpRight,
    Crown,
    Phone,
    CalendarDays,
    ChevronRight,
    LayoutGrid,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Pie,
    Cell,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import * as reservations from '@/routes/reservations';
import type { BreadcrumbItem, DashboardStats, Reservation, TopClient } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard() },
];

type Props = {
    stats: DashboardStats;
    recent: Pick<Reservation, 'id' | 'confirmation_code' | 'status' | 'scheduled_date' | 'start_time' | 'party_size' | 'total_amount' | 'user' | 'item'>[];
    revenue_mom: {
        current_month_total: number;
        prev_month_total: number;
    };
    peak_hours: {
        hour: number;
        reservation_count: number;
        total_guests: number;
    }[];
    status_breakdown: {
        pending: number;
        confirmed: number;
        completed: number;
        no_show: number;
        cancelled: number;
    };
    top_clients: TopClient[];
};

/** Formatea centavos → "Bs 1.234,56" */
function formatBs(centavos: number) {
    return `Bs\u00a0${(centavos / 100).toLocaleString('es-BO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/** Formatea centavos de forma compacta para ejes → "Bs 1.2k" */
function formatBsAxis(centavos: number) {
    const val = centavos / 100;
    if (val >= 1_000_000) return `Bs\u00a0${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `Bs\u00a0${(val / 1_000).toFixed(1)}k`;
    return `Bs\u00a0${val.toFixed(0)}`;
}

function getInitials(name: string | null | undefined) {
    if (typeof name !== 'string' || !name.trim()) return '??';
    return name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
}

function statusBadge(status: string) {
    const map: Record<string, { label: string; className: string }> = {
        pending: {
            label: 'Pendiente',
            className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
        },
        confirmed: {
            label: 'Confirmada',
            className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
        },
        completed: {
            label: 'Completada',
            className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        },
        no_show: {
            label: 'No Show',
            className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',
        },
        cancelled: {
            label: 'Cancelada',
            className: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
        },
    };
    const cfg = map[status] ?? { label: status, className: 'bg-zinc-500/15 text-zinc-600' };
    return (
        <Badge variant="outline" className={`text-[11px] ${cfg.className}`}>
            {cfg.label}
        </Badge>
    );
}

const STATUS_COLORS = [
    'hsl(45, 93%, 47%)',   // pending   - amber
    'hsl(217, 91%, 60%)',  // confirmed - blue
    'hsl(160, 84%, 39%)',  // completed - emerald
    'hsl(0, 84%, 60%)',    // no_show   - red
    'hsl(240, 5%, 64%)',   // cancelled - zinc
];

/* ─── Shared Tooltip shell (shadcn-style) ───────────────────────────────── */
function ChartTooltipShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-border bg-background shadow-md px-3 py-2.5 text-sm">
            {children}
        </div>
    );
}

export default function Dashboard({
    stats,
    recent,
    revenue_mom,
    peak_hours,
    status_breakdown,
    top_clients,
}: Props) {
    const { flash } = usePage().props;

    /* Revenue MoM */
    const prevRevenue = (revenue_mom?.prev_month_total || 0);
    const currRevenue = (revenue_mom?.current_month_total || 0);
    const revenueChangePct =
        prevRevenue > 0
            ? (((currRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1)
            : null;
    const revenueIsUp = currRevenue >= prevRevenue;

    /* Pie data */
    const statusPieData = status_breakdown
        ? [
            { name: 'Pendientes', value: Number(status_breakdown.pending) || 0 },
            { name: 'Confirmadas', value: Number(status_breakdown.confirmed) || 0 },
            { name: 'Completadas', value: Number(status_breakdown.completed) || 0 },
            { name: 'No Show', value: Number(status_breakdown.no_show) || 0 },
            { name: 'Canceladas', value: Number(status_breakdown.cancelled) || 0 },
        ].filter((d) => d.value > 0)
        : [];

    /* Revenue area — values stay in centavos so formatBsAxis works */
    const revenueAreaData = [
        { name: 'Inicio ant.', value: 0 },
        { name: 'Mes anterior', value: prevRevenue },
        { name: 'Transición', value: Math.round((prevRevenue + currRevenue) / 2) },
        { name: 'Mes actual', value: currRevenue },
    ];

    /* Rates */
    const totalResolved =
        (Number(status_breakdown?.completed) || 0) +
        (Number(status_breakdown?.no_show) || 0) +
        (Number(status_breakdown?.cancelled) || 0);
    const completionRate =
        totalResolved > 0
            ? Math.round(((Number(status_breakdown?.completed) || 0) / totalResolved) * 100)
            : 0;
    const noShowRate =
        totalResolved > 0
            ? Math.round(((Number(status_breakdown?.no_show) || 0) / totalResolved) * 100)
            : 0;

    const kpis = [
        {
            title: 'Reservas Hoy',
            value: stats.today_reservations,
            subtitle: `${stats.today_guests} personas esperadas`,
            icon: CalendarCheck,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-500/10',
        },
        {
            title: 'Pendientes',
            value: stats.pending,
            subtitle: 'Requieren atención',
            icon: CalendarClock,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-500/10',
        },
        {
            title: 'Confirmadas',
            value: stats.upcoming_confirmed,
            subtitle: 'Listas para servir',
            icon: CheckCircle2,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-500/10',
        },
        {
            title: 'Ingresos del Mes',
            value: formatBs(stats.revenue_month),
            subtitle: revenueChangePct
                ? `${revenueIsUp ? '+' : ''}${revenueChangePct}% vs mes anterior`
                : `${stats.total_month} reservas este mes`,
            icon: Banknote,
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-500/10',
            trend: revenueChangePct ? (revenueIsUp ? 'up' : 'down') : null,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {flash?.success && (
                    <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {/* Page Header */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                        <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
                        <p className="text-sm text-muted-foreground">
                            {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                        </p>
                    </div>
                </div>

                {/* ─── KPI Cards ──────────────────────────────────────────── */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {kpis.map((kpi) => (
                        <Card key={kpi.title} className="relative overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {kpi.title}
                                </CardTitle>
                                <div className={`rounded-lg p-2.5 ${kpi.bg}`}>
                                    <kpi.icon className={`size-4 ${kpi.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    {kpi.trend === 'up' && <TrendingUp className="size-3 text-emerald-500" />}
                                    {kpi.trend === 'down' && <TrendingDown className="size-3 text-red-500" />}
                                    {kpi.subtitle}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* ─── Charts Row ─────────────────────────────────────────── */}
                <div className="grid gap-4 lg:grid-cols-7">

                    {/* Revenue Area Chart */}
                    <Card className="lg:col-span-4">
                        <CardHeader>
                            <CardTitle className="text-base">Ingresos vs Mes Anterior</CardTitle>
                            <CardDescription>
                                Comparación de ingresos completados entre periodos
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[280px] pr-2">
                            <ResponsiveContainer width="100%" height="100%" debounce={200}>
                                <AreaChart
                                    data={revenueAreaData}
                                    margin={{ top: 10, right: 12, left: 8, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(262,83%,58%)" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="hsl(262,83%,58%)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="hsl(var(--border))"
                                    />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                        dy={4}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        width={72}
                                        tickFormatter={formatBsAxis}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        cursor={{
                                            strokeDasharray: '4 4',
                                            stroke: 'hsl(var(--muted-foreground))',
                                            strokeOpacity: 0.5,
                                        }}
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload?.length) return null;
                                            const raw = Number(payload[0]?.value ?? 0);
                                            return (
                                                <ChartTooltipShell>
                                                    <p className="mb-1.5 font-medium text-foreground">{label}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="inline-block size-2.5 shrink-0 rounded-[2px]"
                                                            style={{ backgroundColor: 'hsl(262,83%,58%)' }}
                                                        />
                                                        <span className="text-muted-foreground">Ingresos</span>
                                                        <span className="ml-auto pl-4 font-semibold tabular-nums text-foreground">
                                                            {formatBs(raw)}
                                                        </span>
                                                    </div>
                                                </ChartTooltipShell>
                                            );
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="hsl(262,83%,58%)"
                                        strokeWidth={2}
                                        fill="url(#colorRevenue)"
                                        dot={{ r: 3.5, fill: 'hsl(262,83%,58%)', strokeWidth: 0 }}
                                        activeDot={{
                                            r: 5,
                                            fill: 'hsl(262,83%,58%)',
                                            strokeWidth: 2,
                                            stroke: 'hsl(var(--background))',
                                        }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Status Breakdown */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle className="text-base">Distribución de Estados</CardTitle>
                            <CardDescription>Reservas del mes actual</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="h-[180px] w-[180px] shrink-0">
                                    <ResponsiveContainer width="100%" height="100%" debounce={200}>
                                        <PieChart>
                                            <Pie
                                                data={statusPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={75}
                                                paddingAngle={3}
                                                dataKey="value"
                                                strokeWidth={0}
                                            >
                                                {statusPieData.map((entry, index) => {
                                                    const allLabels = [
                                                        'Pendientes', 'Confirmadas', 'Completadas', 'No Show', 'Canceladas',
                                                    ];
                                                    const colorIndex = allLabels.indexOf(entry.name);
                                                    return (
                                                        <Cell
                                                            key={index}
                                                            fill={STATUS_COLORS[colorIndex >= 0 ? colorIndex : 0]}
                                                        />
                                                    );
                                                })}
                                            </Pie>
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (!active || !payload?.length) return null;
                                                    return (
                                                        <ChartTooltipShell>
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className="inline-block size-2.5 shrink-0 rounded-[2px]"
                                                                    style={{
                                                                        backgroundColor: String(
                                                                            payload[0].payload?.fill ?? '#888'
                                                                        ),
                                                                    }}
                                                                />
                                                                <span className="text-muted-foreground">{payload[0].name}</span>
                                                                <span className="ml-auto pl-4 font-semibold tabular-nums text-foreground">
                                                                    {payload[0].value}
                                                                </span>
                                                            </div>
                                                        </ChartTooltipShell>
                                                    );
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="flex flex-col gap-3 flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="size-4 text-emerald-500" />
                                            <span className="text-sm text-muted-foreground">Completadas</span>
                                        </div>
                                        <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                            {completionRate}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CalendarX className="size-4 text-red-500" />
                                            <span className="text-sm text-muted-foreground">No Show</span>
                                        </div>
                                        <span className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
                                            {noShowRate}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Star className="size-4 text-amber-500" />
                                            <span className="text-sm text-muted-foreground">Rating</span>
                                        </div>
                                        <span className="text-sm font-semibold tabular-nums">
                                            {stats.avg_rating > 0 ? `${stats.avg_rating} / 5` : '—'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="size-4 text-blue-500" />
                                            <span className="text-sm text-muted-foreground">Total Mes</span>
                                        </div>
                                        <span className="text-sm font-semibold tabular-nums">{stats.total_month}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ─── Peak Hours + Top Clients ───────────────────────────── */}
                <div className="grid gap-4 lg:grid-cols-7">

                    {/* Peak Hours Chart */}
                    <Card className="lg:col-span-4">
                        <CardHeader>
                            <CardTitle className="text-base">Horas Pico</CardTitle>
                            <CardDescription>
                                Distribución de reservas por hora (últimos 30 días)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[280px] pr-2">
                            <ResponsiveContainer width="100%" height="100%" debounce={200}>
                                <AreaChart
                                    data={peak_hours}
                                    margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorPeak" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(217,91%,60%)" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="hsl(var(--border))"
                                    />
                                    <XAxis
                                        dataKey="hour"
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `${v}:00`}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                        dy={4}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                        width={28}
                                    />
                                    <Tooltip
                                        cursor={{
                                            strokeDasharray: '4 4',
                                            stroke: 'hsl(var(--muted-foreground))',
                                            strokeOpacity: 0.5,
                                        }}
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload?.length) return null;
                                            return (
                                                <ChartTooltipShell>
                                                    <p className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground">
                                                        <Clock className="size-3.5" />
                                                        {label}:00
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="inline-block size-2.5 shrink-0 rounded-[2px]"
                                                            style={{ backgroundColor: 'hsl(217,91%,60%)' }}
                                                        />
                                                        <span className="text-muted-foreground">Reservas</span>
                                                        <span className="ml-auto pl-4 font-semibold tabular-nums text-foreground">
                                                            {payload[0]?.value}
                                                        </span>
                                                    </div>
                                                </ChartTooltipShell>
                                            );
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="reservation_count"
                                        stroke="hsl(217,91%,60%)"
                                        strokeWidth={2}
                                        fill="url(#colorPeak)"
                                        dot={{ r: 3.5, fill: 'hsl(217,91%,60%)', strokeWidth: 0 }}
                                        activeDot={{
                                            r: 5,
                                            fill: 'hsl(217,91%,60%)',
                                            strokeWidth: 2,
                                            stroke: 'hsl(var(--background))',
                                        }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Top Clients */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Crown className="size-4 text-amber-500" />
                                <CardTitle className="text-base">Top Clientes</CardTitle>
                            </div>
                            <CardDescription>
                                Clientes más frecuentes por reservas completadas
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-5">
                                {!top_clients || top_clients.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                        <Users className="size-8 mb-2 opacity-40" />
                                        <p className="text-sm">Aún no hay datos de clientes</p>
                                    </div>
                                ) : (
                                    top_clients.map((client, index) => (
                                        <div key={index} className="flex items-center gap-3">
                                            <Avatar className="size-9 border">
                                                <AvatarFallback
                                                    className={`text-xs font-semibold ${index === 0
                                                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                                        : index === 1
                                                            ? 'bg-zinc-300/30 text-zinc-700 dark:text-zinc-300'
                                                            : 'bg-muted text-muted-foreground'
                                                        }`}
                                                >
                                                    {client.user ? getInitials(client.user.name) : '??'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium leading-none truncate">
                                                    {client.user?.name ?? 'Cliente Sin Nombre'}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                    <Phone className="size-3" />
                                                    {client.user?.phone ?? '—'}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-semibold tabular-nums">
                                                    {formatBs(client.total_spent)}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {client.total_reservations} visitas
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ─── Recent Reservations ────────────────────────────────── */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Reservas Recientes</CardTitle>
                            <CardDescription className="mt-1">
                                Últimas reservas registradas en el sistema
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" asChild>
                            <Link href={reservations.index()}>
                                Ver todas <ChevronRight className="h-3 w-3" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Código</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Espacio</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Hora</TableHead>
                                    <TableHead className="text-center">Personas</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right pr-6">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recent.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <CalendarX className="h-10 w-10 mb-3 opacity-30" />
                                                <p className="text-sm font-medium text-foreground">
                                                    No hay reservas recientes
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Las nuevas reservas aparecerán aquí
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    recent.map((r) => (
                                        <TableRow key={r.id} className="group">
                                            <TableCell className="pl-6 font-mono text-xs tracking-wider text-muted-foreground">
                                                {r.confirmation_code}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar className="size-7">
                                                        <AvatarFallback className="text-[10px] bg-muted">
                                                            {r.user ? getInitials(r.user.name) : '??'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium leading-none">
                                                            {r.user?.name ?? '—'}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                                            {r.user?.phone}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{r.item?.name ?? '—'}</TableCell>
                                            <TableCell className="whitespace-nowrap text-sm">
                                                {r.scheduled_date}
                                            </TableCell>
                                            <TableCell className="text-sm">{r.start_time}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="inline-flex items-center gap-1 text-sm">
                                                    <Users className="size-3.5 text-muted-foreground" />
                                                    {r.party_size}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-sm tabular-nums">
                                                {formatBs(r.total_amount)}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                {statusBadge(r.status)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}