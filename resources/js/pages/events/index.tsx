import { Head, useForm, usePage, router } from '@inertiajs/react';
import {
    CalendarDays, Pencil, Plus, Trash2, Eye, Zap, CalendarCheck2, Image, PartyPopper,
} from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Eventos', href: '/events' },
];

type Event = {
    id: string;
    business_id: string;
    name: string;
    description?: string | null;
    starts_at: string;
    ends_at?: string | null;
    is_active: boolean;
    banner_url?: string | null;
};

type Stats = {
    total: number;
    active: number;
    upcoming: number;
    with_banner: number;
};

type Props = {
    events: Event[];
    stats: Stats;
    banners: { id: string; name: string; url: string }[];
};

function isExpired(event: Event) {
    return !!event.ends_at && event.ends_at < new Date().toISOString().split('T')[0];
}

function isUpcoming(event: Event) {
    return event.is_active && event.starts_at > new Date().toISOString().split('T')[0];
}

export default function EventsIndex({ events, stats, banners }: Props) {
    const { flash } = usePage().props;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [bannerViewer, setBannerViewer] = useState<string | null>(null);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    const { data, setData, processing, errors, reset, clearErrors } = useForm({
        name: '',
        description: '',
        starts_at: new Date().toISOString().split('T')[0],
        ends_at: '',
        is_active: true,
        banner_path: null as File | null,
    });

    const openCreateDialog = () => {
        setEditingEvent(null);
        reset();
        clearErrors();
        setIsDialogOpen(true);
    };

    const openEditDialog = (event: Event) => {
        setEditingEvent(event);
        setData({
            name: event.name,
            description: event.description || '',
            starts_at: event.starts_at ? event.starts_at.split('T')[0] : new Date().toISOString().split('T')[0],
            ends_at: event.ends_at ? event.ends_at.split('T')[0] : '',
            is_active: event.is_active,
            banner_path: null,
        });
        clearErrors();
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingEvent) {
            router.post(`/events/${editingEvent.id}`, { _method: 'put', ...data }, {
                forceFormData: true,
                onSuccess: () => setIsDialogOpen(false),
            });
        } else {
            router.post('/events', data, {
                forceFormData: true,
                onSuccess: () => setIsDialogOpen(false),
            });
        }
    };

    const handleDelete = (event: Event) => {
        if (confirm(`Â¿EstÃ¡s seguro de eliminar el evento "${event.name}"?`)) {
            router.delete(`/events/${event.id}`);
        }
    };

    const today = new Date().toISOString().split('T')[0];
    const filtered = {
        all: events,
        active: events.filter(e => e.is_active && (!e.ends_at || e.ends_at >= today)),
        upcoming: events.filter(e => e.is_active && e.starts_at > today),
        expired: events.filter(e => !!e.ends_at && e.ends_at < today),
    };

    const renderTable = (items: Event[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nombre / Detalle</TableHead>
                    <TableHead className="text-center">Vigencia</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4}>
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed mb-3">
                                    <CalendarDays className="h-5 w-5 text-muted-foreground/60" />
                                </div>
                                <p className="text-sm font-medium text-foreground">Sin eventos</p>
                                <p className="text-xs text-muted-foreground mt-0.5">No hay eventos en esta categoría.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    items.map((event) => {
                        const expired = isExpired(event);
                        const upcoming = isUpcoming(event);
                        return (
                            <TableRow key={event.id} className={`group ${expired ? 'opacity-60' : ''}`}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        {event.banner_url && (
                                            <button onClick={() => setBannerViewer(event.banner_url!)}>
                                                <img
                                                    src={event.banner_url}
                                                    alt=""
                                                    className="h-8 w-12 rounded object-cover border hover:scale-110 transition-transform"
                                                />
                                            </button>
                                        )}
                                        <div>
                                            <div className="font-medium">{event.name}</div>
                                            {event.description && (
                                                <div className="text-xs text-muted-foreground truncate max-w-[260px]">
                                                    {event.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center text-sm whitespace-nowrap">
                                    <span>{event.starts_at}</span>
                                    <br />
                                    <span className="text-muted-foreground text-xs">
                                        hasta {event.ends_at || 'siempre'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    {expired ? (
                                        <Badge variant="outline" className="text-gray-400 border-gray-300">Expirado</Badge>
                                    ) : upcoming ? (
                                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">Próximo</Badge>
                                    ) : event.is_active ? (
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Activo</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-gray-500">Inactivo</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <TooltipProvider delayDuration={300}>
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {event.banner_url && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBannerViewer(event.banner_url!)}>
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Ver banner</TooltipContent>
                                                </Tooltip>
                                            )}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(event)}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Editar</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(event)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Eliminar</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TooltipProvider>
                                </TableCell>
                            </TableRow>
                        );
                    })
                )}
            </TableBody>
        </Table>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Eventos" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {flash.success && (
                    <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {/* Page Header */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                            <CalendarDays className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Eventos</h1>
                            <p className="text-sm text-muted-foreground">Gestiona eventos y sus banners publicitarios.</p>
                        </div>
                    </div>
                    <Button onClick={openCreateDialog} className="mt-3 gap-2 self-start sm:mt-0 sm:self-auto">
                        <Plus className="h-4 w-4" /> Nuevo Evento
                    </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { label: 'Total creados', value: stats.total, icon: CalendarDays, bg: 'bg-violet-100 dark:bg-violet-900/30', color: 'text-violet-600 dark:text-violet-400' },
                        { label: 'Activos ahora', value: stats.active, icon: Zap, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'Próximos', value: stats.upcoming, icon: CalendarCheck2, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
                        { label: 'Con banner', value: stats.with_banner, icon: Image, bg: 'bg-rose-100 dark:bg-rose-900/30', color: 'text-rose-600 dark:text-rose-400' },
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

                {banners.length > 0 && (
                    <div>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Banners activos
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {banners.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => setBannerViewer(b.url)}
                                    className="group overflow-hidden rounded-xl border bg-card text-card-foreground shadow hover:shadow-md transition-shadow text-left"
                                >
                                    <div className="relative overflow-hidden">
                                        <img
                                            src={b.url}
                                            alt={b.name}
                                            className="h-36 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 drop-shadow" />
                                        </div>
                                    </div>
                                    <div className="p-3 bg-muted/30">
                                        <p className="text-sm font-medium truncate">{b.name}</p>
                                        <p className="text-xs text-muted-foreground">Ver banner</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {/* Events Table */}
                <div className="rounded-lg border overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <p className="text-sm font-medium">Listado de eventos</p>
                    </div>
                    <Tabs defaultValue="all" className="w-full">
                        <div className="px-4 pt-3 pb-0">
                            <TabsList>
                                <TabsTrigger value="all">
                                    Todos <Badge variant="secondary" className="ml-1.5">{filtered.all.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="active">
                                    Activos <Badge variant="secondary" className="ml-1.5">{filtered.active.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="upcoming">
                                    Próximos <Badge variant="secondary" className="ml-1.5">{filtered.upcoming.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="expired">
                                    Expirados <Badge variant="secondary" className="ml-1.5">{filtered.expired.length}</Badge>
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <TabsContent value="all" className="mt-0">{renderTable(filtered.all)}</TabsContent>
                        <TabsContent value="active" className="mt-0">{renderTable(filtered.active)}</TabsContent>
                        <TabsContent value="upcoming" className="mt-0">{renderTable(filtered.upcoming)}</TabsContent>
                        <TabsContent value="expired" className="mt-0">{renderTable(filtered.expired)}</TabsContent>
                    </Tabs>
                </div>
            </div>
            <Dialog open={!!bannerViewer} onOpenChange={(o) => !o && setBannerViewer(null)}>
                <DialogContent className="sm:max-w-2xl bg-transparent border-none shadow-none">
                    <DialogTitle className="sr-only">Visualizar Banner</DialogTitle>
                    {bannerViewer && (
                        <div className="relative rounded-xl overflow-hidden flex items-center justify-center bg-black/60 p-4">
                            <img
                                src={bannerViewer}
                                alt="Banner"
                                className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                                    <PartyPopper className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <DialogTitle>{editingEvent ? 'Editar Evento' : 'Nuevo Evento'}</DialogTitle>
                                    <DialogDescription>
                                        Gestiona eventos que se mostrarán en tus banners y comunicación.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <Separator className="my-4" />

                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    Nombre del evento <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    maxLength={255}
                                    placeholder="Ej: Noche de Jazz"
                                    autoFocus
                                />
                                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    Descripción{' '}
                                    <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                                </Label>
                                <Input
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    maxLength={500}
                                    placeholder="Breve descripción del evento"
                                />
                                {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="banner_path">
                                    Banner o imagen{' '}
                                    <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                                </Label>
                                {editingEvent?.banner_url && (
                                    <img
                                        src={editingEvent.banner_url}
                                        alt="Banner actual"
                                        className="h-36 w-full object-cover rounded-lg border"
                                    />
                                )}
                                <Input
                                    id="banner_path"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setData('banner_path', e.target.files?.[0] || null)}
                                />
                                {errors.banner_path && <p className="text-xs text-destructive">{errors.banner_path}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="starts_at">
                                        Inicio <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="starts_at"
                                        type="date"
                                        value={data.starts_at}
                                        onChange={(e) => setData('starts_at', e.target.value)}
                                        required
                                    />
                                    {errors.starts_at && <p className="text-xs text-destructive">{errors.starts_at}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="ends_at">
                                        Fin{' '}
                                        <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                                    </Label>
                                    <Input
                                        id="ends_at"
                                        type="date"
                                        value={data.ends_at}
                                        min={data.starts_at}
                                        onChange={(e) => setData('ends_at', e.target.value)}
                                    />
                                    {errors.ends_at && <p className="text-xs text-destructive">{errors.ends_at}</p>}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="is_active">Visibilidad</Label>
                                <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/40 px-3">
                                    <Switch
                                        id="is_active"
                                        checked={data.is_active}
                                        onCheckedChange={(checked) => setData('is_active', checked)}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        {data.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={processing}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Guardando…' : editingEvent ? 'Guardar cambios' : 'Crear evento'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
