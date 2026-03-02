---
name: reservas-shadcn-ui
description: Use shadcn-ui (Radix UI + Tailwind CSS) for React components like tables, charts, dialogs, etc. in the Reservas project.
---

# reservas-shadcn-ui

This project uses **React**, **Inertia.js**, and **Tailwind CSS v4** alongside **Radix UI** primitives and **Recharts** to build modern, accessible, and beautiful user interfaces following the **shadcn-ui** design system philosophy.

## Guidelines for Tables
1. **Visual Hierarchy**: Use clean white backgrounds for tables, with subtle borders (`border-border`) and light hover effects (`hover:bg-muted/50`).
2. **Typography**: Use muted text (`text-muted-foreground`) for table headers, and primary text colors for data.
3. **Empty States**: If a table is empty, show a beautifully designed empty state with an icon (from `lucide-react`) and a prompt.
4. **Pagination**: Implement simple pagination controls at the bottom of the table.

## Guidelines for Charts
1. **Recharts**: We use `recharts` for data visualization. Use `ResponsiveContainer` to make them fluid.
2. **Colors**: Use custom CSS variables or Tailwind utility classes that adapt to dark/light mode for chart elements (e.g., `stroke="hsl(var(--primary))"`).
3. **Tooltips**: Style the default `recharts` tooltips to match the application's clean design system (rounded corners, subtle shadows).

## General UI Polish
- **Icons**: Always use `lucide-react` for icons.
- **Form Controls**: Use proper focus rings (`focus-visible:ring`) and transitions.
- **File Uploads**: When implementing file uploads (like image banners), ensure there's a visually appealing preview area, drag-and-drop feedback, and clear validation messages.

Ensure all components provide a "wow" factor by paying attention to micro-interactions, layout spacing, and typography.
