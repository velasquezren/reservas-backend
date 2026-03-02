import { Head, useForm, usePage, router } from '@inertiajs/react';
import {
    CalendarDays, Activity, Settings2, Ticket,
    Pencil, Plus, Trash2, Tag, Eye, Image, Zap, CalendarCheck2,
} from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        name:        '',
        description: '',
        starts_at:   new Date().toISOString().split('T')[0],
        ends_at:     '',
        is_active:   true,
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
            name:        event.name,
            description: event.description || '',
            starts_at:   event.starts_at ? event.starts_at.split('T')[0] : new Date().toISOString().split('T')[0],
            ends_at:     event.ends_at ? event.ends_at.split('T')[0] : '',
            is_active:   event.is_active,
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
        all:      events,
        active:   events.filter(e => e.is_active && (!e.ends_at || e.ends_at >= today)),
        upcoming: events.filter(e => e.is_active && e.starts_at > today),
        expired:  events.filter(e => !!e.ends_at && e.ends_at < today),
    };

    const renderTable = (items: Event[]) => (
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-muted/50">
                    <TableHead className="font-semibold text-muted-foreground">
                        <div className="flex items-center gap-2"><Tag className="w-4 h-4" /> Nombre / Detalle</div>
                    </TableHead>
                    <TableHead className="text-center font-semibold text-muted-foreground">
                        <div className="flex items-center justify-center gap-2"><CalendarDays className="w-4 h-4" /> Vigencia</div>
                    </TableHead>
                    <TableHead className="text-center font-semibold text-muted-foreground">
                        <div className="flex items-center justify-center gap-2"><Activity className="w-4 h-4" /> Estado</div>
                    </TableHead>
                    <TableHead className="text-right font-semibold text-muted-foreground">
                        <div className="flex items-center justify-end gap-2"><Settings2 className="w-4 h-4" /> Acciones</div>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-48 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <Ticket className="h-10 w-10 mb-3 opacity-30" />
                                <p className="text-base font-medium text-foreground">Sin resultados</p>
                                <p className="text-sm">No hay eventos en esta categorÃ­a.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    items.map((event) => {
                        const expired  = isExpired(event);
                        const upcoming = isUpcoming(event);
                        return (
                            <TableRow key={event.id} className={expired ? 'opacity-60' : ''}>
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
                                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">PrÃ³ximo</Badge>
                                    ) : event.is_active ? (
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Activo</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-gray-500">Inactivo</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        {event.banner_url && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setBannerViewer(event.banner_url!)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(event)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(event)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
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

            <div className="flex flex-1 flex-col gap-6 p-6">
                {flash.success && (
                    <Alert>
                        <AlertDescription className="text-green-700">{flash.success}</AlertDescription>
                    </Alert>
                )}

                {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Eventos</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Gestiona eventos y sus banners publicitarios.
                        </p>
                    </div>
                    <Button onClick={openCreateDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Evento
                    </Button>
                </div>

                {/* â”€â”€ Stats Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100">
                                <CalendarDays className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total creados</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100">
                                <Zap className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Activos ahora</p>
                                <p className="text-2xl font-bold">{stats.active}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100">
                                <CalendarCheck2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Próximos</p>
                                <p className="text-2xl font-bold">{stats.upcoming}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100">
                                <Image className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Con banner</p>
                                <p className="text-2xl font-bold">{stats.with_banner}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* â”€â”€ Active Banners Gallery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

                {/* â”€â”€ Events Table (tabbed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <Card>
                    <CardHeader>
                        <CardTitle>Listado de Eventos</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Tabs defaultValue="all" className="w-full">
                            <TabsList className="mx-4 mb-0 mt-1">
                                <TabsTrigger value="all">
                                    Todos <Badge variant="secondary" className="ml-1.5">{filtered.all.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="active">
                                    Activos <Badge variant="secondary" className="ml-1.5 bg-green-100 text-green-700">{filtered.active.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="upcoming">
                                    Próximos <Badge variant="secondary" className="ml-1.5 bg-blue-100 text-blue-700">{filtered.upcoming.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="expired">
                                    Expirados <Badge variant="secondary" className="ml-1.5">{filtered.expired.length}</Badge>
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="all"      className="mt-0">{renderTable(filtered.all)}</TabsContent>
                            <TabsContent value="active"   className="mt-0">{renderTable(filtered.active)}</TabsContent>
                            <TabsContent value="upcoming" className="mt-0">{renderTable(filtered.upcoming)}</TabsContent>
                            <TabsContent value="expired"  className="mt-0">{renderTable(filtered.expired)}</TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

            {/* â”€â”€ Banner Viewer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

            {/* â”€â”€ Create / Edit Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingEvent ? 'Editar Evento' : 'Nuevo Evento'}</DialogTitle>
                            <DialogDescription>
                                Gestiona eventos que se mostrarán en tus banners y comunicación.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre del Evento *</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    maxLength={255}
                                    placeholder="Ej: Noche de Jazz"
                                />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Descripción (Opcional)</Label>
                                <Input
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    maxLength={500}
                                    placeholder="Breve descripción del evento"
                                />
                                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="banner_path">Banner o Imagen (Opcional)</Label>
                                {editingEvent?.banner_url && (
                                    <img
                                        src={editingEvent.banner_url}
                                        alt="Banner actual"
                                        className="h-40 w-full object-cover rounded-lg border"
                                    />
                                )}
                                <Input
                                    id="banner_path"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setData('banner_path', e.target.files?.[0] || null)}
                                />
                                {errors.banner_path && <p className="text-sm text-red-500">{errors.banner_path}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="starts_at">Inicio *</Label>
                                    <Input
                                        id="starts_at"
                                        type="date"
                                        value={data.starts_at}
                                        onChange={(e) => setData('starts_at', e.target.value)}
                                        required
                                    />
                                    {errors.starts_at && <p className="text-sm text-red-500">{errors.starts_at}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="ends_at">Fin (Opcional)</Label>
                                    <Input
                                        id="ends_at"
                                        type="date"
                                        value={data.ends_at}
                                        min={data.starts_at}
                                        onChange={(e) => setData('ends_at', e.target.value)}
                                    />
                                    {errors.ends_at && <p className="text-sm text-red-500">{errors.ends_at}</p>}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-1">
                                <Switch
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) => setData('is_active', checked)}
                                />
                                <Label htmlFor="is_active">Mantener evento activo</Label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
