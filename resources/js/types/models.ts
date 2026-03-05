// ─── Domain Model Types ───────────────────────────────────────────────────────

export type Business = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    timezone: string;
    status: 'active' | 'inactive' | 'suspended';
    created_at: string;
    updated_at: string;
};

export type Category = {
    id: string;
    business_id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
    items_count?: number;
    created_at: string;
    updated_at: string;
};

export type Item = {
    id: string;
    business_id: string;
    category_id: string | null;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    type: 'reservable' | 'menu_item';
    status: 'active' | 'inactive' | 'draft';
    base_price: number; // centavos
    capacity: number | null;
    duration_minutes: number | null;
    sort_order: number;
    category?: Pick<Category, 'id' | 'name'> | null;
    created_at: string;
    updated_at: string;
};

export type ReservationUser = {
    id: string;
    name: string;
    phone: string;
};

export type Reservation = {
    id: string;
    user_id: string;
    item_id: string;
    business_id: string;
    confirmation_code: string;
    status: 'pending' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';
    source: 'app' | 'web' | 'walk_in' | 'phone';
    scheduled_date: string; // YYYY-MM-DD
    start_time: string;     // HH:MM
    duration_minutes: number;
    party_size: number;
    notes: string | null;
    total_amount: number;   // centavos
    discount_amount: number; // centavos
    confirmed_at: string | null;
    cancelled_at: string | null;
    completed_at: string | null;
    user?: ReservationUser | null;
    item?: Pick<Item, 'id' | 'name'> | null;
    created_at: string;
    updated_at: string;
};

export type Promotion = {
    id: string;
    business_id: string;
    name: string;
    description: string | null;
    code: string | null;
    discount_type: 'percentage' | 'fixed_amount' | null;
    discount_value: number | null;
    starts_at: string;
    ends_at: string | null;
    max_uses: number | null;
    max_uses_per_user: number | null;
    current_uses: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type Review = {
    id: string;
    reservation_id: string;
    user_id: string;
    business_id: string;
    rating: number;
    comment: string | null;
    status: 'pending' | 'published' | 'rejected';
    owner_reply: string | null;
    replied_at: string | null;
    user?: ReservationUser | null;
    reservation?: { confirmation_code: string } | null;
    created_at: string;
    updated_at: string;
};

// ─── Pagination ───────────────────────────────────────────────────────────────

export type PaginatedData<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type DashboardStats = {
    today_reservations: number;
    today_guests: number;
    pending: number;
    upcoming_confirmed: number;
    revenue_month: number; // centavos
    total_month: number;
    avg_rating: number;
};

export type TopClient = {
    user: { name: string; phone: string } | null;
    total_reservations: number;
    total_spent: number; // centavos
    total_guests: number;
    last_visit: string;
};
