import { Meta, User, UserMetadata } from './common.types';

export interface ReferentRange {
  content: string;
}

export interface AnnotatableClientTimestamps {
  updated_by_human_at: number;
  lyrics_updated_at: number;
}

export interface Annotatable {
  api_path: string;
  client_timestamps: AnnotatableClientTimestamps;
  context: string;
  id: number;
  image_url: string;
  link_title: string;
  title: string;
  type: string;
  url: string;
}

export interface AnnotationBody {
  plain: string;
}

export interface AnnotationAuthor {
  attribution: number;
  pinned_role: string;
  user: User;
}

export interface Annotation {
  api_path: string;
  body: AnnotationBody;
  comment_count: number;
  community: boolean;
  custom_preview?: unknown;
  has_voters: boolean;
  id: number;
  pinned: boolean;
  share_url: string;
  source?: unknown;
  state: string;
  url: string;
  verified: boolean;
  votes_total: number;
  current_user_metadata: UserMetadata;
  authors: AnnotationAuthor[];
  cosigned_by?: unknown[];
  rejection_comment?: unknown;
  verified_by: User;
}

export interface Referent {
  _type: string;
  annotator_id: number;
  annotator_login: string;
  api_path: string;
  classification: string;
  fragment: string;
  id: number;
  is_description: boolean;
  path: string;
  range: ReferentRange;
  song_id: number;
  url: string;
  verified_annotator_ids?: unknown[];
  annotatable: Annotatable;
  annotations: Annotation[];
}

export interface ReferentsResponseData {
  referents: Referent[];
}

export interface ReferentsResponse {
  meta: Meta;
  response: ReferentsResponseData;
}
