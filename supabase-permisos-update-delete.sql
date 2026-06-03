-- BackToMe - permisos temporales para actualizar/eliminar desde el frontend.
-- Ejecutar en Supabase SQL Editor si UPDATE/DELETE devuelve 0 filas afectadas.
--
-- IMPORTANTE:
-- Esta app autentica con la tabla public.usuario y localStorage, no con una
-- sesion real de Supabase Auth. Por eso, con RLS activo, Supabase ve estas
-- operaciones como rol anon. Estas politicas son utiles para el proyecto/demo,
-- pero en produccion deberias migrar a Supabase Auth y politicas por auth.uid().

alter table public.usuario enable row level security;
alter table public.publicaciones enable row level security;
alter table public.reportes enable row level security;
alter table public.imagenes_publicaciones enable row level security;
alter table public.imagenes_reportes enable row level security;

drop policy if exists "btm_anon_select_usuario" on public.usuario;
drop policy if exists "btm_anon_update_usuario" on public.usuario;
drop policy if exists "btm_anon_delete_usuario" on public.usuario;
create policy "btm_anon_select_usuario"
on public.usuario for select
to anon
using (true);
create policy "btm_anon_update_usuario"
on public.usuario for update
to anon
using (true)
with check (true);
create policy "btm_anon_delete_usuario"
on public.usuario for delete
to anon
using (true);

drop policy if exists "btm_anon_select_publicaciones" on public.publicaciones;
drop policy if exists "btm_anon_insert_publicaciones" on public.publicaciones;
drop policy if exists "btm_anon_update_publicaciones" on public.publicaciones;
drop policy if exists "btm_anon_delete_publicaciones" on public.publicaciones;
create policy "btm_anon_select_publicaciones"
on public.publicaciones for select
to anon
using (true);
create policy "btm_anon_insert_publicaciones"
on public.publicaciones for insert
to anon
with check (true);
create policy "btm_anon_update_publicaciones"
on public.publicaciones for update
to anon
using (true)
with check (true);
create policy "btm_anon_delete_publicaciones"
on public.publicaciones for delete
to anon
using (true);

drop policy if exists "btm_anon_select_reportes" on public.reportes;
drop policy if exists "btm_anon_insert_reportes" on public.reportes;
drop policy if exists "btm_anon_update_reportes" on public.reportes;
drop policy if exists "btm_anon_delete_reportes" on public.reportes;
create policy "btm_anon_select_reportes"
on public.reportes for select
to anon
using (true);
create policy "btm_anon_insert_reportes"
on public.reportes for insert
to anon
with check (true);
create policy "btm_anon_update_reportes"
on public.reportes for update
to anon
using (true)
with check (true);
create policy "btm_anon_delete_reportes"
on public.reportes for delete
to anon
using (true);

drop policy if exists "btm_anon_select_imagenes_publicaciones" on public.imagenes_publicaciones;
drop policy if exists "btm_anon_insert_imagenes_publicaciones" on public.imagenes_publicaciones;
drop policy if exists "btm_anon_delete_imagenes_publicaciones" on public.imagenes_publicaciones;
create policy "btm_anon_select_imagenes_publicaciones"
on public.imagenes_publicaciones for select
to anon
using (true);
create policy "btm_anon_insert_imagenes_publicaciones"
on public.imagenes_publicaciones for insert
to anon
with check (true);
create policy "btm_anon_delete_imagenes_publicaciones"
on public.imagenes_publicaciones for delete
to anon
using (true);

drop policy if exists "btm_anon_select_imagenes_reportes" on public.imagenes_reportes;
drop policy if exists "btm_anon_insert_imagenes_reportes" on public.imagenes_reportes;
drop policy if exists "btm_anon_delete_imagenes_reportes" on public.imagenes_reportes;
create policy "btm_anon_select_imagenes_reportes"
on public.imagenes_reportes for select
to anon
using (true);
create policy "btm_anon_insert_imagenes_reportes"
on public.imagenes_reportes for insert
to anon
with check (true);
create policy "btm_anon_delete_imagenes_reportes"
on public.imagenes_reportes for delete
to anon
using (true);
