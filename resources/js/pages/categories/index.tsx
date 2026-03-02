import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import type { BreadcrumbItem, Category } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Categorías', href: '/categories' },
];

type Props = {
    categories: Pick<Category, 'id' | 'name' | 'slug' | 'description' | 'is_active' | 'sort_order' | 'items_count'>[];
};

export default function CategoriesIndex({ categories }: Props) {
    const { flash } = usePage().props;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Props['categories'][0] | null>(null);

    const { data, setData, post, patch, processing, errors, reset, clearErrors } = useForm({
        name: '',
        description: '',
        is_active: true,
        sort_order: 1,
    });

    const openCreateDialog = () => {
        setEditingCategory(null);
        reset();
        clearErrors();
        setIsDialogOpen(true);
    };

    const openEditDialog = (category: Props['categories'][0]) => {
        setEditingCategory(category);
        setData({
            name: category.name,
            description: category.description || '',
            is_active: category.is_active,
            sort_order: category.sort_order,
        });
        clearErrors();
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingCategory) {
            patch(`/categories/${editingCategory.id}`, {
                onSuccess: () => setIsDialogOpen(false),
            });
        } else {
            post('/categories', {
                onSuccess: () => setIsDialogOpen(false),
            });
        }
    };

    const handleDelete = (category: Props['categories'][0]) => {
        if (confirm(`¿Estás seguro de eliminar la categoría "${category.name}"?\n¡Esta acción no se puede deshacer y podría fallar si tiene ítems asociados!`)) {
            router.delete(`/categories/${category.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorías" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {flash.success && (
                    <Alert>
                        <AlertDescription className="text-green-700">{flash.success}</AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Gestión de Categorías</CardTitle>
                        <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Categoría
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16 text-center">Orden</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-center">Ítems</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                            No hay categorías registradas.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    categories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="text-center font-medium">{category.sort_order}</TableCell>
                                            <TableCell className="font-semibold">{category.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{category.description || '—'}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{category.items_count}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {category.is_active ? (
                                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Activo</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-gray-500">Inactivo</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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

            {/* Create/Edit Component Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                            <DialogDescription>
                                {editingCategory
                                    ? 'Modifica los datos de la categoría aquí.'
                                    : 'Añade una nueva categoría para organizar tus mesas o menú.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Ej. Terraza, Bebidas"
                                />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Descripción (opcional)</Label>
                                <Input
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Breve detalle..."
                                />
                                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="sort_order">Orden de aparición</Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        min="1"
                                        value={data.sort_order}
                                        onChange={(e) => setData('sort_order', parseInt(e.target.value))}
                                    />
                                    {errors.sort_order && <p className="text-sm text-red-500">{errors.sort_order}</p>}
                                </div>

                                <div className="flex flex-col justify-center gap-2 pt-4">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="is_active"
                                            checked={data.is_active}
                                            onCheckedChange={(checked) => setData('is_active', checked)}
                                        />
                                        <Label htmlFor="is_active">Activo</Label>
                                    </div>
                                    {errors.is_active && <p className="text-sm text-red-500">{errors.is_active}</p>}
                                </div>
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
