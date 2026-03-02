import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Category, Item } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Inventario e Ítems', href: '/items' },
];

type Props = {
    items: Pick<Item, 'id' | 'name' | 'description' | 'type' | 'status' | 'base_price' | 'capacity' | 'duration_minutes' | 'category'>[];
    categories: Pick<Category, 'id' | 'name'>[];
};

function formatBs(centavos: number) {
    return `Bs ${(centavos / 100).toFixed(2)}`;
}

export default function ItemsIndex({ items, categories }: Props) {
    const { flash } = usePage().props;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Props['items'][0] | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        description: '',
        category_id: '',
        type: 'reservable',
        status: 'active',
        base_price: 0,
        capacity: '',
        duration_minutes: '',
    });

    const openCreateDialog = () => {
        setEditingItem(null);
        reset();
        clearErrors();
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: Props['items'][0]) => {
        setEditingItem(item);
        setData({
            name: item.name,
            description: item.description || '',
            category_id: item.category?.id || '',
            type: item.type,
            status: item.status,
            base_price: item.base_price / 100, // Presentar en Bs
            capacity: item.capacity?.toString() || '',
            duration_minutes: item.duration_minutes?.toString() || '',
        });
        clearErrors();
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Convertir el precio base a centavos antes de enviar
        const payload = {
            ...data,
            base_price: Math.round(data.base_price * 100),
            capacity: data.capacity === '' ? null : parseInt(data.capacity),
            duration_minutes: data.duration_minutes === '' ? null : parseInt(data.duration_minutes),
        };

        if (editingItem) {
            router.put(`/items/${editingItem.id}`, payload, {
                onSuccess: () => setIsDialogOpen(false),
            });
        } else {
            router.post('/items', payload, {
                onSuccess: () => setIsDialogOpen(false),
            });
        }
    };

    const handleDelete = (item: Props['items'][0]) => {
        if (confirm(`¿Estás seguro de eliminar el ítem "${item.name}"?`)) {
            router.delete(`/items/${item.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ítems" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {flash.success && (
                    <Alert>
                        <AlertDescription className="text-green-700">{flash.success}</AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Catálogo de Ítems (Mesas, Espacios, Menú)</CardTitle>
                        <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                            <Plus className="mr-2 h-4 w-4" />
                            Añadir Ítem
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Precio (Bs)</TableHead>
                                    <TableHead className="text-center">Capacidad</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                            No hay ítems registrados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-semibold">{item.name}</div>
                                                <div className="text-xs text-muted-foreground">{item.description || 'Sin descripción'}</div>
                                            </TableCell>
                                            <TableCell>{item.category?.name ?? '—'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {item.type === 'reservable' ? 'Reservable (Mesa/Espacio)' : 'Platillo/Menú'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{formatBs(item.base_price)}</TableCell>
                                            <TableCell className="text-center">
                                                {item.capacity ? `${item.capacity} pers.` : '—'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.status === 'active' && <Badge className="bg-green-100 text-green-800 border-green-200">Activo</Badge>}
                                                {item.status === 'inactive' && <Badge variant="outline" className="text-gray-500">Inactivo</Badge>}
                                                {item.status === 'draft' && <Badge variant="secondary">Borrador</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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

            {/* Create/Edit Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Editar Ítem' : 'Nuevo Ítem'}</DialogTitle>
                            <DialogDescription>
                                Un ítem puede ser una Mesa reservable, un Salón privado, o un Platillo del Menú.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">

                            {/* Type and Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Tipo</Label>
                                    <Select
                                        value={data.type}
                                        onValueChange={(val) => setData('type', val)}
                                        disabled={!!editingItem} // No se puede cambiar el tipo una vez creado
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="reservable">Reservable (Mesa/Espacio)</SelectItem>
                                            <SelectItem value="menu_item">Menú / Producto</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="status">Estado</Label>
                                    <Select
                                        value={data.status}
                                        onValueChange={(val) => setData('status', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Estado..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Activo</SelectItem>
                                            <SelectItem value="inactive">Inactivo</SelectItem>
                                            <SelectItem value="draft">Borrador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.status && <p className="text-sm text-red-500">{errors.status}</p>}
                                </div>
                            </div>

                            {/* Name and Category */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nombre</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Mesa 5, o Silpancho..."
                                        maxLength={100}
                                        required
                                    />
                                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="category_id">Categoría</Label>
                                    <Select
                                        value={data.category_id}
                                        onValueChange={(val) => setData('category_id', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Ninguna" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none" disabled>Selecciona una categoría</SelectItem>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.category_id && <p className="text-sm text-red-500">{errors.category_id}</p>}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="grid gap-2">
                                <Label htmlFor="description">Descripción</Label>
                                <Input
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Breve detalle (opcional)"
                                    maxLength={255}
                                />
                                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                            </div>

                            {/* Reservable Fields */}
                            {data.type === 'reservable' && (
                                <div className="grid grid-cols-2 gap-4 bg-muted/50 p-3 rounded-lg border">
                                    <div className="grid gap-2">
                                        <Label htmlFor="capacity">Capacidad (Personas) *</Label>
                                        <Input
                                            id="capacity"
                                            type="number"
                                            min="1"
                                            value={data.capacity}
                                            onChange={(e) => setData('capacity', e.target.value)}
                                            required={data.type === 'reservable'}
                                        />
                                        {errors.capacity && <p className="text-sm text-red-500">{errors.capacity}</p>}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="duration_minutes">Duración por defecto (Mins) *</Label>
                                        <Input
                                            id="duration_minutes"
                                            type="number"
                                            min="30"
                                            step="30"
                                            value={data.duration_minutes}
                                            onChange={(e) => setData('duration_minutes', e.target.value)}
                                            required={data.type === 'reservable'}
                                        />
                                        {errors.duration_minutes && <p className="text-sm text-red-500">{errors.duration_minutes}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Price */}
                            <div className="grid gap-2">
                                <Label htmlFor="base_price">Precio Base (Bs) *</Label>
                                <Input
                                    id="base_price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.base_price}
                                    onChange={(e) => setData('base_price', parseFloat(e.target.value) || 0)}
                                    required
                                />
                                <span className="text-xs text-muted-foreground">
                                    Costo de reserva de la mesa (0 si es gratis) o valor del platillo.
                                </span>
                                {errors.base_price && <p className="text-sm text-red-500">{errors.base_price}</p>}
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
