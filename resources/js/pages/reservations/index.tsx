import { Head, router, usePage } from '@inertiajs/react';
import {
    Calendar, Search, MapPin, Users, Banknote, Activity,
    Settings2, User, Hash, CalendarX, Clock, CheckCircle2,
    TrendingUp, X, Plus, ChefHat, Minus, Phone, ClipboardList,
    AlertCircle,
    XCircle,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, PaginatedData, Reservation } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Reservaciones', href: '/reservations' },
];

type Stats = {
    today: number;
    pending: number;
    confirmed: number;
    total_today: number;
};

type ReservableItem = {
    id: string;
    name: string;
    capacity: number;
    duration_minutes: number;
    base_price: number;
};

type MenuItem = {
    id: string;
    name: string;
    base_price: number;
};

type Client = {
    id: string;
    name: string;
    phone: string;
};

type Props = {
    reservations: PaginatedData<Pick<Reservation, 'id' | 'confirmation_code' | 'status' | 'scheduled_date' | 'start_time' | 'party_size' | 'total_amount' | 'user' | 'item' | 'source'>>;
    filters: { status?: string; date?: string; search?: string };
    stats: Stats;
    reservable_items: ReservableItem[];
    menu_items: MenuItem[];
    clients: Client[];
};

type OrderLine = { item_id: string; quantity: number; notes: string };

