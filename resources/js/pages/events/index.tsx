import { Head, useForm, usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import { CalendarDays, Activity, Settings2, Ticket, Pencil, Plus, Trash2, Hash, Tag, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';

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

type Props = {
    events: Event[];
};

export default function EventsIndex({ events }: Props) {
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
            router.post(`/events/${editingEvent.id}`, {
                _method: 'put',
                ...data,
            }, {
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
        if (confirm(`¿Estás seguro de eliminar el evento "${event.name}"?`)) {
            router.delete(`/events/${event.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Eventos" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {flash.success && (
                    <Alert>
                        <AlertDescription className="text-green-700">{flash.success}</AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Eventos y Campañas</CardTitle>
                        <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Evento
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-muted/50">
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Tag className="w-4 h-4" /> Nombre / Detalle</div></TableHead>
                                    <TableHead className="text-center font-semibold text-muted-foreground"><div className="flex items-center justify-center gap-2"><CalendarDays className="w-4 h-4" /> Vigencia</div></TableHead>
                                    <TableHead className="text-center font-semibold text-muted-foreground"><div className="flex items-center justify-center gap-2"><Activity className="w-4 h-4" /> Estado</div></TableHead>
                                    <TableHead className="text-center font-semibold text-muted-foreground">Banner</TableHead>
                                    <TableHead className="text-right font-semibold text-muted-foreground"><div className="flex items-center justify-end gap-2"><Settings2 className="w-4 h-4" /> Acciones</div></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <Ticket className="h-12 w-12 mb-4 text-muted/40" />
                                                <p className="text-lg font-medium text-foreground">No hay eventos configurados</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    events.map((event) => (
                                        <TableRow key={event.id}>
                                            <TableCell>
                                                <div className="font-medium">{event.name}</div>
                                                <div className="text-xs text-muted-foreground">{event.description || '—'}</div>
                                            </TableCell>
                                            <TableCell className="text-center whitespace-nowrap text-sm">
                                                {event.starts_at} <br />
                                                <span className="text-muted-foreground text-xs">hasta {event.ends_at || 'Siempre'}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {event.is_active ? (
                                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Activo</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-gray-500">Inactivo</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {event.banner_url ? (
                                                    <Button variant="outline" size="sm" onClick={() => setBannerViewer(event.banner_url || null)}>
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        Ver
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Sin portada</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(event)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(event)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Banner Viewer Modal */}
            <Dialog open={!!bannerViewer} onOpenChange={(o) => (!o && setBannerViewer(null))}>
                <DialogContent className="sm:max-w-2xl bg-transparent border-none shadow-none focus-visible:outline-none">
                    <DialogTitle className="sr-only">Visualizar Imagen</DialogTitle>
                    {bannerViewer && (
                        <div className="relative rounded-lg overflow-hidden flex items-center justify-center bg-black/50 p-4">
                            <img src={bannerViewer} alt="Banner Preview" className="max-w-full max-h-[80vh] rounded shadow-2xl object-contain" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create/Edit Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingEvent ? 'Editar Evento' : 'Nuevo Evento'}</DialogTitle>
                            <DialogDescription>
                                Gestiona eventos y campañas que se mostrarán en tu comunicación y banners.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">

                            {/* Basics */}
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre del Evento *</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    maxLength={255}
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
                                />
                                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                            </div>

                            {/* Banner Image */}
                            <div className="grid gap-2">
                                <Label htmlFor="banner_path">Banner o Imagen (Opcional)</Label>
                                {editingEvent?.banner_url && (
                                    <div className="mb-2">
                                        <img src={editingEvent.banner_url} alt="Banner" className="h-[200px] w-full object-cover rounded-lg shadow-md border border-border" />
                                    </div>
                                )}
                                <Input
                                    id="banner_path"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setData('banner_path', e.target.files?.[0] || null)}
                                />
                                {errors.banner_path && <p className="text-sm text-red-500">{errors.banner_path}</p>}
                            </div>

                            {/* Dates */}
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

                            <div className="flex items-center space-x-2 pt-2">
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

