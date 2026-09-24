-- Shared across server instances. Counts accepted application requests, including
-- shortcuts and failed provider calls. No questions or identities are stored.
create table public.historian_usage_budget (
 id integer primary key check (id=1),
 minute_start timestamptz not null, minute_count integer not null default 0,
 day_start timestamptz not null, day_count integer not null default 0,
 month_start timestamptz not null, month_count integer not null default 0
);
alter table public.historian_usage_budget enable row level security;
revoke all on public.historian_usage_budget from public,anon,authenticated;
grant select,insert,update on public.historian_usage_budget to service_role;
create function public.reserve_historian_request() returns text
language plpgsql security invoker set search_path='' as $$
declare
 b public.historian_usage_budget%rowtype;
 t timestamptz:=clock_timestamp();
 m timestamptz:=date_trunc('minute',t,'UTC');
 d timestamptz:=date_trunc('day',t,'UTC');
 mo timestamptz:=date_trunc('month',t,'UTC');
begin
 insert into public.historian_usage_budget(id,minute_start,day_start,month_start)
 values(1,m,d,mo) on conflict(id) do nothing;
 select * into b from public.historian_usage_budget where id=1 for update;
 if b.minute_start<>m then b.minute_count:=0; end if;
 if b.day_start<>d then b.day_count:=0; end if;
 if b.month_start<>mo then b.month_count:=0; end if;
 if b.month_count>=1000 then return 'month'; end if;
 if b.day_count>=100 then return 'day'; end if;
 if b.minute_count>=10 then return 'minute'; end if;
 update public.historian_usage_budget set minute_start=m,minute_count=b.minute_count+1,
 day_start=d,day_count=b.day_count+1,month_start=mo,month_count=b.month_count+1 where id=1;
 return 'allowed';
end;
$$;
revoke all on function public.reserve_historian_request() from public,anon,authenticated;
grant execute on function public.reserve_historian_request() to service_role;
