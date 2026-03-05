import { Link } from '@inertiajs/react';
import { BookOpen, CalendarCheck, FolderOpen, LayoutGrid, Package2, Percent, Star, Users } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const navGroups = [
    {
        title: 'Panel',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutGrid,
            },
        ],
    },
    {
        title: 'Operaciones',
        items: [
            {
                title: 'Lista de Reservas',
                href: '/reservations',
                icon: CalendarCheck,
            },
            {
                title: 'Calendario',
                href: '/reservations/calendar',
                icon: CalendarCheck,
            },
        ],
    },
    {
        title: 'Catálogo',
        items: [
            {
                title: 'Categorías',
                href: '/categories',
                icon: FolderOpen,
            },
            {
                title: 'Ítems',
                href: '/items',
                icon: Package2,
            },
        ],
    },
    {
        title: 'Marketing',
        items: [
            {
                title: 'Promociones',
                href: '/promotions',
                icon: Percent,
            },
            {
                title: 'Eventos',
                href: '/events',
                icon: CalendarCheck,
            },
        ],
    },
    {
        title: 'Administración',
        items: [
            {
                title: 'Reseñas',
                href: '/reviews',
                icon: Star,
            },
            {
                title: 'Usuarios',
                href: '/users',
                icon: Users,
            },
        ],
    }
];

const footerNavItems: NavItem[] = [
    {
        title: 'Documentación',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {navGroups.map((group) => (
                    <NavMain key={group.title} title={group.title} items={group.items} />
                ))}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
