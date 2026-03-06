import { Head, router, usePage } from '@inertiajs/react';
import {
    ChefHat, Clock, MapPin, Package2, Pencil, Plus,
    Search, Trash2, Users, Utensils, X, Tag, Banknote,
    ToggleLeft, ToggleRight,
} from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Category, Item } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Catálogo', href: '/items' },
];

type LocalItem = Pick<Item, 'id' | 'name' | 'description' | 'type' | 'status' | 'base_price' | 'capacity' | 'duration_minutes' | 'category'>;

type Props = {
    items: LocalItem[];
    categories: Pick<Category, 'id' | 'name'>[];
};

function formatBs(centavos: number) {
    return `Bs ${(centavos / 100).toFixed(2)}`;
}

type FormMode = 'table' | 'menu';

const EMPTY_TABLE_FORM = {
    name: '', description: '', category_id: '',
    type: 'reservable', status: 'active',
    base_price: 0, capacity: '', duration_minutes: '120',
};

const EMPTY_MENU_FORM = {
    name: '', description: '', category_id: '',
    type: 'menu_item', status: 'active',
    base_price: 0, capacity: '', duration_minutes: '',
};

function StatusBadge({ status }: { status: string }) {
    if (status === 'active') return <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">Activo</Badge>;
    if (status === 'inactive') return <Badge variant="outline" className="text-zinc-500">Inactivo</Badge>;
    return <Badge variant="secondary">Borrador</Badge>;
}