function formatBs(centavos: number) {
    return `Bs ${(centavos / 100).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; className: string }> = {
        pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
        confirmed: { label: 'Confirmada', className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
        completed: { label: 'Completada', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
        no_show: { label: 'No se presentó', className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
        cancelled: { label: 'Cancelada', className: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' },
    };
    const cfg = map[status] ?? { label: status, className: 'bg-zinc-100 text-zinc-600' };
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
            {cfg.label}
        </span>
    );
}

const SOURCE_LABELS: Record<string, string> = {
    app: 'App', web: 'Web', walk_in: 'Walk-in', phone: 'Teléfono',
};

// ── Create Reservation Dialog ─────────────────────────────────────────────────
function CreateReservationDialog({
    open,
    onClose,
    reservableItems,
    menuItems,
    clients,
}: {
    open: boolean;
    onClose: () => void;
    reservableItems: ReservableItem[];
    menuItems: MenuItem[];
    clients: Client[];
}) {
    const { errors: pageErrors } = usePage<{ errors: Record<string, string> }>().props;

    const [processing, setProcessing] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [showClientList, setShowClientList] = useState(false);
    const [form, setForm] = useState({
        user_id: '',
        item_id: '',
        scheduled_date: '',
        start_time: '',
        party_size: '2',
        notes: '',
    });
    const [orderLines, setOrderLines] = useState<OrderLine[]>([]);

    const selectedItem = reservableItems.find(i => i.id === form.item_id);
    const selectedClient = clients.find(c => c.id === form.user_id);

    const filteredClients = useMemo(() => {
        if (!clientSearch) return clients;
        const q = clientSearch.toLowerCase();
        return clients.filter(c =>
            c.name.toLowerCase().includes(q) || c.phone.includes(q)
        );
    }, [clients, clientSearch]);

    // Total calculation
    const reservationBase = selectedItem ? selectedItem.base_price : 0;
    const menuTotal = orderLines.reduce((acc, line) => {
        const mi = menuItems.find(m => m.id === line.item_id);
        return acc + (mi ? mi.base_price * line.quantity : 0);
    }, 0);
    const grandTotal = reservationBase + menuTotal;

    function addMenuLine() {
        if (menuItems.length === 0) return;
        setOrderLines(prev => [...prev, { item_id: menuItems[0].id, quantity: 1, notes: '' }]);
    }

    function removeMenuLine(idx: number) {
        setOrderLines(prev => prev.filter((_, i) => i !== idx));
    }

    function updateLine(idx: number, key: keyof OrderLine, value: string | number) {
        setOrderLines(prev => prev.map((line, i) => i === idx ? { ...line, [key]: value } : line));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setProcessing(true);
        router.post('/reservations', {
            ...form,
            party_size: parseInt(form.party_size),
            items: orderLines.map(l => ({ item_id: l.item_id, quantity: l.quantity, notes: l.notes || undefined })),
        }, {
            onSuccess: () => { onClose(); setProcessing(false); resetForm(); },
            onError: () => setProcessing(false),
            preserveScroll: true,
        });
    }

    function resetForm() {
        setForm({ user_id: '', item_id: '', scheduled_date: '', start_time: '', party_size: '2', notes: '' });
        setOrderLines([]);
        setClientSearch('');
    }

    // Detect if there's a form-level error
    const formError = pageErrors?.form;

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm(); } }}>
            <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                                <ClipboardList className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <DialogTitle>Nueva Reserva Manual</DialogTitle>
                                <DialogDescription>
                                    Crea una reserva en nombre de un cliente (walk-in, teléfono, presencial).
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {formError && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{formError}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid gap-5 py-2">

                        {/* ── 1. Cliente ─────────────────────────────────── */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" /> 1. Cliente
                            </p>
                            {selectedClient ? (
                                <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
                                    <div>
                                        <p className="font-medium text-sm">{selectedClient.name}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> {selectedClient.phone}
                                        </p>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => { setForm(p => ({ ...p, user_id: '' })); setClientSearch(''); }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        className="pl-9"
                                        placeholder="Busca cliente por nombre o teléfono..."
                                        value={clientSearch}
                                        onChange={e => { setClientSearch(e.target.value); setShowClientList(true); }}
                                        onFocus={() => setShowClientList(true)}
                                    />
                                    {showClientList && clientSearch && (
                                        <div className="absolute z-20 mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-48 overflow-y-auto">
                                            {filteredClients.length === 0 ? (
                                                <p className="px-4 py-3 text-sm text-muted-foreground">No se encontraron clientes.</p>
                                            ) : filteredClients.map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors flex items-center justify-between"
                                                    onClick={() => {
                                                        setForm(p => ({ ...p, user_id: c.id }));
                                                        setShowClientList(false);
                                                        setClientSearch('');
                                                    }}
                                                >
                                                    <span className="font-medium text-sm">{c.name}</span>
                                                    <span className="text-xs text-muted-foreground">{c.phone}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {pageErrors?.user_id && <p className="text-xs text-red-500 mt-1">{pageErrors.user_id}</p>}
                        </div>

                        <Separator />

                        {/* ── 2. Mesa / Espacio ──────────────────────────── */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" /> 2. Mesa o Espacio
                            </p>
                            <Select value={form.item_id} onValueChange={v => setForm(p => ({ ...p, item_id: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una mesa o espacio..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {reservableItems.map(item => (
                                        <SelectItem key={item.id} value={item.id}>
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium">{item.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {item.capacity} pers. · {item.duration_minutes} min · {formatBs(item.base_price)}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedItem && (
                                <div className="mt-2 flex gap-4 text-xs text-muted-foreground px-1">
                                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Máx. <strong className="text-foreground">{selectedItem.capacity}</strong> personas</span>
                                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {selectedItem.duration_minutes} min por turno</span>
                                    <span className="flex items-center gap-1 ml-auto"><Banknote className="h-3.5 w-3.5" /> {formatBs(selectedItem.base_price)}</span>
                                </div>
                            )}
                            {pageErrors?.item_id && <p className="text-xs text-red-500 mt-1">{pageErrors.item_id}</p>}
                        </div>

                        {/* ── 3. Fecha, Hora, Personas ───────────────────── */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" /> 3. Fecha, Hora y Personas
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2 grid gap-2">
                                    <Label htmlFor="res-date">Fecha <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="res-date"
                                        type="date"
                                        value={form.scheduled_date}
                                        onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="res-time">Hora <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="res-time"
                                        type="time"
                                        value={form.start_time}
                                        onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mt-3 grid gap-2">
                                <Label htmlFor="res-party">Número de personas <span className="text-red-500">*</span></Label>
                                <div className="flex items-center gap-3">
                                    <Button
                                        type="button" variant="outline" size="icon"
                                        onClick={() => setForm(p => ({ ...p, party_size: String(Math.max(1, parseInt(p.party_size) - 1)) }))}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <Input
                                        id="res-party"
                                        type="number" min="1"
                                        max={selectedItem?.capacity ?? 999}
                                        value={form.party_size}
                                        onChange={e => setForm(p => ({ ...p, party_size: e.target.value }))}
                                        className="text-center w-20"
                                        required
                                    />
                                    <Button
                                        type="button" variant="outline" size="icon"
                                        onClick={() => setForm(p => ({ ...p, party_size: String(Math.min(selectedItem?.capacity ?? 999, parseInt(p.party_size) + 1)) }))}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                    {selectedItem && (
                                        <span className="text-xs text-muted-foreground">máximo {selectedItem.capacity}</span>
                                    )}
                                </div>
                                {pageErrors?.party_size && <p className="text-xs text-red-500">{pageErrors.party_size}</p>}
                            </div>
                        </div>

                        {/* ── 4. Pre-orden de Menú (opcional) ───────────── */}
                        {menuItems.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                                            <ChefHat className="h-3.5 w-3.5" /> 4. Pre-orden de Menú
                                            <Badge variant="secondary" className="text-[10px] normal-case">Opcional</Badge>
                                        </p>
                                        <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={addMenuLine}>
                                            <Plus className="h-3 w-3" /> Agregar platillo
                                        </Button>
                                    </div>

                                    {orderLines.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-3 rounded-lg border border-dashed">
                                            Sin pre-órdenes. El cliente puede pedir en el lugar.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {orderLines.map((line, idx) => {
                                                const mi = menuItems.find(m => m.id === line.item_id);
                                                return (
                                                    <div key={idx} className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                                                        <div className="flex-1 grid gap-2">
                                                            <Select
                                                                value={line.item_id}
                                                                onValueChange={v => updateLine(idx, 'item_id', v)}
                                                            >
                                                                <SelectTrigger className="h-8 text-sm">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {menuItems.map(m => (
                                                                        <SelectItem key={m.id} value={m.id}>
                                                                            {m.name} — {formatBs(m.base_price)}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Input
                                                                placeholder="Notas (sin cebolla, extra picante...)"
                                                                value={line.notes}
                                                                onChange={e => updateLine(idx, 'notes', e.target.value)}
                                                                className="h-8 text-xs"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => updateLine(idx, 'quantity', Math.max(1, line.quantity - 1))}>
                                                                <Minus className="h-3 w-3" />
                                                            </Button>
                                                            <span className="w-7 text-center text-sm font-semibold">{line.quantity}</span>
                                                            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => updateLine(idx, 'quantity', line.quantity + 1)}>
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <p className="text-xs font-semibold mt-1">{mi ? formatBs(mi.base_price * line.quantity) : '—'}</p>
                                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 mt-1" onClick={() => removeMenuLine(idx)}>
                                                                <X className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Notes */}
                        <div className="grid gap-2">
                            <Label htmlFor="res-notes">Notas internas</Label>
                            <Textarea
                                id="res-notes"
                                value={form.notes}
                                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                placeholder="Observaciones, solicitudes especiales..."
                                rows={2}
                                maxLength={500}
                            />
                        </div>

                        {/* Total Summary */}
                        {grandTotal > 0 && (
                            <div className="rounded-lg border bg-muted/40 px-4 py-3 flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Total estimado:</span>
                                <span className="text-lg font-bold">{formatBs(grandTotal)}</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-2">
                        <Button type="button" variant="outline" onClick={() => { onClose(); resetForm(); }}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing || !form.user_id || !form.item_id} className="gap-2">
                            {processing ? 'Creando reserva...' : 'Crear Reserva'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReservationsIndex({ reservations, filters, stats, reservable_items, menu_items, clients }: Props) {
    const { flash } = usePage<{ flash: { success?: string } }>().props;
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [dateFilter, setDateFilter] = useState(filters.date || '');
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const [createOpen, setCreateOpen] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilters = useCallback((status: string, date: string, search: string) => {
        router.get(
            '/reservations',
            {
                status: status !== 'all' ? status : undefined,
                date: date || undefined,
                search: search || undefined,
            },
            { preserveState: true },
        );
    }, []);

    const handleSearchChange = (val: string) => {
        setSearchValue(val);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => applyFilters(statusFilter, dateFilter, val), 400);
    };

    const handleAction = (id: string, action: string) => {
        const labels: Record<string, string> = { confirm: 'confirmar', cancel: 'cancelar', complete: 'completar', 'no-show': 'marcar como no-show' };
        if (confirm(`¿${labels[action] ? `Deseas ${labels[action]}` : 'Ejecutar acción en'} esta reserva?`)) {
            router.patch(`/reservations/${id}/${action}`, {}, { preserveScroll: true });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reservaciones" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {flash?.success && (
                    <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {/* ── Stats + Header ──────────────────────────────────── */}
                {/* Page Header */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Reservaciones</h1>
                            <p className="text-sm text-muted-foreground">Gestiona y supervisa todas las reservas de tu negocio.</p>
                        </div>
                    </div>
                    <Button onClick={() => setCreateOpen(true)} className="mt-3 sm:mt-0 gap-2 self-start sm:self-auto">
                        <Plus className="h-4 w-4" />
                        Nueva Reserva Manual
                    </Button>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { label: 'Reservas Hoy', value: stats.today, icon: Calendar, bg: 'bg-violet-100 dark:bg-violet-900/30', color: 'text-violet-600 dark:text-violet-400' },
                        { label: 'Pendientes', value: stats.pending, icon: Clock, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' },
                        { label: 'Confirmadas', value: stats.confirmed, icon: CheckCircle2, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
                        { label: 'Ingresos Hoy', value: formatBs(stats.total_today), icon: TrendingUp, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' },
                    ].map(kpi => (
                        <Card key={kpi.label} className="border-dashed">
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${kpi.bg}`}>
                                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold leading-none tabular-nums">{kpi.value}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{kpi.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* ── Table Container ───────────────────────────────────────────── */}
                <div className="rounded-lg border bg-card overflow-hidden">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 py-4 border-b">
                        <h2 className="text-base font-semibold">Gestión de Reservas</h2>

                        <div className="flex flex-wrap gap-2 items-center">
                            {/* Search */}
                            <div className="relative flex items-center">
                                <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    className="pl-8 w-[220px] pr-8"
                                    placeholder="Código, cliente, teléfono…"
                                    value={searchValue}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                />
                                {searchValue && (
                                    <button
                                        onClick={() => { setSearchValue(''); applyFilters(statusFilter, dateFilter, ''); }}
                                        className="absolute right-2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Status filter */}
                            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); applyFilters(val, dateFilter, searchValue); }}>
                                <SelectTrigger className="w-[170px]">
                                    <SelectValue placeholder="Estado…" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los estados</SelectItem>
                                    <SelectItem value="pending">Pendiente</SelectItem>
                                    <SelectItem value="confirmed">Confirmada</SelectItem>
                                    <SelectItem value="completed">Completada</SelectItem>
                                    <SelectItem value="no_show">No se presentó</SelectItem>
                                    <SelectItem value="cancelled">Cancelada</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Date filter */}
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => { setDateFilter(e.target.value); applyFilters(statusFilter, e.target.value, searchValue); }}
                                    className="w-[165px]"
                                />
                                {dateFilter && (
                                    <Button variant="ghost" size="sm" onClick={() => { setDateFilter(''); applyFilters(statusFilter, '', searchValue); }}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-muted/50">
                                    <TableHead className="font-semibold text-muted-foreground pl-6">
                                        <div className="flex items-center gap-2"><Hash className="w-4 h-4" /> Código</div>
                                    </TableHead>
                                    <TableHead className="font-semibold text-muted-foreground">
                                        <div className="flex items-center gap-2"><User className="w-4 h-4" /> Cliente</div>
                                    </TableHead>
                                    <TableHead className="font-semibold text-muted-foreground">
                                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Mesa / Espacio</div>
                                    </TableHead>
                                    <TableHead className="font-semibold text-muted-foreground">
                                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Fecha y Hora</div>
                                    </TableHead>
                                    <TableHead className="font-semibold text-muted-foreground">
                                        <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Pers.</div>
                                    </TableHead>
                                    <TableHead className="font-semibold text-muted-foreground">
                                        <div className="flex items-center gap-2"><Banknote className="w-4 h-4" /> Total</div>
                                    </TableHead>
                                    <TableHead className="font-semibold text-muted-foreground">
                                        <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Estado</div>
                                    </TableHead>
                                    <TableHead className="text-right font-semibold text-muted-foreground pr-6">
                                        <div className="flex items-center justify-end gap-2"><Settings2 className="w-4 h-4" /> Acciones</div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reservations.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <CalendarX className="h-12 w-12 mb-4 opacity-30" />
                                                <p className="text-lg font-medium text-foreground">No se encontraron reservas</p>
                                                <p className="text-sm">Prueba ajustando los filtros de búsqueda.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reservations.data.map((r: any) => (
                                        <TableRow key={r.id} className="hover:bg-muted/30 group">
                                            <TableCell className="pl-6 font-mono text-xs font-semibold text-muted-foreground">
                                                {r.confirmation_code}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">{r.user?.name ?? '—'}</div>
                                                <div className="text-xs text-muted-foreground">{r.user?.phone}</div>
                                                {r.source && r.source !== 'app' && (
                                                    <Badge variant="outline" className="mt-1 text-[10px]">
                                                        {SOURCE_LABELS[r.source] ?? r.source}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">{r.item?.name ?? '—'}</TableCell>
                                            <TableCell>
                                                <div className="whitespace-nowrap text-sm">{r.scheduled_date}</div>
                                                <div className="text-xs text-muted-foreground">{r.start_time}</div>
                                            </TableCell>
                                            <TableCell className="text-sm">{r.party_size}</TableCell>
                                            <TableCell className="whitespace-nowrap font-medium text-sm">
                                                {formatBs(r.total_amount)}
                                            </TableCell>
                                            <TableCell><StatusBadge status={r.status} /></TableCell>
                                            <TableCell className="text-right pr-6">
                                                <TooltipProvider delayDuration={300}>
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {r.status === 'pending' && (
                                                            <>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40" onClick={() => handleAction(r.id, 'confirm')}>
                                                                            <CheckCircle2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Confirmar</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleAction(r.id, 'cancel')}>
                                                                            <XCircle className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Cancelar</TooltipContent>
                                                                </Tooltip>
                                                            </>
                                                        )}
                                                        {r.status === 'confirmed' && (
                                                            <>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" onClick={() => handleAction(r.id, 'complete')}>
                                                                            <CheckCircle2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Completar</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40" onClick={() => handleAction(r.id, 'no-show')}>
                                                                            <CalendarX className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>No-show</TooltipContent>
                                                                </Tooltip>
                                                            </>
                                                        )}
                                                    </div>
                                                </TooltipProvider>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {reservations.last_page > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t">
                                <div className="text-sm text-muted-foreground">
                                    Mostrando {reservations.from}–{reservations.to} de {reservations.total}
                                </div>
                                <div className="flex gap-1">
                                    {reservations.links.map((link: any, i: number) => (
                                        <Button
                                            key={i}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={!link.url}
                                            onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true, preserveState: true })}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CreateReservationDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                reservableItems={reservable_items}
                menuItems={menu_items}
                clients={clients}
            />
        </AppLayout>
    );
}
