export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          desc_cs: string
          desc_en: string
          glyph: string
          id: string
          name_cs: string
          name_en: string
          tier: number
        }
        Insert: {
          desc_cs: string
          desc_en: string
          glyph: string
          id: string
          name_cs: string
          name_en: string
          tier?: number
        }
        Update: {
          desc_cs?: string
          desc_en?: string
          glyph?: string
          id?: string
          name_cs?: string
          name_en?: string
          tier?: number
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_entries: {
        Row: {
          caption: string | null
          challenge_id: string
          created_at: string
          id: string
          image_url: string
          is_hidden: boolean
          plant_id: string | null
          user_id: string
          votes_count: number
        }
        Insert: {
          caption?: string | null
          challenge_id: string
          created_at?: string
          id?: string
          image_url: string
          is_hidden?: boolean
          plant_id?: string | null
          user_id: string
          votes_count?: number
        }
        Update: {
          caption?: string | null
          challenge_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_hidden?: boolean
          plant_id?: string | null
          user_id?: string
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_entries_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "public_plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_votes: {
        Row: {
          challenge_id: string
          entry_id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          entry_id: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          entry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_votes_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "challenge_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "challenge_entries_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string
          description_cs: string | null
          ends_at: string
          finalized_at: string | null
          id: string
          slug: string
          starts_at: string
          title: string
          title_cs: string | null
          voting_ends_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string
          description_cs?: string | null
          ends_at: string
          finalized_at?: string | null
          id?: string
          slug: string
          starts_at: string
          title: string
          title_cs?: string | null
          voting_ends_at: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string
          description_cs?: string | null
          ends_at?: string
          finalized_at?: string | null
          id?: string
          slug?: string
          starts_at?: string
          title?: string
          title_cs?: string | null
          voting_ends_at?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          user_id: string
        }
        Update: {
          comment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          is_ai: boolean
          is_hidden: boolean
          likes_count: number
          parent_id: string | null
          post_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_ai?: boolean
          is_hidden?: boolean
          likes_count?: number
          parent_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          is_hidden?: boolean
          likes_count?: number
          parent_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          comment_id: string | null
          created_at: string
          id: string
          meta: Json | null
          post_id: string | null
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          post_id?: string | null
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          post_id?: string | null
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_updates: {
        Row: {
          body: string
          created_at: string
          id: string
          images: string[]
          journal_summary: Json | null
          owner_id: string
          plant_id: string
          week_no: number
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          images?: string[]
          journal_summary?: Json | null
          owner_id: string
          plant_id: string
          week_no: number
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          images?: string[]
          journal_summary?: Json | null
          owner_id?: string
          plant_id?: string
          week_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "plant_updates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_updates_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "public_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          kind: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          accepted_comment_id: string | null
          author_id: string
          body: string
          category: string
          comments_count: number
          created_at: string
          edited_at: string | null
          id: string
          images: string[]
          is_hidden: boolean
          likes_count: number
          pinged_at: string | null
          plant_context: Json | null
          plant_id: string | null
          reactions: Json
          solved_at: string | null
          status: string
          symptom_tags: string[]
          tags: string[]
          title: string | null
        }
        Insert: {
          accepted_comment_id?: string | null
          author_id: string
          body?: string
          category: string
          comments_count?: number
          created_at?: string
          edited_at?: string | null
          id?: string
          images?: string[]
          is_hidden?: boolean
          likes_count?: number
          pinged_at?: string | null
          plant_context?: Json | null
          plant_id?: string | null
          reactions?: Json
          solved_at?: string | null
          status?: string
          symptom_tags?: string[]
          tags?: string[]
          title?: string | null
        }
        Update: {
          accepted_comment_id?: string | null
          author_id?: string
          body?: string
          category?: string
          comments_count?: number
          created_at?: string
          edited_at?: string | null
          id?: string
          images?: string[]
          is_hidden?: boolean
          likes_count?: number
          pinged_at?: string | null
          plant_context?: Json | null
          plant_id?: string | null
          reactions?: Json
          solved_at?: string | null
          status?: string
          symptom_tags?: string[]
          tags?: string[]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_accepted_fk"
            columns: ["accepted_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "public_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          environments: string[]
          experience: string
          favorite_strain: string | null
          first_grow: boolean
          id: string
          is_admin: boolean
          is_banned: boolean
          light_type: string | null
          media: string[]
          pinned_badges: string[]
          reputation: number
          space: string | null
          username: string
        }
        Insert: {
          accepted_terms_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          environments?: string[]
          experience?: string
          favorite_strain?: string | null
          first_grow?: boolean
          id: string
          is_admin?: boolean
          is_banned?: boolean
          light_type?: string | null
          media?: string[]
          pinned_badges?: string[]
          reputation?: number
          space?: string | null
          username: string
        }
        Update: {
          accepted_terms_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          environments?: string[]
          experience?: string
          favorite_strain?: string | null
          first_grow?: boolean
          id?: string
          is_admin?: boolean
          is_banned?: boolean
          light_type?: string | null
          media?: string[]
          pinned_badges?: string[]
          reputation?: number
          space?: string | null
          username?: string
        }
        Relationships: []
      }
      public_plants: {
        Row: {
          archived: boolean
          cover_url: string | null
          created_at: string
          environment: string | null
          harvest_dry_g: number | null
          harvest_wet_g: number | null
          id: string
          is_hidden: boolean
          local_id: string
          medium: string | null
          name: string
          owner_id: string
          plant_type: string | null
          stage: string
          start_date: string | null
          strain: string | null
          strain_id: string | null
          timeline: Json
          updated_at: string
          updated_weeks: number
        }
        Insert: {
          archived?: boolean
          cover_url?: string | null
          created_at?: string
          environment?: string | null
          harvest_dry_g?: number | null
          harvest_wet_g?: number | null
          id?: string
          is_hidden?: boolean
          local_id: string
          medium?: string | null
          name: string
          owner_id: string
          plant_type?: string | null
          stage: string
          start_date?: string | null
          strain?: string | null
          strain_id?: string | null
          timeline?: Json
          updated_at?: string
          updated_weeks?: number
        }
        Update: {
          archived?: boolean
          cover_url?: string | null
          created_at?: string
          environment?: string | null
          harvest_dry_g?: number | null
          harvest_wet_g?: number | null
          id?: string
          is_hidden?: boolean
          local_id?: string
          medium?: string | null
          name?: string
          owner_id?: string
          plant_type?: string | null
          stage?: string
          start_date?: string | null
          strain?: string | null
          strain_id?: string | null
          timeline?: Json
          updated_at?: string
          updated_weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_plants_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_plants_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_stats"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "public_plants_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_events: {
        Row: {
          created_at: string
          kind: string
          points: number
          ref_id: string
          source_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: string
          points: number
          ref_id: string
          source_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          points?: number
          ref_id?: string
          source_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reputation_events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strain_reports: {
        Row: {
          created_at: string
          difficulty: number | null
          flowering_days: number | null
          id: string
          medium: string | null
          notes: string | null
          plant_id: string | null
          rating: number | null
          strain_id: string
          tags: string[]
          user_id: string
          yield_g: number | null
        }
        Insert: {
          created_at?: string
          difficulty?: number | null
          flowering_days?: number | null
          id?: string
          medium?: string | null
          notes?: string | null
          plant_id?: string | null
          rating?: number | null
          strain_id: string
          tags?: string[]
          user_id: string
          yield_g?: number | null
        }
        Update: {
          created_at?: string
          difficulty?: number | null
          flowering_days?: number | null
          id?: string
          medium?: string | null
          notes?: string | null
          plant_id?: string | null
          rating?: number | null
          strain_id?: string
          tags?: string[]
          user_id?: string
          yield_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strain_reports_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "public_plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strain_reports_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strain_stats"
            referencedColumns: ["strain_id"]
          },
          {
            foreignKeyName: "strain_reports_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strain_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strains: {
        Row: {
          approved: boolean
          breeder: string | null
          created_at: string
          created_by: string | null
          description: string | null
          description_cs: string | null
          dominance: string | null
          flowering: string | null
          flowering_weeks_max: number | null
          flowering_weeks_min: number | null
          id: string
          image_credit: string | null
          image_url: string | null
          name: string
          slug: string
        }
        Insert: {
          approved?: boolean
          breeder?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_cs?: string | null
          dominance?: string | null
          flowering?: string | null
          flowering_weeks_max?: number | null
          flowering_weeks_min?: number | null
          id?: string
          image_credit?: string | null
          image_url?: string | null
          name: string
          slug: string
        }
        Update: {
          approved?: boolean
          breeder?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_cs?: string | null
          dominance?: string | null
          flowering?: string | null
          flowering_weeks_max?: number | null
          flowering_weeks_min?: number | null
          id?: string
          image_credit?: string | null
          image_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "strains_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tip_votes: {
        Row: {
          tip_id: string
          user_id: string
          value: number
        }
        Insert: {
          tip_id: string
          user_id: string
          value: number
        }
        Update: {
          tip_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "tip_votes_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tip_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          author_id: string
          body: string
          created_at: string
          environment: string | null
          helpful_count: number
          id: string
          is_hidden: boolean
          medium: string | null
          score: number
          stage: string | null
          unhelpful_count: number
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          environment?: string | null
          helpful_count?: number
          id?: string
          is_hidden?: boolean
          medium?: string | null
          score?: number
          stage?: string | null
          unhelpful_count?: number
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          environment?: string | null
          helpful_count?: number
          id?: string
          is_hidden?: boolean
          medium?: string | null
          score?: number
          stage?: string | null
          unhelpful_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tips_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      challenge_entries_public: {
        Row: {
          caption: string | null
          challenge_id: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          is_hidden: boolean | null
          plant_id: string | null
          user_id: string | null
          votes_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_entries_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "public_plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strain_stats: {
        Row: {
          avg_difficulty: number | null
          avg_flowering_days: number | null
          avg_rating: number | null
          avg_yield_g: number | null
          reports: number | null
          strain_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_terms: { Args: never; Returns: undefined }
      delete_my_account: { Args: never; Returns: undefined }
      finalize_challenge: { Args: { challenge: string }; Returns: number }
      notify: {
        Args: {
          actor: string
          c: string
          kind: string
          p: string
          target: string
        }
        Returns: undefined
      }
      ping_unsolved: { Args: never; Returns: number }
      suggested_growers: {
        Args: { limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          environments: string[]
          id: string
          light_type: string
          media: string[]
          reputation: number
          username: string
        }[]
      }
      wilson: { Args: { down: number; up: number }; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
