create index member_aliases_source_member_id_idx
  on private.member_aliases (source_member_id);

create index member_aliases_canonical_member_id_idx
  on private.member_aliases (canonical_member_id);
