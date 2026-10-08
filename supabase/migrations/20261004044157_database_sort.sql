-- Saved sort for a database's views:
-- { "key": "<propertyId>" | "title" | "created_at" | "updated_at", "direction": "asc" | "desc" }
alter table public.databases add column sort jsonb;
