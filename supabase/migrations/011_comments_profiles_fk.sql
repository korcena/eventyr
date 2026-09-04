alter table public.todo_comments
  drop constraint if exists todo_comments_user_id_fkey;

alter table public.todo_comments
  add constraint todo_comments_user_id_fkey
  foreign key (user_id) references public.profiles(id)
  on delete cascade;