import { CitySlug } from "./cities";

export type VerificationStatus = "pending" | "approved" | "rejected";
export type PostType = "roommate" | "flat" | "pg";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  batch_year: number | null;
  branch: string | null;
  bio: string;
  role: "student" | "admin";
  created_at: string;
}

export interface Verification {
  id: string;
  user_id: string;
  company_name: string;
  city: CitySlug;
  screenshot_path: string;
  status: VerificationStatus;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  profile?: Profile;
}

export interface BoardPost {
  id: string;
  user_id: string;
  city: CitySlug;
  type: PostType;
  title: string;
  description: string;
  contact_info: string;
  tags: string[];
  created_at: string;
  profile?: Profile;
}

export interface PostReply {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  is_public: boolean;
  created_at: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
}

export interface DirectoryResult {
  user_id: string;
  full_name: string;
  branch: string | null;
  batch_year: number | null;
  bio: string;
  company_name: string;
  city: CitySlug;
}
