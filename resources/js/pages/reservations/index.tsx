import { Head, Link, router, usePage } from '@inertiajs/react';
import { useCallback, useState } from 'react';
import { Calendar, Search, MapPin, Users, Banknote, Activity, Settings2, User, Hash, CalendarX } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem, PaginatedData, Reservation } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Reservaciones', href: '/reservations' },
];

type Props = {
    reservations: PaginatedData<Pick<Reservation, 'id' | 'confirmation_code' | 'status' | 'scheduled_date' | 'start_time' | 'party_size' | 'total_amount' | 'user' | 'item' | 'source'>>;
    filters: {
        status?: string;
        date?: string;
    };
    banners?: { id: string; name: string; url: string }[];
};

function formatBs(centavos: number) {
    return `Bs ${(centavos / 100).toFixed(2)}`;
}

function StatusBadge({ status }: { status: string }) {
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

export default function ReservationsIndex({ reservations, filters, banners = [] }: Props) {
    const { flash } = usePage().props;
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [dateFilter, setDateFilter] = useState(filters.date || '');

    const applyFilters = useCallback((status: string, date: string) => {
        router.get(
            '/reservations',
            {
                status: status !== 'all' ? status : undefined,
                date: date || undefined
            },
            { preserveState: true }
        );
    }, []);

    const handleAction = (id: number, action: string) => {
        if (confirm(`¿Estás seguro de marcar esta reserva como ${action}?`)) {
            router.patch(`/reservations/${id}/${action}`, {}, { preserveScroll: true });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reservaciones" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {flash.success && (
                    <Alert>
                        <AlertDescription className="text-green-700">{flash.success}</AlertDescription>
                    </Alert>
                )}

                {banners && banners.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {banners.map(banner => (
                            <div key={banner.id} className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow">
                                <img src={banner.url} alt={banner.name} className="h-32 w-full object-cover" />
                                <div className="p-3 bg-muted/30">
                                    <p className="text-sm font-medium">{banner.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Card>
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle>Gestión de Reservas</CardTitle>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Select
                                    value={statusFilter}
                                    onValueChange={(val) => {
                                        setStatusFilter(val);
                                        applyFilters(val, dateFilter);
                                    }}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Estado..." />
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
                            </div>

                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => {
                                        setDateFilter(e.target.value);
                                        applyFilters(statusFilter, e.target.value);
                                    }}
                                    className="w-[180px]"
                                />
                                {dateFilter && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setDateFilter('');
                                            applyFilters(statusFilter, '');
                                        }}
                                    >
                                        Limpiar
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-muted/50">
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Hash className="w-4 h-4" /> Código</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><User className="w-4 h-4" /> Cliente</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Espacio</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Fecha y Hora</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Users className="w-4 h-4" /> Pers.</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Banknote className="w-4 h-4" /> Total</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Estado</div></TableHead>
                                    <TableHead className="text-right font-semibold text-muted-foreground"><div className="flex items-center justify-end gap-2"><Settings2 className="w-4 h-4" /> Acciones</div></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reservations.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <CalendarX className="h-12 w-12 mb-4 text-muted/40" />
                                                <p className="text-lg font-medium text-foreground">No se encontraron reservas</p>
                                                <p className="text-sm">Prueba ajustando los filtros de búsqueda.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reservations.data.map((r: any) => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-mono text-xs font-semibold">{r.confirmation_code}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{r.user?.name ?? '—'}</div>
                                                <div className="text-xs text-muted-foreground">{r.user?.phone}</div>
                                                {r.source === 'walk_in' && <Badge variant="outline" className="mt-1 text-[10px]">Walk-in</Badge>}
                                            </TableCell>
                                            <TableCell>{r.item?.name ?? '—'}</TableCell>
                                            <TableCell>
                                                <div className="whitespace-nowrap">{r.scheduled_date}</div>
                                                <div className="text-muted-foreground">{r.start_time}</div>
                                            </TableCell>
                                            <TableCell>{r.party_size}</TableCell>
                                            <TableCell className="whitespace-nowrap font-medium">{formatBs(r.total_amount)}</TableCell>
                                            <TableCell><StatusBadge status={r.status} /></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {r.status === 'pending' && (
                                                        <>
                                                            <Button size="sm" onClick={() => handleAction(r.id, 'confirm')} className="bg-blue-600 hover:bg-blue-700">
                                                                Confirmar
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => handleAction(r.id, 'cancel')}>
                                                                Cancelar
                                                            </Button>
                                                        </>
                                                    )}
                                                    {r.status === 'confirmed' && (
                                                        <>
                                                            <Button size="sm" onClick={() => handleAction(r.id, 'complete')} className="bg-green-600 hover:bg-green-700">
                                                                Completar
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => handleAction(r.id, 'no-show')}>
                                                                No-show
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {reservations.last_page > 1 && (
                            <div className="flex items-center justify-between px-4 py-4 border-t">
                                <div className="text-sm text-muted-foreground">
                                    Mostrando de {reservations.from} a {reservations.to} de {reservations.total} resultados
                                </div>
                                <div className="flex gap-1">
                                    {reservations.links.map((link: any, i: number) => (
                                        <Button
                                            key={i}
                                            variant={link.active ? "default" : "outline"}
                                            size="sm"
                                            disabled={!link.url}
                                            onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true, preserveState: true })}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
