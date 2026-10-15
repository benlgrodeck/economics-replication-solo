-- Run once in a dedicated Supabase project's SQL editor.
-- Only safe public scores are exposed through the two RPC functions.
create schema if not exists quiz_private;
revoke all on schema quiz_private from public, anon, authenticated;
create table if not exists quiz_private.answer_key (
 question_number integer primary key, study_id text unique not null, replicated boolean not null
);
insert into quiz_private.answer_key values
(1, 'abeler', false),
(2, 'ambrus', true),
(3, 'bartling', true),
(4, 'charness', true),
(5, 'chen', false),
(6, 'declippel', true),
(7, 'duffy', false),
(8, 'dulleck', true),
(9, 'ericson', false),
(10, 'fehr', true),
(11, 'friedman', true),
(12, 'fudenberg', true),
(13, 'huck', false),
(14, 'ifcher', false),
(15, 'kessler', true),
(16, 'kirchler', true),
(17, 'kogan', true),
(18, 'kuziemko', false)
on conflict (question_number) do update set study_id=excluded.study_id, replicated=excluded.replicated;
create table if not exists quiz_private.scores (
 user_id uuid primary key references auth.users(id) on delete cascade,
 alias text not null check (char_length(alias) between 1 and 30),
 points numeric(6,2) not null check (points between 0 and 1800),
 correct integer not null check (correct between 0 and 18),
 completed_at timestamptz not null default now()
);
alter table quiz_private.answer_key enable row level security;
alter table quiz_private.scores enable row level security;
revoke all on all tables in schema quiz_private from public, anon, authenticated;

create or replace function public.get_quiz_leaderboard()
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('total', (select count(*) from quiz_private.scores),
 'entries', coalesce((select jsonb_agg(to_jsonb(r) order by r.rank, r.completed_at) from
 (select rank() over (order by points desc, correct desc) as rank,
 alias, points, correct, completed_at from quiz_private.scores
 order by points desc, correct desc, completed_at asc limit 100) r), '[]'::jsonb));
$$;
revoke all on function public.get_quiz_leaderboard() from public;
grant execute on function public.get_quiz_leaderboard() to anon, authenticated;

create or replace function public.submit_quiz(p_alias text, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 uid uuid := auth.uid();
 item jsonb;
 k record;
 forecast numeric;
 total_points numeric := 0;
 total_correct integer := 0;
 c integer;
 choice boolean;
 clean_alias text := btrim(p_alias);
 saved quiz_private.scores%rowtype;
 already_saved boolean := false;
 player_rank bigint;
begin
 if uid is null then raise exception 'Sign in anonymously before submitting.'; end if;
 -- Serialize retries from the same anonymous identity; only its first submission counts.
 perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
 select * into saved from quiz_private.scores where user_id=uid;
 if found then already_saved := true;
 else
  if clean_alias is null or char_length(clean_alias) not between 1 and 30
     or clean_alias ~ '[[:cntrl:]]' then
    raise exception 'Use an alias of 1 to 30 characters without control characters.';
  end if;
  if jsonb_typeof(p_answers) is distinct from 'array' then
    raise exception 'Submit all 18 answers.';
  end if;
  if jsonb_array_length(p_answers) <> 18 or octet_length(p_answers::text) > 20000 then
    raise exception 'Submit all 18 answers.';
  end if;
  for k in select * from quiz_private.answer_key order by question_number loop
   item := p_answers -> (k.question_number - 1);
   if jsonb_typeof(item) is distinct from 'object'
      or (item->>'id') is distinct from k.study_id
      or jsonb_typeof(item->'choice') is distinct from 'boolean'
      or jsonb_typeof(item->'confidence') is distinct from 'number'
      or (item->>'confidence') !~ '^(5[0-9]|[6-9][0-9]|100)$' then
     raise exception 'An answer is invalid or out of order.';
   end if;
   c := (item->>'confidence')::integer;
   choice := (item->>'choice')::boolean;
   forecast := case when choice then c::numeric/100 else 1-c::numeric/100 end;
   total_points := total_points + 100 * (1 - power(forecast - case when k.replicated then 1 else 0 end, 2));
   total_correct := total_correct + case when choice=k.replicated then 1 else 0 end;
  end loop;
  insert into quiz_private.scores(user_id,alias,points,correct)
   values(uid,clean_alias,round(total_points,2),total_correct) returning * into saved;
 end if;
 select 1 + count(*) into player_rank from quiz_private.scores
  where points > saved.points or (points=saved.points and correct>saved.correct);
 return jsonb_build_object('alias',saved.alias,'points',saved.points,'correct',saved.correct,
  'rank',player_rank,'completed_at',saved.completed_at,'already_saved',already_saved);
end;
$$;
revoke all on function public.submit_quiz(text,jsonb) from public, anon;
grant execute on function public.submit_quiz(text,jsonb) to authenticated;
