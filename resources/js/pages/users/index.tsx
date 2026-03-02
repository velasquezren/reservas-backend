import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Mail, Phone, Settings2, Trash2, User as UserIcon, Shield, Users } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

type Props = {
    users: UserRes[];
};

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
        setData({
            name: user.name,
            email: user.email || '',
            phone: user.phone || '',
            password: '',
            password_confirmation: '',
        });
        clearErrors();
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingUser) {
            put(`/users/${editingUser.id}`, {
                onSuccess: () => setIsDialogOpen(false),
            });
        } else {
            post('/users', {
                onSuccess: () => setIsDialogOpen(false),
            });
        }
    };

    const handleDelete = (user: UserRes) => {
        if (confirm(`¿Estás seguro de eliminar a "${user.name}"? Esta acción no se puede deshacer.`)) {
            router.delete(`/users/${user.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Usuarios" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {flash.success && (
                    <Alert>
                        <AlertDescription className="text-green-700">{flash.success}</AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Administración de Usuarios</CardTitle>
                        <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                            <Shield className="mr-2 h-4 w-4" />
                            Nuevo Usuario
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-muted/50">
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><UserIcon className="w-4 h-4" /> Nombre</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</div></TableHead>
                                    <TableHead className="font-semibold text-muted-foreground"><div className="flex items-center gap-2"><Phone className="w-4 h-4" /> Teléfono</div></TableHead>
                                    <TableHead className="text-right font-semibold text-muted-foreground"><div className="flex items-center justify-end gap-2"><Settings2 className="w-4 h-4" /> Acciones</div></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <Users className="h-10 w-10 mb-3 text-muted/40" />
                                                <p className="text-base font-medium text-foreground">No hay usuarios registrados</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium text-primary">{user.name}</TableCell>
                                            <TableCell>{user.email || '—'}</TableCell>
                                            <TableCell>{user.phone || '—'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                                                        <Shield className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(user)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
                            <DialogDescription>
                                {editingUser ? 'Actualiza los datos y la contraseña si lo deseas.' : 'Crea una cuenta para que el usuario pueda acceder al sistema.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Teléfono (Opcional)</Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                />
                                {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">{editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    required={!editingUser}
                                />
                                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">Confirmar Contraseña</Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    required={!editingUser || data.password.length > 0}
                                />
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
