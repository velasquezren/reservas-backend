import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Tag, CalendarDays, Activity, Percent, Settings2, Ticket,
    Pencil, Plus, Trash2, Hash, Copy, Check, Eye, Image, Zap, BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Promotion } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Promociones', href: '/promotions' },
];

type PromoRow = Pick<
    Promotion,
    'id' | 'name' | 'description' | 'code' | 'discount_type' | 'discount_value' |
    'starts_at' | 'ends_at' | 'max_uses' | 'max_uses_per_user' | 'current_uses' | 'is_active'
> & { banner_url?: string | null };

type Stats = {
    total: number;
    active: number;
    total_uses: number;
    with_banner: number;
};

type Props = {
    promotions: PromoRow[];
    stats: Stats;
    banners: { id: string; name: string; url: string }[];
};

function formatBs(centavos: number) {
    return `Bs ${(centavos / 100).toFixed(2)}`;
}

function isExpired(promo: PromoRow) {
    return !!promo.ends_at && promo.ends_at < new Date().toISOString().split('T')[0];
}

function UsageBar({ current, max }: { current: number; max: number | null }) {
    if (!max) return <span className="text-sm font-medium">{current} usos</span>;
    const pct = Math.min((current / max) * 100, 100);
    const color = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-400' : 'bg-green-500';
    return (
        <div className="flex flex-col gap-1 min-w-[90px]">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{current}</span>
                <span>{max}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function CopyButton({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };
    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={copy}
                        className="ml-1.5 inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                </TooltipTrigger>
                <TooltipContent>{copied ? 'Copiado' : 'Copiar cÃ³digo'}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export default function PromotionsIndex({ promotions, stats, banners }: Props) {
    const { flash } = usePage().props;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [bannerViewer, setBannerViewer] = useState<string | null>(null);
    const [editingPromo, setEditingPromo] = useState<PromoRow | null>(null);

    const { data, setData, processing, errors, reset, clearErrors } = useForm({
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

    const openEditDialog = (promo: PromoRow) => {
        setEditingPromo(promo);
        setData({
            name: promo.name,
            description: promo.description || '',
            code: promo.code || '',
            discount_type: promo.discount_type || 'percentage',
            discount_value: promo.discount_type === 'fixed_amount'
                ? (promo.discount_value || 0) / 100
                : (promo.discount_value || 0),
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
            discount_value: data.discount_type === 'fixed_amount'
                ? Math.round((data.discount_value || 0) * 100)
                : data.discount_value,
            max_uses: data.max_uses === '' ? null : parseInt(data.max_uses as string),
            max_uses_per_user: data.max_uses_per_user === '' ? null : parseInt(data.max_uses_per_user as string),
            ends_at: data.ends_at === '' ? null : data.ends_at,
        };
        if (editingPromo) {
            router.post(`/promotions/${editingPromo.id}`, { _method: 'put', ...payload }, {
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

    const handleDelete = (promo: PromoRow) => {
        if (confirm(`Â¿EstÃ¡s seguro de eliminar "${promo.name}"?`)) {
            router.delete(`/promotions/${promo.id}`);
        }
    };

    const today = new Date().toISOString().split('T')[0];
    const filtered = {
        all: promotions,
        active: promotions.filter(p => p.is_active && (!p.ends_at || p.ends_at >= today)),
        inactive: promotions.filter(p => !p.is_active && (!p.ends_at || p.ends_at >= today)),
        expired: promotions.filter(p => !!p.ends_at && p.ends_at < today),
    };

    const renderTable = (items: PromoRow[]) => (
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-muted/50">
                    <TableHead className="font-semibold text-muted-foreground">
                        <div className="flex items-center gap-2"><Hash className="w-4 h-4" /> CÓDIGO</div>
                    </TableHead>
                    <TableHead className="font-semibold text-muted-foreground">
                        <div className="flex items-center gap-2"><Tag className="w-4 h-4" /> Nombre / Detalle</div>
                    </TableHead>
                    <TableHead className="font-semibold text-muted-foreground">
                        <div className="flex items-center gap-2"><Percent className="w-4 h-4" /> Descuento</div>
                    </TableHead>
                    <TableHead className="text-center font-semibold text-muted-foreground">
                        <div className="flex items-center justify-center gap-2"><CalendarDays className="w-4 h-4" /> Vigencia</div>
                    </TableHead>
                    <TableHead className="font-semibold text-muted-foreground">
                        <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Uso</div>
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
                        <TableCell colSpan={7} className="h-48 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <Ticket className="h-10 w-10 mb-3 opacity-30" />
                                <p className="text-base font-medium text-foreground">Sin resultados</p>
                                <p className="text-sm">No hay promociones en esta categoría.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    items.map((promo) => {
                        const expired = isExpired(promo);
                        return (
                            <TableRow key={promo.id} className={`group ${expired ? 'opacity-60' : ''}`}>
                                <TableCell>
                                    <div className="flex items-center font-mono font-bold text-primary">
                                        {promo.code || 'â€”'}
                                        {promo.code && <CopyButton code={promo.code} />}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {promo.banner_url && (
                                            <button onClick={() => setBannerViewer(promo.banner_url!)}>
                                                <img
                                                    src={promo.banner_url}
                                                    alt=""
                                                    className="h-8 w-12 rounded object-cover border hover:scale-110 transition-transform"
                                                />
                                            </button>
                                        )}
                                        <div>
                                            <div className="font-medium">{promo.name}</div>
                                            {promo.description && (
                                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {promo.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="font-semibold">
                                    {promo.discount_type === 'percentage' && `${promo.discount_value}%`}
                                    {promo.discount_type === 'fixed_amount' && formatBs(promo.discount_value || 0)}
                                    {!promo.discount_type && (
                                        <span className="text-muted-foreground text-xs">Evento / Sin descuento</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center text-sm whitespace-nowrap">
                                    <span>{promo.starts_at}</span>
                                    <br />
                                    <span className="text-muted-foreground text-xs">
                                        hasta {promo.ends_at || 'siempre'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <UsageBar current={promo.current_uses} max={promo.max_uses} />
                                </TableCell>
                                <TableCell className="text-center">
                                    {expired ? (
                                        <Badge variant="outline" className="text-gray-400 border-gray-300">Expirada</Badge>
                                    ) : promo.is_active ? (
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Activa</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-gray-500">Inactiva</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <TooltipProvider delayDuration={300}>
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {promo.banner_url && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBannerViewer(promo.banner_url!)}>
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Ver banner</TooltipContent>
                                                </Tooltip>
                                            )}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(promo)}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Editar</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(promo)}>
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
            <Head title="Promociones" />

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
                            <Tag className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Promociones</h1>
                            <p className="text-sm text-muted-foreground">Gestiona descuentos, códigos promocionales y banners.</p>
                        </div>
                    </div>
                    <Button onClick={openCreateDialog} className="mt-3 gap-2 self-start sm:mt-0 sm:self-auto">
                        <Plus className="h-4 w-4" /> Nueva Promoción
                    </Button>
                </div>

                {/* Stat Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { label: 'Total creadas', value: stats.total, icon: Tag, bg: 'bg-violet-100 dark:bg-violet-900/30', color: 'text-violet-600 dark:text-violet-400' },
                        { label: 'Activas ahora', value: stats.active, icon: Zap, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'Usos totales', value: stats.total_uses, icon: BarChart3, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
                        { label: 'Con banner', value: stats.with_banner, icon: Image, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' },
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

                <Card>
                    <CardHeader>
                        <CardTitle>Listado de Promociones</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Tabs defaultValue="all" className="w-full">
                            <TabsList className="mx-4 mb-0 mt-1">
                                <TabsTrigger value="all">
                                    Todas <Badge variant="secondary" className="ml-1.5">{filtered.all.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="active">
                                    Activas <Badge variant="secondary" className="ml-1.5 bg-green-100 text-green-700">{filtered.active.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="inactive">
                                    Inactivas <Badge variant="secondary" className="ml-1.5">{filtered.inactive.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="expired">
                                    Expiradas <Badge variant="secondary" className="ml-1.5">{filtered.expired.length}</Badge>
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="all" className="mt-0">{renderTable(filtered.all)}</TabsContent>
                            <TabsContent value="active" className="mt-0">{renderTable(filtered.active)}</TabsContent>
                            <TabsContent value="inactive" className="mt-0">{renderTable(filtered.inactive)}</TabsContent>
                            <TabsContent value="expired" className="mt-0">{renderTable(filtered.expired)}</TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
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
                <DialogContent className="sm:max-w-[520px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                                    <Ticket className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                                </div>
                                <div>
                                    <DialogTitle>{editingPromo ? 'Editar Promoción' : 'Nueva Promoción'}</DialogTitle>
                                    <DialogDescription>
                                        Los clientes podrán usar este código al realizar una reserva online.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <Separator className="my-4" />

                        <div className="grid gap-4">
                            {/* Code + Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="code">Código (Ej. VERANO24) <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="code"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                        required
                                        maxLength={20}
                                        className="font-mono uppercase"
                                    />
                                    {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nombre Comercial <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        required
                                        maxLength={100}
                                        placeholder="Promo Verano"
                                    />
                                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="grid gap-2">
                                <Label htmlFor="description">Descripción (Opcional)</Label>
                                <Input
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Ej: Válido fines de semana de verano"
                                />
                            </div>

                            {/* Discount Type + Value */}
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
                                    {errors.discount_type && <p className="text-xs text-destructive">{errors.discount_type}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="discount_value">
                                        Valor ({data.discount_type === 'percentage' ? '%' : 'Bs'})
                                    </Label>
                                    <Input
                                        id="discount_value"
                                        type="number"
                                        min="0"
                                        step={data.discount_type === 'percentage' ? '0.01' : '0.5'}
                                        value={data.discount_value || ''}
                                        onChange={(e) => setData('discount_value', parseFloat(e.target.value) || 0)}
                                        disabled={!data.discount_type || data.discount_type === 'none'}
                                    />
                                    {errors.discount_value && <p className="text-xs text-destructive">{errors.discount_value}</p>}
                                </div>
                            </div>

                            {/* Banner */}
                            <div className="grid gap-2">
                                <Label htmlFor="banner_path">Banner o Imagen (Opcional)</Label>
                                {editingPromo?.banner_url && (
                                    <img
                                        src={editingPromo.banner_url}
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
                                {errors.banner_path && <p className="text-xs text-destructive">{errors.banner_path}</p>}
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
                                    {errors.starts_at && <p className="text-xs text-destructive">{errors.starts_at}</p>}
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

                            {/* Usage limits */}
                            <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/40 p-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="max_uses">Límite Global (Opcional)</Label>
                                    <Input
                                        id="max_uses"
                                        type="number"
                                        min="1"
                                        value={data.max_uses}
                                        onChange={(e) => setData('max_uses', e.target.value)}
                                        placeholder="Ej: 100"
                                    />
                                    {errors.max_uses && <p className="text-sm text-red-500">{errors.max_uses}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="max_uses_per_user">Límite por Cliente</Label>
                                    <Input
                                        id="max_uses_per_user"
                                        type="number"
                                        min="1"
                                        value={data.max_uses_per_user}
                                        onChange={(e) => setData('max_uses_per_user', e.target.value)}
                                        placeholder="Ej: 1"
                                    />
                                    {errors.max_uses_per_user && <p className="text-sm text-red-500">{errors.max_uses_per_user}</p>}
                                </div>
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center gap-3 pt-1">
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
