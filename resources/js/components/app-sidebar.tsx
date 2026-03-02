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

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Reservas',
        href: '/reservations',
        icon: CalendarCheck,
    },
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
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
