import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Check, MessageSquare, Star, X, Star as StarIcon } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
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
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`h-3.5 w-3.5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`}
                />
            ))}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'pending') return <Badge className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">Pendiente</Badge>;
    if (status === 'published') return <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">Publicado</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">Oculto</Badge>;
}

export default function ReviewsIndex({ reviews }: Props) {
    const { flash } = usePage().props;
    const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Props['reviews'][0] | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({ reply: '' });

    const handleAction = (id: string, action: 'approve' | 'reject') => {
        const message = action === 'approve'
            ? '¿Publicar esta reseña en tu perfil?'
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
                onSuccess: () => { setIsReplyDialogOpen(false); reset(); },
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reseñas de Clientes" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">

                {/* Flash */}
                {flash.success && (
                    <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {/* Page Header */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                        <StarIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Reseñas</h1>
                        <p className="text-sm text-muted-foreground">Modera y responde las opiniones de tus clientes.</p>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-lg border">
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
                                    <TableCell colSpan={6}>
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed mb-3">
                                                <StarIcon className="h-5 w-5 text-muted-foreground/60" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">Sin reseñas</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Aún no has recibido opiniones de clientes.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                reviews.map((review: any) => (
                                    <TableRow key={review.id} className="group">
                                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{review.created_at}</TableCell>
                                        <TableCell>
                                            <div className="font-medium text-sm">{review.user?.name ?? '—'}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Reserva: <span className="font-mono">{review.reservation?.confirmation_code ?? '—'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StarRating rating={review.rating} />
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm italic text-muted-foreground">"{review.comment || 'Sin comentario.'}"</div>
                                            {review.owner_reply && (
                                                <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
                                                    <span className="font-semibold text-primary block mb-1">Tu respuesta:</span>
                                                    {review.owner_reply}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <StatusBadge status={review.status} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <TooltipProvider delayDuration={300}>
                                                <div className="flex justify-end gap-1">
                                                    {review.status === 'pending' && (
                                                        <>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                                        onClick={() => handleAction(review.id, 'approve')}
                                                                    >
                                                                        <Check className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Aprobar y publicar</TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        onClick={() => handleAction(review.id, 'reject')}
                                                                    >
                                                                        <X className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Rechazar y ocultar</TooltipContent>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8"
                                                                onClick={() => openReplyDialog(review)}
                                                            >
                                                                <MessageSquare className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{review.owner_reply ? 'Editar respuesta' : 'Responder'}</TooltipContent>
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

            {/* Reply Dialog */}
            <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
                <DialogContent className="sm:max-w-[440px]">
                    <form onSubmit={submitReply}>
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                    <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <DialogTitle>Responder al cliente</DialogTitle>
                                    <DialogDescription>
                                        Tu respuesta será pública si la reseña está aprobada.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <Separator className="my-4" />

                        {replyingTo && (
                            <div className="mb-4 rounded-lg border bg-muted/40 p-3">
                                <StarRating rating={replyingTo.rating} />
                                <p className="mt-2 text-sm italic text-muted-foreground">"{replyingTo.comment}"</p>
                            </div>
                        )}

                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="reply">
                                    Tu respuesta <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="reply"
                                    value={data.reply}
                                    onChange={(e: any) => setData('reply', e.target.value)}
                                    placeholder="Escribe tu respuesta aquí…"
                                    className="resize-none"
                                    rows={5}
                                    required
                                />
                                {errors.reply && <p className="text-xs text-destructive">{errors.reply}</p>}
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsReplyDialogOpen(false)} disabled={processing}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Guardando…' : 'Guardar respuesta'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
