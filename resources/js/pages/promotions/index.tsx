import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Tag, CalendarDays, Activity, Percent, Settings2, Ticket, Users, Pencil, Plus, Trash2, Search, Hash } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Promociones', href: '/promotions' },
];

type Props = {
    promotions: (Pick<Promotion, 'id' | 'name' | 'description' | 'code' | 'discount_type' | 'discount_value' | 'starts_at' | 'ends_at' | 'max_uses' | 'max_uses_per_user' | 'current_uses' | 'is_active'> & { banner_url?: string | null })[];
};

function formatBs(centavos: number) {
    return `Bs ${(centavos / 100).toFixed(2)}`;
}

export default function PromotionsIndex({ promotions }: Props) {
    const { flash } = usePage().props;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [bannerViewer, setBannerViewer] = useState<string | null>(null);
    const [editingPromo, setEditingPromo] = useState<Props['promotions'][0] | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        description: '',
        code: '',
        discount_type: 'percentage' as string | null,
        discount_value: 0 as number | null,
        starts_at: new Date().toISOString().split('T')[0],
        ends_at: '',
        max_uses: '',
        max_uses_per_user: '',
        is_active: true,
        banner_path: null as File | null,
    });

    const openCreateDialog = () => {
        setEditingPromo(null);
        reset();
        clearErrors();
        setData('discount_type', 'percentage');
        setIsDialogOpen(true);
    };

    const openEditDialog = (promo: Props['promotions'][0]) => {
        setEditingPromo(promo);
        setData({
            name: promo.name,
            description: promo.description || '',
            code: promo.code || '',
            discount_type: promo.discount_type || 'percentage',
            discount_value: promo.discount_type === 'fixed_amount' ? (promo.discount_value || 0) / 100 : (promo.discount_value || 0),
            starts_at: promo.starts_at ? promo.starts_at.split(' ')[0] : new Date().toISOString().split('T')[0],
            ends_at: promo.ends_at ? promo.ends_at.split(' ')[0] : '',
            max_uses: promo.max_uses?.toString() || '',
            max_uses_per_user: promo.max_uses_per_user?.toString() || '',
            is_active: promo.is_active,
            banner_path: null,
        });
        clearErrors();
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            ...data,
            discount_type: data.discount_type,
            discount_value: data.discount_type === 'fixed_amount' ? Math.round((data.discount_value || 0) * 100) : data.discount_value,
            max_uses: data.max_uses === '' ? null : parseInt(data.max_uses as string),
            max_uses_per_user: data.max_uses_per_user === '' ? null : parseInt(data.max_uses_per_user as string),
            ends_at: data.ends_at === '' ? null : data.ends_at,
        };

        if (editingPromo) {
            router.post(`/promotions/${editingPromo.id}`, {
                _method: 'put',
                ...payload,
            }, {
                forceFormData: true,
                onSuccess: () => setIsDialogOpen(false),
            });
        } else {
            router.post('/promotions', payload, {
                forceFormData: true,
                onSuccess: () => setIsDialogOpen(false),
            });
        }
    };

    const handleDelete = (promo: Props['promotions'][0]) => {
        if (confirm(`¿Estás seguro de eliminar "${promo.name}"?`)) {
            router.delete(`/promotions/${promo.id}`);
        }
    };

    const renderTable = (items: typeof promotions) => (
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-muted/50">
                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Hash className="w-4 h-4" /> CÓDIGO</div></TableHead>
                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Tag className="w-4 h-4" /> Nombre / Detalle</div></TableHead>
                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Percent className="w-4 h-4" /> Descuento</div></TableHead>
                    <TableHead className="text-center font-semibold text-muted-foreground"><div className="flex items-center justify-center gap-2"><CalendarDays className="w-4 h-4" /> Vigencia</div></TableHead>
                    <TableHead className="text-center font-semibold text-muted-foreground"><div className="flex items-center justify-center gap-2"><Activity className="w-4 h-4" /> Estado</div></TableHead>
                    <TableHead className="text-right font-semibold text-muted-foreground"><div className="flex items-center justify-end gap-2"><Settings2 className="w-4 h-4" /> Acciones</div></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <Ticket className="h-12 w-12 mb-4 text-muted/40" />
                                <p className="text-lg font-medium text-foreground">No hay promociones</p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    items.map((promo) => (
                        <TableRow key={promo.id}>
                            <TableCell className="font-mono font-bold text-primary">{promo.code || '—'}</TableCell>
                            <TableCell>
                                <div className="font-medium">{promo.name}</div>
                                <div className="text-xs text-muted-foreground">{promo.description || '—'}</div>
                            </TableCell>
                            <TableCell className="font-semibold">
                                {promo.discount_type === 'percentage'
                                    ? `${promo.discount_value}%`
                                    : formatBs(promo.discount_value || 0)}
                            </TableCell>
                            <TableCell className="text-center whitespace-nowrap text-sm">
                                {promo.starts_at} <br />
                                <span className="text-muted-foreground text-xs">hasta {promo.ends_at || 'Siempre'}</span>
                            </TableCell>
                            <TableCell className="text-center">
                                {promo.is_active ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Activo</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-gray-500">Inactivo</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(promo)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(promo)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Promociones" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {flash.success && (
                    <Alert>
                        <AlertDescription className="text-green-700">{flash.success}</AlertDescription>
                    </Alert>
                )}

                <div className="flex items-center justify-between mb-6">
                    <div />
                    <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Descuento
                    </Button>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Códigos de Descuento Activos</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {renderTable(promotions)}
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
                            <DialogTitle>{editingPromo ? 'Editar Promoción' : 'Nueva Promoción'}</DialogTitle>
                            <DialogDescription>
                                Los clientes podrán ingresar este código al realizar una reserva online.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">

                            {/* Basics */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="code">Código (Ej. VERANO24) *</Label>
                                    <Input
                                        id="code"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                        required
                                        maxLength={20}
                                        className="font-mono uppercase"
                                    />
                                    {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nombre Comercial *</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        required
                                        maxLength={100}
                                        placeholder="Promo Verano"
                                    />
                                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                                </div>
                            </div>

                            {/* Discount Type and Value */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="discount_type">Tipo de Descuento</Label>
                                    <Select
                                        value={data.discount_type || 'none'}
                                        onValueChange={(val) => setData('discount_type', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Sin Descuento (Evento)</SelectItem>
                                            <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                                            <SelectItem value="fixed_amount">Monto Fijo (Bs)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.discount_type && <p className="text-sm text-red-500">{errors.discount_type}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="discount_value">
                                        Valor ({data.discount_type === 'percentage' ? '%' : 'Bs'})
                                    </Label>
                                    <Input
                                        id="discount_value"
                                        type="number"
                                        min="0"
                                        step={data.discount_type === 'percentage' ? "0.01" : "0.5"}
                                        value={data.discount_value || ''}
                                        onChange={(e) => setData('discount_value', parseFloat(e.target.value) || 0)}
                                        disabled={data.discount_type === 'none'}
                                    />
                                    {errors.discount_value && <p className="text-sm text-red-500">{errors.discount_value}</p>}
                                </div>
                            </div>

                            {/* Banner Image */}
                            <div className="grid gap-2">
                                <Label htmlFor="banner_path">Banner o Imagen (Opcional)</Label>
                                {editingPromo?.banner_url && (
                                    <div className="mb-2">
                                        <img src={editingPromo.banner_url} alt="Banner" className="h-[200px] w-full object-cover rounded-lg shadow-md border border-border" />
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

                            {/* Limits */}
                            <div className="grid grid-cols-2 gap-4 bg-muted/50 p-3 rounded-lg border">
                                <div className="grid gap-2">
                                    <Label htmlFor="max_uses">Límite Global (Opcional)</Label>
                                    <Input
                                        id="max_uses"
                                        type="number"
                                        min="1"
                                        value={data.max_uses}
                                        onChange={(e) => setData('max_uses', e.target.value)}
                                        placeholder="Ej: 100 usos totales"
                                    />
                                    {errors.max_uses && <p className="text-sm text-red-500">{errors.max_uses}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="max_uses_per_user">Límite por Cliente (Opcional)</Label>
                                    <Input
                                        id="max_uses_per_user"
                                        type="number"
                                        min="1"
                                        value={data.max_uses_per_user}
                                        onChange={(e) => setData('max_uses_per_user', e.target.value)}
                                        placeholder="Ej: 1 por persona"
                                    />
                                    {errors.max_uses_per_user && <p className="text-sm text-red-500">{errors.max_uses_per_user}</p>}
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <Switch
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) => setData('is_active', checked)}
                                />
                                <Label htmlFor="is_active">Mantener promoción activa</Label>
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