export default function ItemsIndex({ items, categories }: Props) {
    const { flash, errors: pageErrors } = usePage<{ flash: { success?: string }; errors: Record<string, string> }>().props;
    const [activeTab, setActiveTab] = useState<'tables' | 'menu'>('tables');
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<FormMode>('table');
    const [editingItem, setEditingItem] = useState<LocalItem | null>(null);
    const [processing, setProcessing] = useState(false);
    const [formData, setFormData] = useState({ ...EMPTY_TABLE_FORM });

    const tables = items.filter(i => i.type === 'reservable');
    const menuItems = items.filter(i => i.type === 'menu_item');

    const filteredTables = tables.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.category?.name ?? '').toLowerCase().includes(search.toLowerCase())
    );
    const filteredMenu = menuItems.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.category?.name ?? '').toLowerCase().includes(search.toLowerCase())
    );

    function openCreate(mode: FormMode) {
        setEditingItem(null);
        setDialogMode(mode);
        setFormData(mode === 'table' ? { ...EMPTY_TABLE_FORM } : { ...EMPTY_MENU_FORM });
        setDialogOpen(true);
    }

    function openEdit(item: LocalItem) {
        const mode: FormMode = item.type === 'reservable' ? 'table' : 'menu';
        setEditingItem(item);
        setDialogMode(mode);
        setFormData({
            name: item.name,
            description: item.description || '',
            category_id: item.category?.id || '',
            type: item.type,
            status: item.status,
            base_price: item.base_price / 100,
            capacity: item.capacity?.toString() || '',
            duration_minutes: item.duration_minutes?.toString() || '',
        });
        setDialogOpen(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setProcessing(true);

        const payload = {
            ...formData,
            base_price: Math.round(formData.base_price * 100),
            capacity: formData.capacity === '' ? null : parseInt(formData.capacity),
            duration_minutes: formData.duration_minutes === '' ? null : parseInt(formData.duration_minutes),
        };

        const opts = { onSuccess: () => { setDialogOpen(false); setProcessing(false); }, onError: () => setProcessing(false) };
        if (editingItem) {
            router.put(`/items/${editingItem.id}`, payload, opts);
        } else {
            router.post('/items', payload, opts);
        }
    }

    function handleDelete(item: LocalItem) {
        if (confirm(`¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`)) {
            router.delete(`/items/${item.id}`);
        }
    }

    const isTable = dialogMode === 'table';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Catálogo de Ítems" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">

                {flash?.success && (
                    <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                            <Package2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Catálogo</h1>
                            <p className="text-sm text-muted-foreground">
                                Administra tus mesas/espacios reservables y los platillos del menú.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 self-start sm:self-auto">
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => openCreate('menu')}
                        >
                            <ChefHat className="h-4 w-4" />
                            Nuevo Platillo
                        </Button>
                        <Button className="gap-2" onClick={() => openCreate('table')}>
                            <Plus className="h-4 w-4" />
                            Nueva Mesa / Espacio
                        </Button>
                    </div>
                </div>

                {/* ── Tabs ───────────────────────────────────────────────── */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tables' | 'menu')}>
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="tables" className="gap-2">
                                <MapPin className="h-4 w-4" />
                                Mesas y Espacios
                                <Badge variant="secondary" className="ml-1">{tables.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="menu" className="gap-2">
                                <Utensils className="h-4 w-4" />
                                Menú / Platillos
                                <Badge variant="secondary" className="ml-1">{menuItems.length}</Badge>
                            </TabsTrigger>
                        </TabsList>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                className="pl-8 w-[240px]"
                                placeholder="Buscar..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Tables Tab ──────────────────────────────────────── */}
                    <TabsContent value="tables" className="mt-4">
                        {filteredTables.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                                    <MapPin className="h-10 w-10 opacity-30" />
                                    <p className="font-medium text-foreground">No hay mesas ni espacios registrados</p>
                                    <p className="text-sm">Las mesas son los espacios físicos que los clientes reservan.</p>
                                    <Button onClick={() => openCreate('table')} className="mt-2 gap-2">
                                        <Plus className="h-4 w-4" /> Crear mi primera mesa
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {filteredTables.map(item => (
                                    <Card key={item.id} className="group relative overflow-hidden hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                                        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-sm font-semibold">{item.name}</CardTitle>
                                                        <CardDescription className="text-xs">{item.category?.name ?? 'Sin categoría'}</CardDescription>
                                                    </div>
                                                </div>
                                                <StatusBadge status={item.status} />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            {item.description && (
                                                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3.5 w-3.5" />
                                                    <strong className="text-foreground">{item.capacity ?? '—'}</strong> pers.
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {item.duration_minutes ? `${item.duration_minutes} min` : '—'}
                                                </span>
                                                <span className="flex items-center gap-1 ml-auto font-medium text-foreground">
                                                    <Banknote className="h-3.5 w-3.5" />
                                                    {formatBs(item.base_price)}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 mt-4 pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" className="gap-1.5 flex-1" onClick={() => openEdit(item)}>
                                                    <Pencil className="h-3.5 w-3.5" /> Editar
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Menu Tab ────────────────────────────────────────── */}
                    <TabsContent value="menu" className="mt-4">
                        {filteredMenu.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                                    <ChefHat className="h-10 w-10 opacity-30" />
                                    <p className="font-medium text-foreground">No hay platillos en el menú</p>
                                    <p className="text-sm">Los platillos son ítems del menú que los clientes pueden pre-ordenar al reservar.</p>
                                    <Button variant="outline" onClick={() => openCreate('menu')} className="mt-2 gap-2">
                                        <Plus className="h-4 w-4" /> Agregar primer platillo
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="rounded-lg border bg-card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>Categoría</TableHead>
                                                <TableHead>Precio</TableHead>
                                                <TableHead className="text-center">Estado</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredMenu.map(item => (
                                                <TableRow key={item.id} className="group">
                                                    <TableCell>
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                                                <Utensils className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm">{item.name}</p>
                                                                {item.description && (
                                                                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.category
                                                            ? <Badge variant="outline" className="text-xs gap-1"><Tag className="h-3 w-3" />{item.category.name}</Badge>
                                                            : <span className="text-muted-foreground text-xs">—</span>
                                                        }
                                                    </TableCell>
                                                    <TableCell className="font-semibold">{formatBs(item.base_price)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <StatusBadge status={item.status} />
                                                    </TableCell>
                                                    <TableCell className="text-right pr-4">
                                                        <TooltipProvider delayDuration={300}>
                                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Editar</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon"
                                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                            onClick={() => handleDelete(item)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Eliminar</TooltipContent>
                                                                </Tooltip>
                                                            </div>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* ── Create / Edit Dialog ──────────────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-1">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isTable ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                                    {isTable
                                        ? <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        : <ChefHat className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    }
                                </div>
                                <div>
                                    <DialogTitle>
                                        {editingItem ? 'Editar' : 'Crear'} {isTable ? 'Mesa / Espacio' : 'Platillo del Menú'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {isTable
                                            ? 'Espacio físico reservable por los clientes (mesa, sala, terraza, etc.)'
                                            : 'Ítem del menú que los clientes pueden pre-ordenar al hacer su reserva.'}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <Separator className="my-4" />

                        <div className="grid gap-5">
                            {/* Name */}
                            <div className="grid gap-2">
                                <Label htmlFor="item-name">
                                    {isTable ? 'Nombre de la mesa / espacio' : 'Nombre del platillo'} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="item-name"
                                    value={formData.name}
                                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                    placeholder={isTable ? 'Mesa 4, Terraza VIP, Salón Privado...' : 'Silpancho, Chicharrón, Anticucho...'}
                                    required
                                    maxLength={100}
                                />
                            </div>

                            {/* Category + Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="item-cat">Categoría</Label>
                                    <Select value={formData.category_id || '__none__'} onValueChange={v => setFormData(p => ({ ...p, category_id: v === '__none__' ? '' : v }))}>
                                        <SelectTrigger id="item-cat">
                                            <SelectValue placeholder="Sin categoría" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">Sin categoría</SelectItem>
                                            {categories.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="item-status">Estado</Label>
                                    <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                                        <SelectTrigger id="item-status">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Activo</SelectItem>
                                            <SelectItem value="inactive">Inactivo</SelectItem>
                                            <SelectItem value="draft">Borrador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="grid gap-2">
                                <Label htmlFor="item-desc">Descripción</Label>
                                <Textarea
                                    id="item-desc"
                                    value={formData.description}
                                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                    placeholder={isTable ? 'Ubicación, vista, características especiales...' : 'Ingredientes, tiempo de preparación, notas...'}
                                    rows={2}
                                    maxLength={500}
                                />
                            </div>

                            {/* Reservable-specific fields */}
                            {isTable && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10 p-4 grid gap-4">
                                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5" /> Configuración de Capacidad
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="item-cap">Capacidad (personas) <span className="text-destructive">*</span></Label>
                                            <Input
                                                id="item-cap"
                                                type="number"
                                                min="1"
                                                max="500"
                                                value={formData.capacity}
                                                onChange={e => setFormData(p => ({ ...p, capacity: e.target.value }))}
                                                placeholder="4"
                                                required={isTable}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="item-dur">Duración estándar (min) <span className="text-destructive">*</span></Label>
                                            <Select value={formData.duration_minutes} onValueChange={v => setFormData(p => ({ ...p, duration_minutes: v }))}>
                                                <SelectTrigger id="item-dur">
                                                    <SelectValue placeholder="Selecciona..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="30">30 min</SelectItem>
                                                    <SelectItem value="60">1 hora</SelectItem>
                                                    <SelectItem value="90">1.5 horas</SelectItem>
                                                    <SelectItem value="120">2 horas</SelectItem>
                                                    <SelectItem value="150">2.5 horas</SelectItem>
                                                    <SelectItem value="180">3 horas</SelectItem>
                                                    <SelectItem value="240">4 horas</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Price */}
                            <div className="grid gap-2">
                                <Label htmlFor="item-price">
                                    {isTable ? 'Precio de reserva (Bs)' : 'Precio unitario (Bs)'} <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">Bs</span>
                                    <Input
                                        id="item-price"
                                        type="number"
                                        min="0"
                                        step="0.50"
                                        value={formData.base_price}
                                        onChange={e => setFormData(p => ({ ...p, base_price: parseFloat(e.target.value) || 0 }))}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {isTable ? 'Costo de reservar este espacio (0 si es gratuito).' : 'Precio del platillo por unidad.'}
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing} className="gap-2">
                                {processing ? 'Guardando...' : (editingItem ? 'Guardar cambios' : `Crear ${isTable ? 'mesa' : 'platillo'}`)}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
