import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import type { FormEventHandler } from 'react';
import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post('/user/confirm-password', {
            onFinish: () => {
                clearErrors();
            },
        });
    };

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
            <div className="flex w-full max-w-md flex-col gap-6">
                <div className="flex justify-center">
                    <AppLogo />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Confirmar Contraseña</CardTitle>
                        <CardDescription>
                            Esta es un área segura de la aplicación. Por favor, confirma tu contraseña antes de continuar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="password">Contraseña</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className="mt-1 block w-full"
                                    autoFocus
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                            </div>

                            <Button type="submit" className="w-full" disabled={processing}>
                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
