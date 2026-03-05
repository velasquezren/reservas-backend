import { useEffect, useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { es } from 'date-fns/locale';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, subMonths, addMonths, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarCheck, Clock, Users, ChevronRight, Loader2, ArrowRight } from 'lucide-react';

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

// Caché de Módulo para preservar el estado exacto (fechas y reservas) 
// entre navegaciones (clics en el Sidebar) de Inertia sin re-descargar de 0.
const globalCache = {
    date: new Date() as Date | undefined,
    month: new Date(),
    eventsByMonth: {} as Record<string, ReservationEvent[]>
};

export default function ReservationsCalendar() {
    const [date, setDateState] = useState<Date | undefined>(globalCache.date);
    const [month, setMonthState] = useState<Date>(globalCache.month);

    // Iniciamos con los eventos cacheados si existen para hacer una carga visual instantánea
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
                // Stale-while-revalidate: no ponemos loading a true porque ya tenemos datos
                setLoading(false);
            } else {
                setLoading(true);
            }

            try {
                // Optimización: Solo traemos las semanas visibles en la cuadrícula del mes actual
                // (incluyendo los días "grises" del final/principio usando startOfWeek y endOfWeek)
                // Esto reduce drásticamente el payload y el tiempo de respuesta vs traer 3 meses.
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
                console.error("Error fetching reservation events", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        // Debounce simple: por si el usuario presiona "Siguiente >" varias veces rápido, 
        // no le hacemos spam al servidor.
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

        // Pre-ordenamos los eventos de cada día por hora para evitar hacerlo en cada render
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

    // Extract dates that have events to pass them as modifiers
    const eventDates = useMemo(() => {
        return Object.keys(eventsByDate).map(dateStr => parseISO(dateStr));
    }, [eventsByDate]);

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
        }
    }), [eventsByDate]);

    return (
        <AppLayout breadcrumbs={[{ title: 'Calendario', href: '/reservations/calendar' }]}>
            <Head title="Calendario" />

            <div className="flex h-full flex-1 flex-col p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
                    <p className="text-muted-foreground mt-1">
                        Visualiza y gestiona las reservas organizadas por fecha.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Calendar View */}
                    <div className="flex justify-center w-full">
                        <Card className="shadow-xs w-full max-w-full overflow-hidden">
                            <CardContent className="p-4 md:p-6 pb-2">
                                <div className="flex justify-center">
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
                            </CardContent>
                        </Card>
                    </div>

                    {/* Events List */}
                    <div className="w-full">
                        <Card className="h-[700px] flex flex-col shadow-xs">
                            <CardHeader className="border-b bg-muted/20 pb-4">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <CalendarCheck className="h-5 w-5 text-primary" />
                                    Reservas del{' '}
                                    {date ? format(date, "d 'de' MMMM, yyyy", { locale: es }) : "Día"}
                                    {loading && <Loader2 className="h-4 w-4 ml-2 animate-spin text-muted-foreground" />}
                                </CardTitle>
                                <CardDescription>
                                    {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'reserva encontrada' : 'reservas encontradas'}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1 p-0 overflow-hidden relative">
                                <ScrollArea className={`h-[calc(700px-5rem)] transition-opacity duration-300 ${loading && selectedDateEvents.length === 0 ? 'opacity-50' : ''}`}>
                                    {selectedDateEvents.length > 0 ? (
                                        <div className="divide-y relative">
                                            {selectedDateEvents.map((ev) => (
                                                <button
                                                    key={ev.id}
                                                    type="button"
                                                    onClick={() => setSelectedReservation(ev)}
                                                    className="w-full text-left flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-6 hover:bg-muted/40 transition-colors group"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="mt-1 shrink-0 flex flex-col items-center">
                                                            <div className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-md flex items-center gap-1.5">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                {format(parseISO(ev.start), "HH:mm")}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-semibold text-base group-hover:text-primary transition-colors">
                                                                    {ev.title.split('|')[1]?.trim() || ev.title}
                                                                </h4>
                                                                <div
                                                                    className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.15)]"
                                                                    style={{ backgroundColor: ev.backgroundColor }}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                                <span className="flex items-center gap-1.5">
                                                                    <Users className="h-4 w-4 text-primary/70" />
                                                                    {ev.extendedProps.party_size} pax
                                                                </span>
                                                                <Badge variant="outline" className="capitalize text-xs font-normal">
                                                                    {getStatusLabel(ev.extendedProps.status)}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="hidden sm:flex text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                                                        <ChevronRight className="h-5 w-5" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 text-muted-foreground">
                                            {loading ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                                    <p>Consultando agenda...</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="bg-muted/50 p-4 rounded-full mb-4">
                                                        <CalendarCheck className="h-8 w-8 text-muted-foreground/70" />
                                                    </div>
                                                    <p className="text-lg font-medium text-foreground mb-1">Día libre</p>
                                                    <p className="text-sm">No tienes ninguna reserva agendada para esta fecha.</p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <Dialog open={!!selectedReservation} onOpenChange={(open) => !open && setSelectedReservation(null)}>
                <DialogContent className="sm:max-w-md">
                    {selectedReservation && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <div
                                        className="w-3 h-3 rounded-full shadow-sm"
                                        style={{ backgroundColor: selectedReservation.backgroundColor }}
                                    />
                                    Vista rápida de Reserva
                                </DialogTitle>
                                <DialogDescription>
                                    Detalles programados para el {format(parseISO(selectedReservation.start), "d 'de' MMMM, yyyy", { locale: es })}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-6 py-4">
                                <div className="flex flex-col gap-1 items-center justify-center py-6 bg-muted/30 rounded-lg border">
                                    <Clock className="h-8 w-8 text-primary mb-2 opacity-80" />
                                    <div className="text-3xl font-bold tracking-tight text-foreground">
                                        {format(parseISO(selectedReservation.start), "HH:mm")}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">A nombre de</p>
                                        <p className="text-base font-semibold">{selectedReservation.title.split('|')[1]?.trim() || 'Cliente Sin Nombre'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Tamaño de Grupo</p>
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-primary" />
                                            <span className="font-semibold">{selectedReservation.extendedProps.party_size} personas</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Estado</p>
                                        <Badge variant="outline" className="capitalize text-sm w-fit border-primary/20 bg-primary/5">
                                            {getStatusLabel(selectedReservation.extendedProps.status)}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSelectedReservation(null)}
                                >
                                    Cerrar
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setSelectedReservation(null);
                                        router.visit(selectedReservation.url);
                                    }}
                                    className="gap-2"
                                >
                                    Ver Detalles Completos <ArrowRight className="h-4 w-4" />
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
