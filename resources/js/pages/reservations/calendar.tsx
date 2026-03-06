import { useEffect, useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { es } from 'date-fns/locale';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarCheck, Clock, Users, ChevronRight, Loader2, ArrowRight, CalendarDays } from 'lucide-react';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Reservaciones', href: '/reservations' },
    { title: 'Calendario', href: '/reservations/calendar' },
];

interface ReservationEvent {
    id: number;
    title: string;
    start: string;
    backgroundColor: string;
    textColor: string;
    url: string;
    extendedProps: {
        status: string;
        party_size: number;
    };
}

// Caché de módulo para preservar el estado entre navegaciones de Inertia
const globalCache = {
    date: new Date() as Date | undefined,
    month: new Date(),
    eventsByMonth: {} as Record<string, ReservationEvent[]>,
};

export default function ReservationsCalendar() {
    const [date, setDateState] = useState<Date | undefined>(globalCache.date);
    const [month, setMonthState] = useState<Date>(globalCache.month);

    const currentMonthKey = format(month, 'yyyy-MM');
    const [events, setEvents] = useState<ReservationEvent[]>(globalCache.eventsByMonth[currentMonthKey] || []);
    const [loading, setLoading] = useState(!globalCache.eventsByMonth[currentMonthKey]);
    const [selectedReservation, setSelectedReservation] = useState<ReservationEvent | null>(null);

    const setDate = (newDate: Date | undefined) => {
        globalCache.date = newDate;
        setDateState(newDate);
    };

    const setMonth = (newMonth: Date) => {
        globalCache.month = newMonth;
        setMonthState(newMonth);
    };

    useEffect(() => {
        let isMounted = true;
        const fetchEvents = async () => {
            const monthKey = format(month, 'yyyy-MM');

            if (globalCache.eventsByMonth[monthKey]) {
                setEvents(globalCache.eventsByMonth[monthKey]);
                setLoading(false);
            } else {
                setLoading(true);
            }

            try {
                const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
                const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });

                const response = await fetch(`/reservations/api-events?start=${start.toISOString()}&end=${end.toISOString()}`);
                if (!response.ok) throw new Error('Api request failed');

                const data = await response.json();
                if (isMounted) {
                    globalCache.eventsByMonth[monthKey] = data;
                    setEvents(data);
                }
            } catch (error) {
                console.error('Error fetching reservation events', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchEvents, 300);
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [month]);

    const eventsByDate = useMemo(() => {
        const map: Record<string, ReservationEvent[]> = {};
        events.forEach(e => {
            const dateKey = e.start.split('T')[0];
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(e);
        });
        Object.values(map).forEach(dayList => {
            dayList.sort((a, b) => a.start.localeCompare(b.start));
        });
        return map;
    }, [events]);

    const getEventsForDay = (dayDate: Date) => {
        const dateKey = format(dayDate, 'yyyy-MM-dd');
        return eventsByDate[dateKey] || [];
    };

    const selectedDateEvents = useMemo(() => {
        if (!date) return [];
        return getEventsForDay(date);
    }, [date, eventsByDate]);

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pending: 'Pendiente',
            confirmed: 'Confirmada',
            completed: 'Completada',
            cancelled: 'Cancelada',
            no_show: 'No Show',
        };
        return labels[status] || status;
    };

    const getStatusVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
        const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
            confirmed: 'default',
            completed: 'secondary',
            cancelled: 'destructive',
            no_show: 'destructive',
            pending: 'outline',
        };
        return variants[status] || 'outline';
    };

    const calendarComponents = useMemo(() => ({
        DayButton: (props: any) => {
            const { day, modifiers } = props;
            const dateKey = format(day.date, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[dateKey] || [];

            return (
                <CalendarDayButton {...props}>
                    {props.children}
                    {dayEvents.length > 0 && (
                        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center items-center gap-0.5 pointer-events-none">
                            {dayEvents.slice(0, 4).map((ev: any, i: number) => (
                                <div
                                    key={i}
                                    className={`w-1.5 h-1.5 rounded-full ${modifiers.selected ? 'opacity-80' : 'shadow-sm'}`}
                                    style={{ backgroundColor: modifiers.selected ? 'currentColor' : ev.backgroundColor }}
                                />
                            ))}
                            {dayEvents.length > 4 && (
                                <span
                                    className="text-[9px] font-bold leading-none -mt-0.5"
                                    style={{ color: modifiers.selected ? 'currentColor' : 'var(--muted-foreground)' }}
                                >
                                    +
                                </span>
                            )}
                        </div>
                    )}
                </CalendarDayButton>
            );
        },
    }), [eventsByDate]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Calendario" />

            <div className="flex h-full flex-1 flex-col p-4 md:p-6 gap-6">

                {/* Page Header */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                        <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Calendario de Reservas</h1>
                        <p className="text-sm text-muted-foreground">
                            Visualiza y gestiona las reservas organizadas por fecha.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                    {/* ── Panel Calendario ── */}
                    <div className="rounded-lg border overflow-hidden">
                        {/* Mini-header del panel */}
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <div>
                                <p className="text-sm font-medium">
                                    {format(month, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {events.length > 0
                                        ? `${events.length} reserva${events.length !== 1 ? 's' : ''} este mes`
                                        : 'Sin reservas este mes'}
                                </p>
                            </div>
                            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </div>
                        <div className="p-4 md:p-6 pb-4 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                month={month}
                                onMonthChange={setMonth}
                                locale={es}
                                className="rounded-md mx-auto [--cell-size:3.5rem] sm:[--cell-size:4.5rem] lg:[--cell-size:5rem]"
                                components={calendarComponents}
                            />
                        </div>
                    </div>

                    {/* ── Panel de Reservas del Día ── */}
                    <div className="rounded-lg border overflow-hidden flex flex-col h-[700px]">
                        {/* Header del panel */}
                        <div className="shrink-0 flex items-start justify-between gap-2 px-4 py-3 border-b">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <CalendarCheck className="h-4 w-4 shrink-0 text-primary" />
                                    <p className="text-sm font-medium truncate">
                                        {date
                                            ? format(date, "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())
                                            : 'Selecciona un día'}
                                    </p>
                                    {loading && (
                                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                                    )}
                                </div>
                                {date && !loading && (
                                    <p className="text-xs text-muted-foreground mt-0.5 pl-6">
                                        {selectedDateEvents.length === 0
                                            ? 'Sin reservas para este día'
                                            : `${selectedDateEvents.length} reserva${selectedDateEvents.length !== 1 ? 's' : ''} encontrada${selectedDateEvents.length !== 1 ? 's' : ''}`}
                                    </p>
                                )}
                            </div>
                            {selectedDateEvents.length > 0 && (
                                <Badge variant="secondary" className="shrink-0 tabular-nums">
                                    {selectedDateEvents.length}
                                </Badge>
                            )}
                        </div>

                        {/* Lista de reservas */}
                        <ScrollArea
                            className={`flex-1 transition-opacity duration-300 ${loading && selectedDateEvents.length === 0 ? 'opacity-40' : 'opacity-100'}`}
                        >
                            {selectedDateEvents.length > 0 ? (
                                <div className="divide-y">
                                    {selectedDateEvents.map((ev) => (
                                        <button
                                            key={ev.id}
                                            type="button"
                                            onClick={() => setSelectedReservation(ev)}
                                            className="w-full text-left flex items-center justify-between p-4 md:px-6 hover:bg-muted/40 transition-colors group"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                {/* Hora */}
                                                <div
                                                    className="shrink-0 flex flex-col items-center justify-center h-12 w-12 rounded-lg text-xs font-semibold border"
                                                    style={{
                                                        borderColor: ev.backgroundColor + '40',
                                                        backgroundColor: ev.backgroundColor + '15',
                                                        color: ev.backgroundColor,
                                                    }}
                                                >
                                                    <Clock className="h-3 w-3 mb-0.5 opacity-70" />
                                                    {format(parseISO(ev.start), "HH:mm")}
                                                </div>

                                                {/* Info */}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h4 className="font-medium text-sm leading-none group-hover:text-primary transition-colors truncate">
                                                            {ev.title.split('|')[1]?.trim() || ev.title}
                                                        </h4>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <Users className="h-3 w-3" />
                                                            {ev.extendedProps.party_size} pax
                                                        </span>
                                                        <Badge
                                                            variant={getStatusVariant(ev.extendedProps.status)}
                                                            className="text-[10px] px-1.5 py-0 h-4 font-normal capitalize"
                                                        >
                                                            {getStatusLabel(ev.extendedProps.status)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all -translate-x-1 group-hover:translate-x-0" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-8">
                                    {loading ? (
                                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                                            <p className="text-sm">Consultando agenda…</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed">
                                                <CalendarCheck className="h-6 w-6 text-muted-foreground/60" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">Día libre</p>
                                                <p className="text-xs mt-0.5">No hay reservas agendadas para esta fecha.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </div>

            {/* ── Quick View Dialog ── */}
            <Dialog open={!!selectedReservation} onOpenChange={(open) => !open && setSelectedReservation(null)}>
                <DialogContent className="sm:max-w-md">
                    {selectedReservation && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <div
                                        className="h-3 w-3 rounded-full shrink-0"
                                        style={{ backgroundColor: selectedReservation.backgroundColor }}
                                    />
                                    Vista rápida
                                </DialogTitle>
                                <DialogDescription>
                                    {format(parseISO(selectedReservation.start), "EEEE d 'de' MMMM, yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                                </DialogDescription>
                            </DialogHeader>

                            <Separator />

                            <div className="grid gap-4 py-2">
                                {/* Time Hero */}
                                <div
                                    className="flex flex-col items-center justify-center py-5 rounded-lg border"
                                    style={{
                                        borderColor: selectedReservation.backgroundColor + '30',
                                        backgroundColor: selectedReservation.backgroundColor + '08',
                                    }}
                                >
                                    <Clock
                                        className="h-5 w-5 mb-2"
                                        style={{ color: selectedReservation.backgroundColor }}
                                    />
                                    <div
                                        className="text-4xl font-bold tracking-tight tabular-nums"
                                        style={{ color: selectedReservation.backgroundColor }}
                                    >
                                        {format(parseISO(selectedReservation.start), "HH:mm")}
                                    </div>
                                </div>

                                {/* Detail grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                                        <p className="text-xs text-muted-foreground">A nombre de</p>
                                        <p className="text-sm font-semibold leading-snug">
                                            {selectedReservation.title.split('|')[1]?.trim() || 'Sin nombre'}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                                        <p className="text-xs text-muted-foreground">Grupo</p>
                                        <div className="flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5 text-primary" />
                                            <span className="text-sm font-semibold">
                                                {selectedReservation.extendedProps.party_size} personas
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1 col-span-2">
                                        <p className="text-xs text-muted-foreground">Estado</p>
                                        <Badge
                                            variant={getStatusVariant(selectedReservation.extendedProps.status)}
                                            className="capitalize text-xs"
                                        >
                                            {getStatusLabel(selectedReservation.extendedProps.status)}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <DialogFooter className="gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSelectedReservation(null)}
                                >
                                    Cerrar
                                </Button>
                                <Button
                                    type="button"
                                    className="gap-2"
                                    onClick={() => {
                                        setSelectedReservation(null);
                                        router.visit(selectedReservation.url);
                                    }}
                                >
                                    Ver detalles
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}