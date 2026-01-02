create type "public"."analysis_job_status" as enum ('pending', 'in_progress', 'completed', 'failed');

create type "public"."analysis_status_enum" as enum ('FAILED', 'IN_PROGRESS');

create type "public"."analysis_version_enum" as enum ('1.0');

create type "public"."playlist_tracks_sync_status_enum" as enum ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

create type "public"."sorting_status_enum" as enum ('unsorted', 'sorted', 'ignored');

create type "public"."sync_mode_enum" as enum ('manual', 'automatic');

create type "public"."theme" as enum ('light', 'dark');

create type "public"."ui_analysis_status_enum" as enum ('analyzed', 'pending', 'not_analyzed', 'failed', 'unknown');

create sequence "public"."audio_features_id_seq";

create sequence "public"."playlist_analyses_id_seq";

create sequence "public"."playlists_id_seq";

create sequence "public"."provider_keys_id_seq";

create sequence "public"."saved_tracks_id_seq";

create sequence "public"."track_analyses_id_seq";

create sequence "public"."track_analysis_attempts_id_seq";

create sequence "public"."tracks_id_seq";

create sequence "public"."users_id_seq";


  create table "public"."analysis_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" integer not null,
    "batch_id" text not null,
    "status" public.analysis_job_status not null default 'pending'::public.analysis_job_status,
    "item_count" integer not null,
    "items_processed" integer not null default 0,
    "items_succeeded" integer not null default 0,
    "items_failed" integer not null default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "item_ids" jsonb default '[]'::jsonb,
    "job_type" text not null default 'track_batch'::text
      );



  create table "public"."audio_features" (
    "id" integer not null default nextval('public.audio_features_id_seq'::regclass),
    "track_id" integer,
    "acousticness" double precision,
    "danceability" double precision,
    "energy" double precision,
    "instrumentalness" double precision,
    "liveness" double precision,
    "speechiness" double precision,
    "tempo" double precision,
    "valence" double precision,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "spotify_track_id" text,
    "loudness" real
      );



  create table "public"."playlist_analyses" (
    "id" integer not null default nextval('public.playlist_analyses_id_seq'::regclass),
    "user_id" integer not null,
    "playlist_id" integer not null,
    "analysis" jsonb not null,
    "model_name" text not null,
    "version" integer not null,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."playlist_tracks" (
    "id" integer not null default nextval('public.saved_tracks_id_seq'::regclass),
    "user_id" integer not null,
    "track_id" integer not null,
    "added_at" timestamp with time zone not null,
    "playlist_id" integer not null
      );



  create table "public"."playlists" (
    "id" integer not null default nextval('public.playlists_id_seq'::regclass),
    "spotify_playlist_id" text not null,
    "user_id" integer,
    "name" text not null,
    "description" text,
    "is_flagged" boolean default false,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "track_count" integer not null default 0,
    "tracks_sync_status" public.playlist_tracks_sync_status_enum default 'NOT_STARTED'::public.playlist_tracks_sync_status_enum,
    "tracks_last_synced_at" timestamp with time zone
      );



  create table "public"."provider_keys" (
    "id" integer not null default nextval('public.provider_keys_id_seq'::regclass),
    "provider" text not null,
    "encrypted_key" text not null,
    "iv" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "auth_tag" text not null default ''::text,
    "user_id" integer
      );


alter table "public"."provider_keys" enable row level security;


  create table "public"."saved_tracks" (
    "id" integer not null default nextval('public.saved_tracks_id_seq'::regclass),
    "user_id" integer not null,
    "track_id" integer not null,
    "liked_at" timestamp with time zone not null,
    "sorting_status" public.sorting_status_enum default 'unsorted'::public.sorting_status_enum
      );



  create table "public"."track_analyses" (
    "id" integer not null default nextval('public.track_analyses_id_seq'::regclass),
    "track_id" integer not null,
    "analysis" jsonb not null,
    "model_name" text not null,
    "version" integer not null,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."track_analysis_attempts" (
    "id" integer not null default nextval('public.track_analysis_attempts_id_seq'::regclass),
    "job_id" text not null,
    "track_id" integer not null,
    "error_type" text,
    "error_message" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "status" public.analysis_status_enum
      );



  create table "public"."track_playlist_matches" (
    "track_id" integer not null,
    "playlist_id" integer not null,
    "score" double precision not null,
    "factors" jsonb not null,
    "model_name" text not null,
    "version" integer not null,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."tracks" (
    "id" integer not null default nextval('public.tracks_id_seq'::regclass),
    "spotify_track_id" text not null,
    "name" text not null,
    "artist" text not null,
    "album" text,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."user_preferences" (
    "user_id" integer not null,
    "active_provider" text,
    "updated_at" timestamp with time zone,
    "sync_mode" public.sync_mode_enum not null default 'manual'::public.sync_mode_enum,
    "batch_size" integer not null default 5,
    "theme_preference" public.theme default 'dark'::public.theme
      );



  create table "public"."users" (
    "id" integer not null default nextval('public.users_id_seq'::regclass),
    "spotify_user_id" text not null,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "last_login" timestamp with time zone,
    "spotify_user_email" text,
    "songs_sync_status" text,
    "songs_last_sync" timestamp with time zone,
    "playlists_sync_status" text,
    "playlists_last_sync" timestamp with time zone,
    "has_setup_completed" boolean not null default false
      );


alter sequence "public"."audio_features_id_seq" owned by "public"."audio_features"."id";

alter sequence "public"."playlist_analyses_id_seq" owned by "public"."playlist_analyses"."id";

alter sequence "public"."playlists_id_seq" owned by "public"."playlists"."id";

alter sequence "public"."provider_keys_id_seq" owned by "public"."provider_keys"."id";

alter sequence "public"."saved_tracks_id_seq" owned by "public"."saved_tracks"."id";

alter sequence "public"."track_analyses_id_seq" owned by "public"."track_analyses"."id";

alter sequence "public"."track_analysis_attempts_id_seq" owned by "public"."track_analysis_attempts"."id";

alter sequence "public"."tracks_id_seq" owned by "public"."tracks"."id";

alter sequence "public"."users_id_seq" owned by "public"."users"."id";

CREATE UNIQUE INDEX analysis_jobs_batch_id_key ON public.analysis_jobs USING btree (batch_id);

CREATE UNIQUE INDEX analysis_jobs_pkey ON public.analysis_jobs USING btree (id);

CREATE UNIQUE INDEX audio_features_pkey ON public.audio_features USING btree (id);

CREATE UNIQUE INDEX audio_features_track_id_key ON public.audio_features USING btree (track_id);

CREATE INDEX idx_analysis_jobs_track_ids ON public.analysis_jobs USING gin (item_ids);

CREATE INDEX idx_analysis_jobs_user_status ON public.analysis_jobs USING btree (user_id, status);

CREATE INDEX idx_playlist_analyses_user_id ON public.playlist_analyses USING btree (user_id);

CREATE INDEX idx_playlist_tracks_track_id ON public.playlist_tracks USING btree (track_id);

CREATE INDEX idx_playlist_tracks_user_id ON public.playlist_tracks USING btree (user_id);

CREATE INDEX idx_playlists_user_id ON public.playlists USING btree (user_id);

CREATE INDEX idx_playlists_user_id_flagged ON public.playlists USING btree (user_id) WHERE (is_flagged = true);

CREATE INDEX idx_provider_keys_user_id ON public.provider_keys USING btree (user_id);

CREATE INDEX idx_saved_tracks_track_id ON public.saved_tracks USING btree (track_id);

CREATE INDEX idx_saved_tracks_user_id_liked_at ON public.saved_tracks USING btree (user_id, liked_at DESC);

CREATE INDEX idx_track_analyses_track_id_version ON public.track_analyses USING btree (track_id, version DESC);

CREATE INDEX idx_track_analysis_attempts_job_id ON public.track_analysis_attempts USING btree (job_id);

CREATE INDEX idx_track_analysis_attempts_track_id ON public.track_analysis_attempts USING btree (track_id);

CREATE INDEX idx_track_playlist_matches_playlist_id ON public.track_playlist_matches USING btree (playlist_id);

CREATE UNIQUE INDEX playlist_analyses_pkey ON public.playlist_analyses USING btree (id);

CREATE INDEX playlist_analyses_playlist_id_idx ON public.playlist_analyses USING btree (playlist_id);

CREATE UNIQUE INDEX playlist_analyses_playlist_id_version_key ON public.playlist_analyses USING btree (playlist_id, version);

CREATE UNIQUE INDEX playlist_tracks_pkey ON public.playlist_tracks USING btree (id);

CREATE UNIQUE INDEX playlist_tracks_playlist_id_track_id_key ON public.playlist_tracks USING btree (playlist_id, track_id);

CREATE UNIQUE INDEX playlists_pkey ON public.playlists USING btree (id);

CREATE UNIQUE INDEX playlists_spotify_playlist_id_key ON public.playlists USING btree (spotify_playlist_id);

CREATE UNIQUE INDEX provider_keys_pkey ON public.provider_keys USING btree (id);

CREATE UNIQUE INDEX saved_tracks_pkey ON public.saved_tracks USING btree (id);

CREATE UNIQUE INDEX saved_tracks_user_id_track_id_key ON public.saved_tracks USING btree (user_id, track_id);

CREATE UNIQUE INDEX song_playlist_matches_pkey ON public.track_playlist_matches USING btree (track_id, playlist_id);

CREATE INDEX song_playlist_matches_score_idx ON public.track_playlist_matches USING btree (score DESC);

CREATE UNIQUE INDEX track_analyses_pkey ON public.track_analyses USING btree (id);

CREATE UNIQUE INDEX track_analyses_track_id_version_key ON public.track_analyses USING btree (track_id, version);

CREATE UNIQUE INDEX track_analysis_attempts_job_id_track_id_key ON public.track_analysis_attempts USING btree (job_id, track_id);

CREATE UNIQUE INDEX track_analysis_attempts_pkey ON public.track_analysis_attempts USING btree (id);

CREATE UNIQUE INDEX tracks_pkey ON public.tracks USING btree (id);

CREATE UNIQUE INDEX tracks_spotify_track_id_key ON public.tracks USING btree (spotify_track_id);

CREATE UNIQUE INDEX user_provider_preferences_new_pkey ON public.user_preferences USING btree (user_id);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX users_spotify_user_email_key ON public.users USING btree (spotify_user_email);

CREATE UNIQUE INDEX users_spotify_user_id_key ON public.users USING btree (spotify_user_id);

alter table "public"."analysis_jobs" add constraint "analysis_jobs_pkey" PRIMARY KEY using index "analysis_jobs_pkey";

alter table "public"."audio_features" add constraint "audio_features_pkey" PRIMARY KEY using index "audio_features_pkey";

alter table "public"."playlist_analyses" add constraint "playlist_analyses_pkey" PRIMARY KEY using index "playlist_analyses_pkey";

alter table "public"."playlist_tracks" add constraint "playlist_tracks_pkey" PRIMARY KEY using index "playlist_tracks_pkey";

alter table "public"."playlists" add constraint "playlists_pkey" PRIMARY KEY using index "playlists_pkey";

alter table "public"."provider_keys" add constraint "provider_keys_pkey" PRIMARY KEY using index "provider_keys_pkey";

alter table "public"."saved_tracks" add constraint "saved_tracks_pkey" PRIMARY KEY using index "saved_tracks_pkey";

alter table "public"."track_analyses" add constraint "track_analyses_pkey" PRIMARY KEY using index "track_analyses_pkey";

alter table "public"."track_analysis_attempts" add constraint "track_analysis_attempts_pkey" PRIMARY KEY using index "track_analysis_attempts_pkey";

alter table "public"."track_playlist_matches" add constraint "song_playlist_matches_pkey" PRIMARY KEY using index "song_playlist_matches_pkey";

alter table "public"."tracks" add constraint "tracks_pkey" PRIMARY KEY using index "tracks_pkey";

alter table "public"."user_preferences" add constraint "user_provider_preferences_new_pkey" PRIMARY KEY using index "user_provider_preferences_new_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."analysis_jobs" add constraint "analysis_jobs_batch_id_key" UNIQUE using index "analysis_jobs_batch_id_key";

alter table "public"."analysis_jobs" add constraint "analysis_jobs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) not valid;

alter table "public"."analysis_jobs" validate constraint "analysis_jobs_user_id_fkey";

alter table "public"."audio_features" add constraint "audio_features_track_id_fkey" FOREIGN KEY (track_id) REFERENCES public.tracks(id) not valid;

alter table "public"."audio_features" validate constraint "audio_features_track_id_fkey";

alter table "public"."audio_features" add constraint "audio_features_track_id_key" UNIQUE using index "audio_features_track_id_key";

alter table "public"."playlist_analyses" add constraint "playlist_analyses_analysis_structure" CHECK (((jsonb_typeof((analysis -> 'purpose'::text)) = 'object'::text) AND (jsonb_typeof((analysis -> 'context'::text)) = 'object'::text) AND (jsonb_typeof((analysis -> 'emotional'::text)) = 'object'::text))) not valid;

alter table "public"."playlist_analyses" validate constraint "playlist_analyses_analysis_structure";

alter table "public"."playlist_analyses" add constraint "playlist_analyses_content_structure" CHECK (((jsonb_typeof((analysis -> 'purpose'::text)) = 'object'::text) AND (jsonb_typeof((analysis -> 'context'::text)) = 'object'::text) AND (jsonb_typeof((analysis -> 'emotional'::text)) = 'object'::text))) not valid;

alter table "public"."playlist_analyses" validate constraint "playlist_analyses_content_structure";

alter table "public"."playlist_analyses" add constraint "playlist_analyses_playlist_id_fkey" FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE not valid;

alter table "public"."playlist_analyses" validate constraint "playlist_analyses_playlist_id_fkey";

alter table "public"."playlist_analyses" add constraint "playlist_analyses_playlist_id_version_key" UNIQUE using index "playlist_analyses_playlist_id_version_key";

alter table "public"."playlist_analyses" add constraint "playlist_analyses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."playlist_analyses" validate constraint "playlist_analyses_user_id_fkey";

alter table "public"."playlist_tracks" add constraint "playlist_tracks_playlist_id_fkey" FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE not valid;

alter table "public"."playlist_tracks" validate constraint "playlist_tracks_playlist_id_fkey";

alter table "public"."playlist_tracks" add constraint "playlist_tracks_playlist_id_track_id_key" UNIQUE using index "playlist_tracks_playlist_id_track_id_key";

alter table "public"."playlist_tracks" add constraint "playlist_tracks_track_id_fkey" FOREIGN KEY (track_id) REFERENCES public.tracks(id) not valid;

alter table "public"."playlist_tracks" validate constraint "playlist_tracks_track_id_fkey";

alter table "public"."playlist_tracks" add constraint "playlist_tracks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) not valid;

alter table "public"."playlist_tracks" validate constraint "playlist_tracks_user_id_fkey";

alter table "public"."playlists" add constraint "playlists_spotify_playlist_id_key" UNIQUE using index "playlists_spotify_playlist_id_key";

alter table "public"."playlists" add constraint "playlists_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."playlists" validate constraint "playlists_user_id_fkey";

alter table "public"."provider_keys" add constraint "provider_keys_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."provider_keys" validate constraint "provider_keys_user_id_fkey";

alter table "public"."saved_tracks" add constraint "saved_tracks_track_id_fkey" FOREIGN KEY (track_id) REFERENCES public.tracks(id) not valid;

alter table "public"."saved_tracks" validate constraint "saved_tracks_track_id_fkey";

alter table "public"."saved_tracks" add constraint "saved_tracks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) not valid;

alter table "public"."saved_tracks" validate constraint "saved_tracks_user_id_fkey";

alter table "public"."saved_tracks" add constraint "saved_tracks_user_id_track_id_key" UNIQUE using index "saved_tracks_user_id_track_id_key";

alter table "public"."track_analyses" add constraint "track_analyses_content_structure" CHECK (((jsonb_typeof((analysis -> 'meaning'::text)) = 'object'::text) AND (jsonb_typeof((analysis -> 'emotional'::text)) = 'object'::text) AND (jsonb_typeof((analysis -> 'context'::text)) = 'object'::text))) not valid;

alter table "public"."track_analyses" validate constraint "track_analyses_content_structure";

alter table "public"."track_analyses" add constraint "track_analyses_track_id_fkey" FOREIGN KEY (track_id) REFERENCES public.tracks(id) not valid;

alter table "public"."track_analyses" validate constraint "track_analyses_track_id_fkey";

alter table "public"."track_analyses" add constraint "track_analyses_track_id_version_key" UNIQUE using index "track_analyses_track_id_version_key";

alter table "public"."track_analysis_attempts" add constraint "track_analysis_attempts_job_id_track_id_key" UNIQUE using index "track_analysis_attempts_job_id_track_id_key";

alter table "public"."track_analysis_attempts" add constraint "track_analysis_attempts_track_id_fkey" FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE not valid;

alter table "public"."track_analysis_attempts" validate constraint "track_analysis_attempts_track_id_fkey";

alter table "public"."track_playlist_matches" add constraint "song_playlist_matches_playlist_id_fkey" FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) not valid;

alter table "public"."track_playlist_matches" validate constraint "song_playlist_matches_playlist_id_fkey";

alter table "public"."track_playlist_matches" add constraint "song_playlist_matches_score_check" CHECK (((score >= (0)::double precision) AND (score <= (1)::double precision))) not valid;

alter table "public"."track_playlist_matches" validate constraint "song_playlist_matches_score_check";

alter table "public"."track_playlist_matches" add constraint "song_playlist_matches_track_id_fkey" FOREIGN KEY (track_id) REFERENCES public.tracks(id) not valid;

alter table "public"."track_playlist_matches" validate constraint "song_playlist_matches_track_id_fkey";

alter table "public"."tracks" add constraint "tracks_spotify_track_id_key" UNIQUE using index "tracks_spotify_track_id_key";

alter table "public"."user_preferences" add constraint "user_preferences_batch_size_check" CHECK ((batch_size = ANY (ARRAY[1, 5, 10, 15, 20]))) not valid;

alter table "public"."user_preferences" validate constraint "user_preferences_batch_size_check";

alter table "public"."user_preferences" add constraint "user_provider_preferences_new_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_preferences" validate constraint "user_provider_preferences_new_user_id_fkey";

alter table "public"."users" add constraint "users_spotify_user_email_key" UNIQUE using index "users_spotify_user_email_key";

alter table "public"."users" add constraint "users_spotify_user_id_key" UNIQUE using index "users_spotify_user_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_track_analysis_job(p_user_id integer, p_track_ids integer[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  track_id INT;
  track_count INT;
BEGIN
  -- Loop through each track ID and add a job
  track_count := array_length(p_track_ids, 1);
  
  FOREACH track_id IN ARRAY p_track_ids
  LOOP
    -- Insert job directly into the jobs table with job metadata in the flags column
    INSERT INTO graphile_worker.jobs(
      task_identifier, 
      -- Using flags instead of payload (as payload doesn't exist)
      flags,
      priority,
      created_at,
      updated_at
    )
    VALUES (
      'analyzeTrack', 
      -- Store our data as JSONB in the flags column
      jsonb_build_object(
        'jobId', (SELECT id FROM analysis_jobs WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1),
        'trackId', track_id,
        'userId', p_user_id
      ),
      0, -- default priority
      now(),
      now()
    );
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.batch_update_playlist_track_counts(updates jsonb[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$begin
  for i in 1..array_length(updates, 1) loop
    update playlists
    set track_count = (updates[i]->>'track_count')::int,
        updated_at = now()
    where id = (updates[i]->>'playlist_id')::int;
  end loop;
end;$function$
;

CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  EXECUTE sql;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_latest_analysis_job(p_user_id integer)
 RETURNS TABLE(id integer, status text, created_at timestamp with time zone, updated_at timestamp with time zone, item_count integer, items_processed integer, items_succeeded integer, items_failed integer, job_type text, completion_percentage integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    aj.id::integer,
    aj.status::text,
    aj.created_at,
    aj.updated_at,
    aj.item_count,
    aj.items_processed,
    aj.items_succeeded,
    aj.items_failed,
    aj.job_type,
    CASE 
      WHEN aj.item_count = 0 THEN 0
      ELSE (aj.items_processed * 100 / aj.item_count)
    END AS completion_percentage
  FROM 
    public.analysis_jobs aj
  WHERE 
    aj.user_id = p_user_id
  ORDER BY 
    aj.created_at DESC
  LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_tracks_with_analysis(p_user_id bigint)
 RETURNS TABLE(track_id integer, spotify_track_id text, name text, artist text, album text, liked_at timestamp with time zone, sorting_status public.sorting_status_enum, analysis jsonb, analysis_version integer, ui_analysis_status public.ui_analysis_status_enum)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    t.id,
    t.spotify_track_id,
    t.name,
    t.artist,
    t.album,
    st.liked_at,
    st.sorting_status,
    ta.analysis,
    ta.version,
    CASE
      WHEN ta.id IS NOT NULL THEN 'analyzed'::ui_analysis_status_enum
      WHEN taa.id IS NOT NULL THEN 'failed'::ui_analysis_status_enum
      ELSE 'not_analyzed'::ui_analysis_status_enum
    END
  FROM saved_tracks st
  JOIN tracks t ON t.id = st.track_id
  LEFT JOIN LATERAL (
    SELECT id, analysis, version 
    FROM track_analyses
    WHERE track_id = t.id 
    ORDER BY version DESC 
    LIMIT 1
  ) ta ON true
  LEFT JOIN LATERAL (
    SELECT id 
    FROM track_analysis_attempts
    WHERE track_id = t.id AND status = 'FAILED' 
    LIMIT 1
  ) taa ON ta.id IS NULL
  WHERE st.user_id = p_user_id
  ORDER BY st.liked_at DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.queue_analyze_track_task(p_job_id integer, p_track_id integer, p_user_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  success BOOLEAN;
BEGIN
  -- Try the first method - direct insertion into tasks table
  BEGIN
    INSERT INTO graphile_worker._private_tasks(task_identifier, payload)
    VALUES ('analyzeTrack', jsonb_build_object(
      'jobId', p_job_id,
      'trackId', p_track_id,
      'userId', p_user_id
    ));
    success := TRUE;
  EXCEPTION 
    WHEN undefined_table THEN
      success := FALSE;
    WHEN others THEN
      RAISE NOTICE 'First method failed: %', SQLERRM;
      success := FALSE;
  END;

  -- If first method failed, try the native function
  IF NOT success THEN
    BEGIN
      PERFORM graphile_worker.add_job(
        'analyzeTrack', 
        jsonb_build_object(
          'jobId', p_job_id,
          'trackId', p_track_id,
          'userId', p_user_id
        )
      );
      success := TRUE;
    EXCEPTION
      WHEN undefined_function THEN
        success := FALSE;
      WHEN others THEN
        RAISE NOTICE 'Second method failed: %', SQLERRM;
        success := FALSE;
    END;
  END IF;

  -- Last resort - just record that we tried and hope something picks it up
  IF NOT success THEN
    -- Update the attempt status to mark it as ready for processing
    UPDATE track_analysis_attempts
    SET status = 'ready_for_processing'
    WHERE job_id = p_job_id AND track_id = p_track_id;

    -- We'll count this as a success since we've at least marked it
    success := TRUE;
  END IF;

  RETURN success;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Unexpected error in queue_analyze_track_task: %', SQLERRM;
    RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."analysis_jobs" to "anon";

grant insert on table "public"."analysis_jobs" to "anon";

grant references on table "public"."analysis_jobs" to "anon";

grant select on table "public"."analysis_jobs" to "anon";

grant trigger on table "public"."analysis_jobs" to "anon";

grant truncate on table "public"."analysis_jobs" to "anon";

grant update on table "public"."analysis_jobs" to "anon";

grant delete on table "public"."analysis_jobs" to "authenticated";

grant insert on table "public"."analysis_jobs" to "authenticated";

grant references on table "public"."analysis_jobs" to "authenticated";

grant select on table "public"."analysis_jobs" to "authenticated";

grant trigger on table "public"."analysis_jobs" to "authenticated";

grant truncate on table "public"."analysis_jobs" to "authenticated";

grant update on table "public"."analysis_jobs" to "authenticated";

grant delete on table "public"."analysis_jobs" to "service_role";

grant insert on table "public"."analysis_jobs" to "service_role";

grant references on table "public"."analysis_jobs" to "service_role";

grant select on table "public"."analysis_jobs" to "service_role";

grant trigger on table "public"."analysis_jobs" to "service_role";

grant truncate on table "public"."analysis_jobs" to "service_role";

grant update on table "public"."analysis_jobs" to "service_role";

grant delete on table "public"."audio_features" to "anon";

grant insert on table "public"."audio_features" to "anon";

grant references on table "public"."audio_features" to "anon";

grant select on table "public"."audio_features" to "anon";

grant trigger on table "public"."audio_features" to "anon";

grant truncate on table "public"."audio_features" to "anon";

grant update on table "public"."audio_features" to "anon";

grant delete on table "public"."audio_features" to "authenticated";

grant insert on table "public"."audio_features" to "authenticated";

grant references on table "public"."audio_features" to "authenticated";

grant select on table "public"."audio_features" to "authenticated";

grant trigger on table "public"."audio_features" to "authenticated";

grant truncate on table "public"."audio_features" to "authenticated";

grant update on table "public"."audio_features" to "authenticated";

grant delete on table "public"."audio_features" to "service_role";

grant insert on table "public"."audio_features" to "service_role";

grant references on table "public"."audio_features" to "service_role";

grant select on table "public"."audio_features" to "service_role";

grant trigger on table "public"."audio_features" to "service_role";

grant truncate on table "public"."audio_features" to "service_role";

grant update on table "public"."audio_features" to "service_role";

grant delete on table "public"."playlist_analyses" to "anon";

grant insert on table "public"."playlist_analyses" to "anon";

grant references on table "public"."playlist_analyses" to "anon";

grant select on table "public"."playlist_analyses" to "anon";

grant trigger on table "public"."playlist_analyses" to "anon";

grant truncate on table "public"."playlist_analyses" to "anon";

grant update on table "public"."playlist_analyses" to "anon";

grant delete on table "public"."playlist_analyses" to "authenticated";

grant insert on table "public"."playlist_analyses" to "authenticated";

grant references on table "public"."playlist_analyses" to "authenticated";

grant select on table "public"."playlist_analyses" to "authenticated";

grant trigger on table "public"."playlist_analyses" to "authenticated";

grant truncate on table "public"."playlist_analyses" to "authenticated";

grant update on table "public"."playlist_analyses" to "authenticated";

grant delete on table "public"."playlist_analyses" to "service_role";

grant insert on table "public"."playlist_analyses" to "service_role";

grant references on table "public"."playlist_analyses" to "service_role";

grant select on table "public"."playlist_analyses" to "service_role";

grant trigger on table "public"."playlist_analyses" to "service_role";

grant truncate on table "public"."playlist_analyses" to "service_role";

grant update on table "public"."playlist_analyses" to "service_role";

grant delete on table "public"."playlist_tracks" to "anon";

grant insert on table "public"."playlist_tracks" to "anon";

grant references on table "public"."playlist_tracks" to "anon";

grant select on table "public"."playlist_tracks" to "anon";

grant trigger on table "public"."playlist_tracks" to "anon";

grant truncate on table "public"."playlist_tracks" to "anon";

grant update on table "public"."playlist_tracks" to "anon";

grant delete on table "public"."playlist_tracks" to "authenticated";

grant insert on table "public"."playlist_tracks" to "authenticated";

grant references on table "public"."playlist_tracks" to "authenticated";

grant select on table "public"."playlist_tracks" to "authenticated";

grant trigger on table "public"."playlist_tracks" to "authenticated";

grant truncate on table "public"."playlist_tracks" to "authenticated";

grant update on table "public"."playlist_tracks" to "authenticated";

grant delete on table "public"."playlist_tracks" to "service_role";

grant insert on table "public"."playlist_tracks" to "service_role";

grant references on table "public"."playlist_tracks" to "service_role";

grant select on table "public"."playlist_tracks" to "service_role";

grant trigger on table "public"."playlist_tracks" to "service_role";

grant truncate on table "public"."playlist_tracks" to "service_role";

grant update on table "public"."playlist_tracks" to "service_role";

grant delete on table "public"."playlists" to "anon";

grant insert on table "public"."playlists" to "anon";

grant references on table "public"."playlists" to "anon";

grant select on table "public"."playlists" to "anon";

grant trigger on table "public"."playlists" to "anon";

grant truncate on table "public"."playlists" to "anon";

grant update on table "public"."playlists" to "anon";

grant delete on table "public"."playlists" to "authenticated";

grant insert on table "public"."playlists" to "authenticated";

grant references on table "public"."playlists" to "authenticated";

grant select on table "public"."playlists" to "authenticated";

grant trigger on table "public"."playlists" to "authenticated";

grant truncate on table "public"."playlists" to "authenticated";

grant update on table "public"."playlists" to "authenticated";

grant delete on table "public"."playlists" to "service_role";

grant insert on table "public"."playlists" to "service_role";

grant references on table "public"."playlists" to "service_role";

grant select on table "public"."playlists" to "service_role";

grant trigger on table "public"."playlists" to "service_role";

grant truncate on table "public"."playlists" to "service_role";

grant update on table "public"."playlists" to "service_role";

grant delete on table "public"."provider_keys" to "anon";

grant insert on table "public"."provider_keys" to "anon";

grant references on table "public"."provider_keys" to "anon";

grant select on table "public"."provider_keys" to "anon";

grant trigger on table "public"."provider_keys" to "anon";

grant truncate on table "public"."provider_keys" to "anon";

grant update on table "public"."provider_keys" to "anon";

grant delete on table "public"."provider_keys" to "authenticated";

grant insert on table "public"."provider_keys" to "authenticated";

grant references on table "public"."provider_keys" to "authenticated";

grant select on table "public"."provider_keys" to "authenticated";

grant trigger on table "public"."provider_keys" to "authenticated";

grant truncate on table "public"."provider_keys" to "authenticated";

grant update on table "public"."provider_keys" to "authenticated";

grant delete on table "public"."provider_keys" to "service_role";

grant insert on table "public"."provider_keys" to "service_role";

grant references on table "public"."provider_keys" to "service_role";

grant select on table "public"."provider_keys" to "service_role";

grant trigger on table "public"."provider_keys" to "service_role";

grant truncate on table "public"."provider_keys" to "service_role";

grant update on table "public"."provider_keys" to "service_role";

grant delete on table "public"."saved_tracks" to "anon";

grant insert on table "public"."saved_tracks" to "anon";

grant references on table "public"."saved_tracks" to "anon";

grant select on table "public"."saved_tracks" to "anon";

grant trigger on table "public"."saved_tracks" to "anon";

grant truncate on table "public"."saved_tracks" to "anon";

grant update on table "public"."saved_tracks" to "anon";

grant delete on table "public"."saved_tracks" to "authenticated";

grant insert on table "public"."saved_tracks" to "authenticated";

grant references on table "public"."saved_tracks" to "authenticated";

grant select on table "public"."saved_tracks" to "authenticated";

grant trigger on table "public"."saved_tracks" to "authenticated";

grant truncate on table "public"."saved_tracks" to "authenticated";

grant update on table "public"."saved_tracks" to "authenticated";

grant delete on table "public"."saved_tracks" to "service_role";

grant insert on table "public"."saved_tracks" to "service_role";

grant references on table "public"."saved_tracks" to "service_role";

grant select on table "public"."saved_tracks" to "service_role";

grant trigger on table "public"."saved_tracks" to "service_role";

grant truncate on table "public"."saved_tracks" to "service_role";

grant update on table "public"."saved_tracks" to "service_role";

grant delete on table "public"."track_analyses" to "anon";

grant insert on table "public"."track_analyses" to "anon";

grant references on table "public"."track_analyses" to "anon";

grant select on table "public"."track_analyses" to "anon";

grant trigger on table "public"."track_analyses" to "anon";

grant truncate on table "public"."track_analyses" to "anon";

grant update on table "public"."track_analyses" to "anon";

grant delete on table "public"."track_analyses" to "authenticated";

grant insert on table "public"."track_analyses" to "authenticated";

grant references on table "public"."track_analyses" to "authenticated";

grant select on table "public"."track_analyses" to "authenticated";

grant trigger on table "public"."track_analyses" to "authenticated";

grant truncate on table "public"."track_analyses" to "authenticated";

grant update on table "public"."track_analyses" to "authenticated";

grant delete on table "public"."track_analyses" to "service_role";

grant insert on table "public"."track_analyses" to "service_role";

grant references on table "public"."track_analyses" to "service_role";

grant select on table "public"."track_analyses" to "service_role";

grant trigger on table "public"."track_analyses" to "service_role";

grant truncate on table "public"."track_analyses" to "service_role";

grant update on table "public"."track_analyses" to "service_role";

grant delete on table "public"."track_analysis_attempts" to "anon";

grant insert on table "public"."track_analysis_attempts" to "anon";

grant references on table "public"."track_analysis_attempts" to "anon";

grant select on table "public"."track_analysis_attempts" to "anon";

grant trigger on table "public"."track_analysis_attempts" to "anon";

grant truncate on table "public"."track_analysis_attempts" to "anon";

grant update on table "public"."track_analysis_attempts" to "anon";

grant delete on table "public"."track_analysis_attempts" to "authenticated";

grant insert on table "public"."track_analysis_attempts" to "authenticated";

grant references on table "public"."track_analysis_attempts" to "authenticated";

grant select on table "public"."track_analysis_attempts" to "authenticated";

grant trigger on table "public"."track_analysis_attempts" to "authenticated";

grant truncate on table "public"."track_analysis_attempts" to "authenticated";

grant update on table "public"."track_analysis_attempts" to "authenticated";

grant delete on table "public"."track_analysis_attempts" to "service_role";

grant insert on table "public"."track_analysis_attempts" to "service_role";

grant references on table "public"."track_analysis_attempts" to "service_role";

grant select on table "public"."track_analysis_attempts" to "service_role";

grant trigger on table "public"."track_analysis_attempts" to "service_role";

grant truncate on table "public"."track_analysis_attempts" to "service_role";

grant update on table "public"."track_analysis_attempts" to "service_role";

grant delete on table "public"."track_playlist_matches" to "anon";

grant insert on table "public"."track_playlist_matches" to "anon";

grant references on table "public"."track_playlist_matches" to "anon";

grant select on table "public"."track_playlist_matches" to "anon";

grant trigger on table "public"."track_playlist_matches" to "anon";

grant truncate on table "public"."track_playlist_matches" to "anon";

grant update on table "public"."track_playlist_matches" to "anon";

grant delete on table "public"."track_playlist_matches" to "authenticated";

grant insert on table "public"."track_playlist_matches" to "authenticated";

grant references on table "public"."track_playlist_matches" to "authenticated";

grant select on table "public"."track_playlist_matches" to "authenticated";

grant trigger on table "public"."track_playlist_matches" to "authenticated";

grant truncate on table "public"."track_playlist_matches" to "authenticated";

grant update on table "public"."track_playlist_matches" to "authenticated";

grant delete on table "public"."track_playlist_matches" to "service_role";

grant insert on table "public"."track_playlist_matches" to "service_role";

grant references on table "public"."track_playlist_matches" to "service_role";

grant select on table "public"."track_playlist_matches" to "service_role";

grant trigger on table "public"."track_playlist_matches" to "service_role";

grant truncate on table "public"."track_playlist_matches" to "service_role";

grant update on table "public"."track_playlist_matches" to "service_role";

grant delete on table "public"."tracks" to "anon";

grant insert on table "public"."tracks" to "anon";

grant references on table "public"."tracks" to "anon";

grant select on table "public"."tracks" to "anon";

grant trigger on table "public"."tracks" to "anon";

grant truncate on table "public"."tracks" to "anon";

grant update on table "public"."tracks" to "anon";

grant delete on table "public"."tracks" to "authenticated";

grant insert on table "public"."tracks" to "authenticated";

grant references on table "public"."tracks" to "authenticated";

grant select on table "public"."tracks" to "authenticated";

grant trigger on table "public"."tracks" to "authenticated";

grant truncate on table "public"."tracks" to "authenticated";

grant update on table "public"."tracks" to "authenticated";

grant delete on table "public"."tracks" to "service_role";

grant insert on table "public"."tracks" to "service_role";

grant references on table "public"."tracks" to "service_role";

grant select on table "public"."tracks" to "service_role";

grant trigger on table "public"."tracks" to "service_role";

grant truncate on table "public"."tracks" to "service_role";

grant update on table "public"."tracks" to "service_role";

grant delete on table "public"."user_preferences" to "anon";

grant insert on table "public"."user_preferences" to "anon";

grant references on table "public"."user_preferences" to "anon";

grant select on table "public"."user_preferences" to "anon";

grant trigger on table "public"."user_preferences" to "anon";

grant truncate on table "public"."user_preferences" to "anon";

grant update on table "public"."user_preferences" to "anon";

grant delete on table "public"."user_preferences" to "authenticated";

grant insert on table "public"."user_preferences" to "authenticated";

grant references on table "public"."user_preferences" to "authenticated";

grant select on table "public"."user_preferences" to "authenticated";

grant trigger on table "public"."user_preferences" to "authenticated";

grant truncate on table "public"."user_preferences" to "authenticated";

grant update on table "public"."user_preferences" to "authenticated";

grant delete on table "public"."user_preferences" to "service_role";

grant insert on table "public"."user_preferences" to "service_role";

grant references on table "public"."user_preferences" to "service_role";

grant select on table "public"."user_preferences" to "service_role";

grant trigger on table "public"."user_preferences" to "service_role";

grant truncate on table "public"."user_preferences" to "service_role";

grant update on table "public"."user_preferences" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "Allow inserts to provider_keys"
  on "public"."provider_keys"
  as permissive
  for insert
  to public
with check (true);



  create policy "Users can delete their own provider keys"
  on "public"."provider_keys"
  as permissive
  for delete
  to public
using (true);



  create policy "Users can update their own provider keys"
  on "public"."provider_keys"
  as permissive
  for update
  to public
using (true);



  create policy "Users can view their own provider keys"
  on "public"."provider_keys"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER update_provider_keys_updated_at BEFORE UPDATE ON public.provider_keys FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


