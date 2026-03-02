import { Head, Link, usePage } from '@inertiajs/react';
import { CalendarCheck, CalendarClock, CheckCircle2, TrendingUp, User, Hash, MapPin, CalendarDays, Users, Banknote, Activity, CalendarX, Clock } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import * as reservations from '@/routes/reservations';
import type { BreadcrumbItem, DashboardStats, Reservation } from '@/types';

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
};

function formatBs(centavos: number) {
    return `Bs ${(centavos / 100).toFixed(2)}`;
}

function statusBadge(status: string) {
    const map: Record<string, { label: string; className: string }> = {
        pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800 border-amber-200' },
        confirmed: { label: 'Confirmada', className: 'bg-blue-100 text-blue-800 border-blue-200' },
        completed: { label: 'Completada', className: 'bg-green-100 text-green-800 border-green-200' },
        no_show: { label: 'No se presentó', className: 'bg-red-100 text-red-800 border-red-200' },
        cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    };
    const cfg = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
    return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}

export default function Dashboard({ stats, recent, revenue_mom, peak_hours, status_breakdown }: Props) {
    const { flash } = usePage().props;

    const kpis = [
        {
            title: 'Reservas hoy',
            value: stats.today_reservations,
            icon: CalendarCheck,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            title: 'Pendientes',
            value: stats.pending,
            icon: CalendarClock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
        {
            title: 'Confirmadas próximas',
            value: stats.upcoming_confirmed,
            icon: CheckCircle2,
            color: 'text-green-600',
            bg: 'bg-green-50',
        },
        {
            title: 'Ingresos del mes',
            value: formatBs(stats.revenue_month),
            icon: TrendingUp,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {flash.success && (
                    <Alert>
                        <AlertDescription className="text-green-700">{flash.success}</AlertDescription>
                    </Alert>
                )}

                {/* KPI Cards */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {kpis.map((kpi) => (
                        <Card key={kpi.title}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {kpi.title}
                                </CardTitle>
                                <div className={`rounded-lg p-2 ${kpi.bg}`}>
                                    <kpi.icon className={`size-4 ${kpi.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{kpi.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Charts Area */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ingresos vs Mes Anterior</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={[
                                        { name: 'Mes Anterior', value: (revenue_mom?.prev_month_total || 0) / 100 },
                                        { name: 'Mes Actual', value: (revenue_mom?.current_month_total || 0) / 100 },
                                    ]}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value) => `Bs ${value}`}
                                        className="text-xs text-muted-foreground"
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="rounded-lg border border-border bg-background shadow-md p-3 z-50">
                                                        <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-3 w-3 rounded-full bg-indigo-500" />
                                                            <span className="text-sm text-muted-foreground">Ingresos:</span>
                                                            <span className="text-sm font-medium text-foreground">Bs {Number(payload[0].value || 0).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="value" fill="url(#colorRevenue)" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Horas Pico de Reserva (Últimos 30 días)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={peak_hours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPeak" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="hour"
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val) => `${val}:00`}
                                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                        className="text-xs text-muted-foreground"
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} className="text-xs text-muted-foreground" />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="rounded-lg border border-border bg-background shadow-md p-3 z-50">
                                                        <p className="text-sm font-semibold text-foreground mb-2">Hora: {label}:00</p>
                                                        {payload.map((entry: any, index: number) => (
                                                            <div key={index} className="flex items-center gap-2">
                                                                <div className="h-3 w-3 rounded-full bg-blue-500" />
                                                                <span className="text-sm text-muted-foreground">{entry.name === 'reservation_count' ? 'Reservas' : 'Invitados'}:</span>
                                                                <span className="text-sm font-medium text-foreground">{entry.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="reservation_count" fill="url(#colorPeak)" name="reservation_count" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Status Breakdown & Conversion */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Ratio Completadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">
                                {status_breakdown?.completed > 0
                                    ? Math.round((status_breakdown.completed / (status_breakdown.completed + status_breakdown.no_show + status_breakdown.cancelled)) * 100)
                                    : 0}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de No-Show</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-red-600">
                                {status_breakdown?.no_show > 0
                                    ? Math.round((status_breakdown.no_show / (status_breakdown.completed + status_breakdown.no_show + status_breakdown.cancelled)) * 100)
                                    : 0}%
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Reservations */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Reservas recientes</CardTitle>
                        <Link
                            href={reservations.index()}
                            className="text-sm text-primary hover:underline"
                        >
                            Ver todas →
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-muted/50">
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Hash className="w-4 h-4" /> Código</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><User className="w-4 h-4" /> Cliente</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Espacio</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Fecha</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Hora</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Users className="w-4 h-4" /> Pers.</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Banknote className="w-4 h-4" /> Total</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Estado</div></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recent.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <CalendarX className="h-10 w-10 mb-3 text-muted/40" />
                                                <p className="text-base font-medium text-foreground">No hay reservas recientes</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    recent.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-mono text-xs">{r.confirmation_code}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{r.user?.name ?? '—'}</div>
                                                <div className="text-xs text-muted-foreground">{r.user?.phone}</div>
                                            </TableCell>
                                            <TableCell>{r.item?.name ?? '—'}</TableCell>
                                            <TableCell className="whitespace-nowrap">{r.scheduled_date}</TableCell>
                                            <TableCell>{r.start_time}</TableCell>
                                            <TableCell>{r.party_size}</TableCell>
                                            <TableCell className="whitespace-nowrap">{formatBs(r.total_amount)}</TableCell>
                                            <TableCell>{statusBadge(r.status)}</TableCell>
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
