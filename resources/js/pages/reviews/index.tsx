import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Check, MessageSquare, Star, X } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Review } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Reseñas', href: '/reviews' },
];

type Props = {
    reviews: Pick<Review, 'id' | 'rating' | 'comment' | 'status' | 'owner_reply' | 'replied_at' | 'user' | 'reservation' | 'created_at'>[];
};

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
                />
            ))}
        </div>
    );
}

export default function ReviewsIndex({ reviews }: Props) {
    const { flash } = usePage().props;
    const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Props['reviews'][0] | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        reply: '',
    });

    const handleAction = (id: string, action: 'approve' | 'reject') => {
        const message = action === 'approve'
            ? '¿Estás seguro de publicar esta reseña en tu perfil?'
            : '¿Ocultar esta reseña?';

        if (confirm(message)) {
            router.patch(`/reviews/${id}/${action}`, {}, { preserveScroll: true });
        }
    };

    const openReplyDialog = (review: Props['reviews'][0]) => {
        setReplyingTo(review);
        setData('reply', review.owner_reply || '');
        setIsReplyDialogOpen(true);
    };

    const submitReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (replyingTo) {
            post(`/reviews/${replyingTo.id}/reply`, {
                onSuccess: () => {
                    setIsReplyDialogOpen(false);
                    reset();
                }
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reseñas de Clientes" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {flash.success && (
                    <Alert>
                        <AlertDescription className="text-green-700">{flash.success}</AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Moderación de Reseñas</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Calificación</TableHead>
                                    <TableHead className="w-1/3">Comentario</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reviews.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                            No hay reseñas registradas aún.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reviews.map((review: any) => (
                                        <TableRow key={review.id}>
                                            <TableCell className="whitespace-nowrap text-sm">{review.created_at}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{review.user?.name ?? '—'}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Reserva: <span className="font-mono">{review.reservation?.confirmation_code ?? '—'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <StarRating rating={review.rating} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm italic text-gray-700">"{review.comment || 'Sin comentario dejado.'}"</div>
                                                {review.owner_reply && (
                                                    <div className="mt-2 bg-gray-50 p-2 rounded-md border text-xs">
                                                        <span className="font-semibold block text-primary mb-1">Tu respuesta:</span>
                                                        {review.owner_reply}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {review.status === 'pending' && <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pendiente</Badge>}
                                                {review.status === 'published' && <Badge className="bg-green-100 text-green-800 border-green-200">Publicado</Badge>}
                                                {review.status === 'rejected' && <Badge className="bg-red-100 text-red-800 border-red-200">Oculto</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {review.status === 'pending' && (
                                                        <>
                                                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleAction(review.id, 'approve')} title="Aprobar y Mostrar">
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleAction(review.id, 'reject')} title="Rechazar y Ocultar">
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button size="sm" variant="secondary" onClick={() => openReplyDialog(review)}>
                                                        <MessageSquare className="h-4 w-4 mr-2" />
                                                        {review.owner_reply ? 'Editar Resp.' : 'Responder'}
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

            {/* Reply Modal */}
            <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={submitReply}>
                        <DialogHeader>
                            <DialogTitle>Responder a este Cliente</DialogTitle>
                            <DialogDescription>
                                Tu respuesta será pública si la reseña es aprobada. Úsala para agradecer o resolver problemas.
                            </DialogDescription>
                        </DialogHeader>

                        {replyingTo && (
                            <div className="my-4 p-3 bg-muted rounded-md text-sm border">
                                <StarRating rating={replyingTo.rating} />
                                <p className="mt-2 text-muted-foreground italic">"{replyingTo.comment}"</p>
                            </div>
                        )}

                        <div className="grid gap-4 py-4">
                            <Textarea
                                value={data.reply}
                                onChange={(e: any) => setData('reply', e.target.value)}
                                placeholder="Escribe tu respuesta aquí..."
                                rows={5}
                                required
                            />
                            {errors.reply && <p className="text-sm text-red-500">{errors.reply}</p>}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsReplyDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Enviando...' : 'Guardar Respuesta'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
