import { Head, router, usePage } from '@inertiajs/react';
import {
    Clock, Users, MapPin, CalendarDays, Phone, Trash2, Bell, BellOff,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Lista de Espera', href: '/waitlists' },
];

type WaitlistEntry = {
    id: string;
    scheduled_date: string;
    start_time: string;
    party_size: number;
    position: number;
    notified_at: string | null;
    user: { name: string; phone: string } | null;
    item: { name: string } | null;
};

type Props = {
    waitlists: WaitlistEntry[];
};

export default function WaitlistIndex({ waitlists }: Props) {
    const { flash } = usePage<{ flash: { success?: string } }>().props;

    const handleDelete = (id: string) => {
        if (confirm('¿Eliminar esta entrada de la lista de espera?')) {
            router.delete(`/waitlists/${id}`, { preserveScroll: true });
        }
    };

    const totalGuests = waitlists.reduce((sum, w) => sum + w.party_size, 0);
    const notified = waitlists.filter(w => w.notified_at).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Lista de Espera" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {flash?.success && (
                    <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {/* Page Header */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Lista de Espera</h1>
                        <p className="text-sm text-muted-foreground">
                            Clientes esperando disponibilidad cuando el local está lleno.
                        </p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                    {[
                        { label: 'En espera', value: waitlists.length, icon: Clock, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' },
                        { label: 'Personas esperando', value: totalGuests, icon: Users, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
                        { label: 'Notificados', value: notified, icon: Bell, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' },
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

                {/* Table */}
                <div className="rounded-lg border bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <h2 className="text-base font-semibold">Cola de Espera</h2>
                        <Badge variant="secondary">{waitlists.length} entradas</Badge>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-muted/50">
                                <TableHead className="font-semibold text-muted-foreground pl-6 w-[60px]">
                                    #
                                </TableHead>
                                <TableHead className="font-semibold text-muted-foreground">
                                    <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Cliente</div>
                                </TableHead>
                                <TableHead className="font-semibold text-muted-foreground">
                                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Espacio</div>
                                </TableHead>
                                <TableHead className="font-semibold text-muted-foreground">
                                    <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Fecha</div>
                                </TableHead>
                                <TableHead className="font-semibold text-muted-foreground text-center">
                                    Personas
                                </TableHead>
                                <TableHead className="font-semibold text-muted-foreground text-center">
                                    Notificado
                                </TableHead>
                                <TableHead className="text-right font-semibold text-muted-foreground pr-6">
                                    Acción
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {waitlists.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <Clock className="h-12 w-12 mb-4 opacity-30" />
                                            <p className="text-lg font-medium text-foreground">
                                                Sin lista de espera
                                            </p>
                                            <p className="text-sm mt-1">
                                                Cuando el restaurante esté lleno, los clientes pueden unirse a la lista de espera desde la app.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                waitlists.map((w) => (
                                    <TableRow key={w.id} className="hover:bg-muted/30 group">
                                        <TableCell className="pl-6 font-mono text-sm font-semibold text-muted-foreground">
                                            {w.position}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-sm">{w.user?.name ?? '—'}</div>
                                            {w.user?.phone && (
                                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    <Phone className="h-3 w-3" />
                                                    {w.user.phone}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">{w.item?.name ?? '—'}</TableCell>
                                        <TableCell>
                                            <div className="whitespace-nowrap text-sm">{w.scheduled_date}</div>
                                            <div className="text-xs text-muted-foreground">{w.start_time}</div>
                                        </TableCell>
                                        <TableCell className="text-center text-sm">{w.party_size}</TableCell>
                                        <TableCell className="text-center">
                                            {w.notified_at ? (
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 gap-1">
                                                                <Bell className="h-3 w-3" /> Sí
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{w.notified_at}</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground gap-1">
                                                    <BellOff className="h-3 w-3" /> No
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                                                            onClick={() => handleDelete(w.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Eliminar</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
