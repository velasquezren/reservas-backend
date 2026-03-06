import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Mail, Pencil, Phone, Plus, Shield, Trash2, Users, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Usuarios', href: '/users' },
];

type UserRes = {
    id: string;
    name: string;
    email: string;
    phone: string;
    created_at: string;
};

type Props = { users: UserRes[] };

export default function UsersIndex({ users }: Props) {
    const { flash } = usePage().props;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserRes | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
    });

    const openCreateDialog = () => {
        setEditingUser(null);
        reset();
        clearErrors();
        setIsDialogOpen(true);
    };

    const openEditDialog = (user: UserRes) => {
        setEditingUser(user);
        setData({ name: user.name, email: user.email || '', phone: user.phone || '', password: '', password_confirmation: '' });
        clearErrors();
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            put(`/users/${editingUser.id}`, { onSuccess: () => setIsDialogOpen(false) });
        } else {
            post('/users', { onSuccess: () => setIsDialogOpen(false) });
        }
    };

    const handleDelete = (user: UserRes) => {
        if (confirm(`¿Eliminar a "${user.name}"? Esta acción no se puede deshacer.`)) {
            router.delete(`/users/${user.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Usuarios" />

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
                            <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Usuarios</h1>
                            <p className="text-sm text-muted-foreground">Administra las cuentas de acceso al sistema.</p>
                        </div>
                    </div>
                    <Button onClick={openCreateDialog} className="mt-3 gap-2 self-start sm:mt-0 sm:self-auto">
                        <Plus className="h-4 w-4" /> Nuevo Usuario
                    </Button>
                </div>

                {/* Table */}
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5" /> Email
                                    </div>
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5" /> Teléfono
                                    </div>
                                </TableHead>
                                <TableHead className="w-20 text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4}>
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed mb-3">
                                                <Users className="h-5 w-5 text-muted-foreground/60" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">Sin usuarios</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Crea el primero para comenzar.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id} className="group">
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{user.email || <span className="italic text-muted-foreground/50">—</span>}</TableCell>
                                        <TableCell className="text-muted-foreground">{user.phone || <span className="italic text-muted-foreground/50">—</span>}</TableCell>
                                        <TableCell className="text-right">
                                            <TooltipProvider delayDuration={300}>
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(user)}>
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
                                                                onClick={() => handleDelete(user)}
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
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                                    <UserPlus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
                                    <DialogDescription>
                                        {editingUser
                                            ? 'Actualiza los datos y la contraseña si lo deseas.'
                                            : 'Crea una cuenta para que acceder al sistema.'}
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
                                    autoFocus
                                    required
                                />
                                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    Email{' '}
                                    <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="phone">
                                    Teléfono{' '}
                                    <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                                </Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                />
                                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    {editingUser ? (
                                        <>Nueva contraseña <span className="text-xs font-normal text-muted-foreground">(opcional)</span></>
                                    ) : (
                                        <>Contraseña <span className="text-destructive">*</span></>
                                    )}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    required={!editingUser}
                                />
                                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">Confirmar contraseña</Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    required={!editingUser || data.password.length > 0}
                                />
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={processing}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Guardando…' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
