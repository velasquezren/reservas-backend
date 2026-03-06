import { Head, router, useForm, usePage } from '@inertiajs/react';
import { LayoutGrid, Pencil, Plus, Trash2, Tag } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
        if (confirm(`¿Eliminar la categoría "${category.name}"?\nEsta acción no se puede deshacer y podría fallar si tiene ítems asociados.`)) {
            router.delete(`/categories/${category.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorías" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">

                {/* Flash */}
                {flash.success && (
                    <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {/* Page Header */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                            <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Categorías</h1>
                            <p className="text-sm text-muted-foreground">Organiza tus mesas y menú por categorías.</p>
                        </div>
                    </div>
                    <Button onClick={openCreateDialog} className="mt-3 gap-2 self-start sm:mt-0 sm:self-auto">
                        <Plus className="h-4 w-4" /> Nueva Categoría
                    </Button>
                </div>

                {/* Table */}
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16 text-center">Orden</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="text-center">Ítems</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                                <TableHead className="w-20 text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed mb-3">
                                                <LayoutGrid className="h-5 w-5 text-muted-foreground/60" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">Sin categorías</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Crea la primera para comenzar.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.map((category) => (
                                    <TableRow key={category.id} className="group">
                                        <TableCell className="text-center font-medium tabular-nums">{category.sort_order}</TableCell>
                                        <TableCell className="font-semibold">{category.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{category.description || <span className="italic text-muted-foreground/50">—</span>}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{category.items_count}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {category.is_active ? (
                                                <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                                                    Activo
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <TooltipProvider delayDuration={300}>
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(category)}>
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Editar</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => handleDelete(category)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Eliminar</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TooltipProvider>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Create / Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[440px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                    <Tag className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                                    <DialogDescription>
                                        {editingCategory
                                            ? 'Modifica los datos de la categoría.'
                                            : 'Añade una nueva categoría para organizar tus mesas o menú.'}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <Separator className="my-4" />

                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    Nombre <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Ej. Terraza, Bebidas…"
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
                                    placeholder="Breve descripción…"
                                />
                                {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
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
                                    {errors.sort_order && <p className="text-xs text-destructive">{errors.sort_order}</p>}
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
                        </div>

                        <Separator className="my-4" />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={processing}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Guardando…' : editingCategory ? 'Guardar cambios' : 'Crear'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
