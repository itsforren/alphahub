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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ad_spend_daily: {
        Row: {
          budget_daily: number | null
          budget_utilization: number | null
          campaign_enabled: boolean | null
          campaign_id: string
          clicks: number | null
          client_id: string
          conversions: number | null
          cost: number | null
          cpc: number | null
          created_at: string | null
          ctr: number | null
          id: string
          impressions: number | null
          overdelivery: boolean | null
          spend_date: string
          updated_at: string | null
        }
        Insert: {
          budget_daily?: number | null
          budget_utilization?: number | null
          campaign_enabled?: boolean | null
          campaign_id: string
          clicks?: number | null
          client_id: string
          conversions?: number | null
          cost?: number | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          overdelivery?: boolean | null
          spend_date: string
          updated_at?: string | null
        }
        Update: {
          budget_daily?: number | null
          budget_utilization?: number | null
          campaign_enabled?: boolean | null
          campaign_id?: string
          clicks?: number | null
          client_id?: string
          conversions?: number | null
          cost?: number | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          overdelivery?: boolean | null
          spend_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_spend_daily_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "admin_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_channel_messages: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "admin_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_channels: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_dm_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          participant1_id: string
          participant2_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          participant1_id: string
          participant2_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          participant1_id?: string
          participant2_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_dm_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_dm_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_dm_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_otps: {
        Row: {
          agreement_id: string | null
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          otp_hash: string
          phone: string
          verified_at: string | null
        }
        Insert: {
          agreement_id?: string | null
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          otp_hash: string
          phone: string
          verified_at?: string | null
        }
        Update: {
          agreement_id?: string | null
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          otp_hash?: string
          phone?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreement_otps_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          initials_sections: Json | null
          is_active: boolean | null
          key_terms: Json | null
          name: string
          template_id: string
          updated_at: string | null
          version: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          initials_sections?: Json | null
          is_active?: boolean | null
          key_terms?: Json | null
          name?: string
          template_id?: string
          updated_at?: string | null
          version?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          initials_sections?: Json | null
          is_active?: boolean | null
          key_terms?: Json | null
          name?: string
          template_id?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      agreements: {
        Row: {
          audit_events: Json | null
          client_id: string | null
          contract_content: string | null
          contract_content_hash: string | null
          created_at: string | null
          csrf_token_id: string | null
          electronic_intent_accepted: boolean | null
          electronic_intent_accepted_at: string | null
          focus_events: Json | null
          geolocation_city: string | null
          geolocation_region: string | null
          hash_email_message_id: string | null
          hash_emailed_at: string | null
          id: string
          initials_ip_no_copying: string | null
          initials_ip_no_copying_at: string | null
          initials_sections_completed: Json | null
          ip_address: string | null
          ip_forwarded_for: string | null
          key_terms_checkboxes: Json | null
          language_locale: string | null
          otp_provider_receipt: Json | null
          otp_verified: boolean | null
          otp_verified_at: string | null
          page_load_at: string | null
          payment_amount: number | null
          payment_auth_code: string | null
          payment_brand: string | null
          payment_customer_id: string | null
          payment_date: string | null
          payment_invoice_id: string | null
          payment_last4: string | null
          payment_subscription_id: string | null
          pdf_hash: string | null
          pdf_url: string | null
          platform_os: string | null
          printed_name: string | null
          referrer_url: string | null
          screen_resolution: string | null
          scrolled_to_bottom: boolean | null
          scrolled_to_bottom_at: string | null
          session_id: string | null
          signature_drawn_url: string | null
          signature_typed: string | null
          signed_at: string | null
          signed_at_local_offset: number | null
          signer_business_address: string | null
          signer_email: string | null
          signer_full_name: string | null
          signer_license_number: string | null
          signer_license_states: string[] | null
          signer_phone: string | null
          signer_state: string | null
          status: string
          template_id: string | null
          time_on_page_seconds: number | null
          updated_at: string | null
          user_agent: string | null
          utm_params: Json | null
        }
        Insert: {
          audit_events?: Json | null
          client_id?: string | null
          contract_content?: string | null
          contract_content_hash?: string | null
          created_at?: string | null
          csrf_token_id?: string | null
          electronic_intent_accepted?: boolean | null
          electronic_intent_accepted_at?: string | null
          focus_events?: Json | null
          geolocation_city?: string | null
          geolocation_region?: string | null
          hash_email_message_id?: string | null
          hash_emailed_at?: string | null
          id?: string
          initials_ip_no_copying?: string | null
          initials_ip_no_copying_at?: string | null
          initials_sections_completed?: Json | null
          ip_address?: string | null
          ip_forwarded_for?: string | null
          key_terms_checkboxes?: Json | null
          language_locale?: string | null
          otp_provider_receipt?: Json | null
          otp_verified?: boolean | null
          otp_verified_at?: string | null
          page_load_at?: string | null
          payment_amount?: number | null
          payment_auth_code?: string | null
          payment_brand?: string | null
          payment_customer_id?: string | null
          payment_date?: string | null
          payment_invoice_id?: string | null
          payment_last4?: string | null
          payment_subscription_id?: string | null
          pdf_hash?: string | null
          pdf_url?: string | null
          platform_os?: string | null
          printed_name?: string | null
          referrer_url?: string | null
          screen_resolution?: string | null
          scrolled_to_bottom?: boolean | null
          scrolled_to_bottom_at?: string | null
          session_id?: string | null
          signature_drawn_url?: string | null
          signature_typed?: string | null
          signed_at?: string | null
          signed_at_local_offset?: number | null
          signer_business_address?: string | null
          signer_email?: string | null
          signer_full_name?: string | null
          signer_license_number?: string | null
          signer_license_states?: string[] | null
          signer_phone?: string | null
          signer_state?: string | null
          status?: string
          template_id?: string | null
          time_on_page_seconds?: number | null
          updated_at?: string | null
          user_agent?: string | null
          utm_params?: Json | null
        }
        Update: {
          audit_events?: Json | null
          client_id?: string | null
          contract_content?: string | null
          contract_content_hash?: string | null
          created_at?: string | null
          csrf_token_id?: string | null
          electronic_intent_accepted?: boolean | null
          electronic_intent_accepted_at?: string | null
          focus_events?: Json | null
          geolocation_city?: string | null
          geolocation_region?: string | null
          hash_email_message_id?: string | null
          hash_emailed_at?: string | null
          id?: string
          initials_ip_no_copying?: string | null
          initials_ip_no_copying_at?: string | null
          initials_sections_completed?: Json | null
          ip_address?: string | null
          ip_forwarded_for?: string | null
          key_terms_checkboxes?: Json | null
          language_locale?: string | null
          otp_provider_receipt?: Json | null
          otp_verified?: boolean | null
          otp_verified_at?: string | null
          page_load_at?: string | null
          payment_amount?: number | null
          payment_auth_code?: string | null
          payment_brand?: string | null
          payment_customer_id?: string | null
          payment_date?: string | null
          payment_invoice_id?: string | null
          payment_last4?: string | null
          payment_subscription_id?: string | null
          pdf_hash?: string | null
          pdf_url?: string | null
          platform_os?: string | null
          printed_name?: string | null
          referrer_url?: string | null
          screen_resolution?: string | null
          scrolled_to_bottom?: boolean | null
          scrolled_to_bottom_at?: string | null
          session_id?: string | null
          signature_drawn_url?: string | null
          signature_typed?: string | null
          signed_at?: string | null
          signed_at_local_offset?: number | null
          signer_business_address?: string | null
          signer_email?: string | null
          signer_full_name?: string | null
          signer_license_number?: string | null
          signer_license_states?: string[] | null
          signer_phone?: string | null
          signer_state?: string | null
          status?: string
          template_id?: string | null
          time_on_page_seconds?: number | null
          updated_at?: string | null
          user_agent?: string | null
          utm_params?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agreements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_category: string
          account_label: string | null
          account_name: string
          account_subtype: string | null
          account_type: string
          available_balance: number | null
          created_at: string
          currency_code: string | null
          current_balance: number | null
          id: string
          institution_id: string | null
          institution_name: string
          is_active: boolean
          is_manual: boolean
          last_synced_at: string | null
          mask: string | null
          plaid_access_token_encrypted: string | null
          plaid_account_id: string | null
          plaid_item_id: string | null
          sync_cursor: string | null
          updated_at: string
        }
        Insert: {
          account_category?: string
          account_label?: string | null
          account_name: string
          account_subtype?: string | null
          account_type?: string
          available_balance?: number | null
          created_at?: string
          currency_code?: string | null
          current_balance?: number | null
          id?: string
          institution_id?: string | null
          institution_name: string
          is_active?: boolean
          is_manual?: boolean
          last_synced_at?: string | null
          mask?: string | null
          plaid_access_token_encrypted?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          sync_cursor?: string | null
          updated_at?: string
        }
        Update: {
          account_category?: string
          account_label?: string | null
          account_name?: string
          account_subtype?: string | null
          account_type?: string
          available_balance?: number | null
          created_at?: string
          currency_code?: string | null
          current_balance?: number | null
          id?: string
          institution_id?: string | null
          institution_name?: string
          is_active?: boolean
          is_manual?: boolean
          last_synced_at?: string | null
          mask?: string | null
          plaid_access_token_encrypted?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          sync_cursor?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      billing_collection_events: {
        Row: {
          collection_id: string
          created_at: string
          created_by: string | null
          email_subject: string | null
          email_template: string | null
          error_message: string | null
          event_type: string
          id: string
          notes: string | null
          recipient_email: string | null
          status_from: string | null
          status_to: string | null
        }
        Insert: {
          collection_id: string
          created_at?: string
          created_by?: string | null
          email_subject?: string | null
          email_template?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          notes?: string | null
          recipient_email?: string | null
          status_from?: string | null
          status_to?: string | null
        }
        Update: {
          collection_id?: string
          created_at?: string
          created_by?: string | null
          email_subject?: string | null
          email_template?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          notes?: string | null
          recipient_email?: string | null
          status_from?: string | null
          status_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_collection_events_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "billing_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_collections: {
        Row: {
          billing_record_id: string
          client_id: string
          created_at: string
          email_stage: string | null
          escalated_at: string | null
          id: string
          last_email_sent_at: string | null
          next_action_at: string | null
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          billing_record_id: string
          client_id: string
          created_at?: string
          email_stage?: string | null
          escalated_at?: string | null
          id?: string
          last_email_sent_at?: string | null
          next_action_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          billing_record_id?: string
          client_id?: string
          created_at?: string
          email_stage?: string | null
          escalated_at?: string | null
          id?: string
          last_email_sent_at?: string | null
          next_action_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_collections_billing_record_id_fkey"
            columns: ["billing_record_id"]
            isOneToOne: false
            referencedRelation: "billing_records"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_records: {
        Row: {
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          billing_type: Database["public"]["Enums"]["billing_type"]
          charge_attempts: number | null
          client_id: string
          client_name: string | null
          created_at: string
          credit_amount_used: number | null
          credit_applied_id: string | null
          due_date: string | null
          id: string
          is_recurring_parent: boolean | null
          last_charge_error: string | null
          next_due_date: string | null
          notes: string | null
          paid_at: string | null
          parent_billing_id: string | null
          payment_link: string | null
          payment_reference: string | null
          recurrence_type: string | null
          status: Database["public"]["Enums"]["billing_status"]
          stripe_account: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          billing_type: Database["public"]["Enums"]["billing_type"]
          charge_attempts?: number | null
          client_id: string
          client_name?: string | null
          created_at?: string
          credit_amount_used?: number | null
          credit_applied_id?: string | null
          due_date?: string | null
          id?: string
          is_recurring_parent?: boolean | null
          last_charge_error?: string | null
          next_due_date?: string | null
          notes?: string | null
          paid_at?: string | null
          parent_billing_id?: string | null
          payment_link?: string | null
          payment_reference?: string | null
          recurrence_type?: string | null
          status?: Database["public"]["Enums"]["billing_status"]
          stripe_account?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          billing_type?: Database["public"]["Enums"]["billing_type"]
          charge_attempts?: number | null
          client_id?: string
          client_name?: string | null
          created_at?: string
          credit_amount_used?: number | null
          credit_applied_id?: string | null
          due_date?: string | null
          id?: string
          is_recurring_parent?: boolean | null
          last_charge_error?: string | null
          next_due_date?: string | null
          notes?: string | null
          paid_at?: string | null
          parent_billing_id?: string | null
          payment_link?: string | null
          payment_reference?: string | null
          recurrence_type?: string | null
          status?: Database["public"]["Enums"]["billing_status"]
          stripe_account?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_credit_applied_id_fkey"
            columns: ["credit_applied_id"]
            isOneToOne: false
            referencedRelation: "client_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_parent_billing_id_fkey"
            columns: ["parent_billing_id"]
            isOneToOne: false
            referencedRelation: "billing_records"
            referencedColumns: ["id"]
          },
        ]
      }
      business_screenshots: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          action_items: string[] | null
          call_date: string
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          fathom_call_id: string | null
          id: string
          key_topics: string[] | null
          prospect_id: string
          recording_url: string | null
          sentiment: string | null
          summary: string | null
        }
        Insert: {
          action_items?: string[] | null
          call_date?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          fathom_call_id?: string | null
          id?: string
          key_topics?: string[] | null
          prospect_id: string
          recording_url?: string | null
          sentiment?: string | null
          summary?: string | null
        }
        Update: {
          action_items?: string[] | null
          call_date?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          fathom_call_id?: string | null
          id?: string
          key_topics?: string[] | null
          prospect_id?: string
          recording_url?: string | null
          sentiment?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_audit_log: {
        Row: {
          action: string
          actor: string
          actor_user_id: string | null
          campaign_id: string | null
          client_id: string | null
          created_at: string | null
          id: string
          new_value: Json | null
          notes: string | null
          old_value: Json | null
          proposal_id: string | null
          reason_codes: string[] | null
        }
        Insert: {
          action: string
          actor: string
          actor_user_id?: string | null
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          proposal_id?: string | null
          reason_codes?: string[] | null
        }
        Update: {
          action?: string
          actor?: string
          actor_user_id?: string | null
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          proposal_id?: string | null
          reason_codes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_audit_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_audit_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_audit_log_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_settings: {
        Row: {
          ai_provider: string | null
          auto_approve_green: boolean | null
          auto_approve_red: boolean | null
          auto_approve_yellow: boolean | null
          campaign_id: string | null
          clicks_no_conv_threshold: number | null
          cpl_yellow_threshold: number | null
          created_at: string | null
          ctr_red_threshold: number | null
          custom_ai_server_url: string | null
          cvr_red_threshold: number | null
          id: string
          max_budget_change_pct: number | null
          no_conv_spend_threshold: number | null
          not_spending_budget_threshold: number | null
          not_spending_spend_threshold: number | null
          policy_version: string | null
          reminder_quiet_hours_end: number | null
          reminder_quiet_hours_start: number | null
          safe_mode_auto_trigger: boolean | null
          slack_webhook_url: string | null
          target_spend_pct: number | null
          updated_at: string | null
        }
        Insert: {
          ai_provider?: string | null
          auto_approve_green?: boolean | null
          auto_approve_red?: boolean | null
          auto_approve_yellow?: boolean | null
          campaign_id?: string | null
          clicks_no_conv_threshold?: number | null
          cpl_yellow_threshold?: number | null
          created_at?: string | null
          ctr_red_threshold?: number | null
          custom_ai_server_url?: string | null
          cvr_red_threshold?: number | null
          id?: string
          max_budget_change_pct?: number | null
          no_conv_spend_threshold?: number | null
          not_spending_budget_threshold?: number | null
          not_spending_spend_threshold?: number | null
          policy_version?: string | null
          reminder_quiet_hours_end?: number | null
          reminder_quiet_hours_start?: number | null
          safe_mode_auto_trigger?: boolean | null
          slack_webhook_url?: string | null
          target_spend_pct?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_provider?: string | null
          auto_approve_green?: boolean | null
          auto_approve_red?: boolean | null
          auto_approve_yellow?: boolean | null
          campaign_id?: string | null
          clicks_no_conv_threshold?: number | null
          cpl_yellow_threshold?: number | null
          created_at?: string | null
          ctr_red_threshold?: number | null
          custom_ai_server_url?: string | null
          cvr_red_threshold?: number | null
          id?: string
          max_budget_change_pct?: number | null
          no_conv_spend_threshold?: number | null
          not_spending_budget_threshold?: number | null
          not_spending_spend_threshold?: number | null
          policy_version?: string | null
          reminder_quiet_hours_end?: number | null
          reminder_quiet_hours_start?: number | null
          safe_mode_auto_trigger?: boolean | null
          slack_webhook_url?: string | null
          target_spend_pct?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_settings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ai_summary: string | null
          apps_submitted_7d: number | null
          booked_call_rate_7d: number | null
          booked_call_rate_prior_7d: number | null
          booked_call_rate_yesterday: number | null
          booked_calls_last_7d: number | null
          booked_calls_prior_7d: number | null
          booked_calls_yesterday: number | null
          client_id: string
          cp_issued_paid_7d: number | null
          cpbc_7d: number | null
          cpsa_7d: number | null
          created_at: string | null
          current_daily_budget: number | null
          days_remaining_in_cycle: number | null
          google_campaign_id: string
          google_customer_id: string
          health_drivers: Json | null
          health_label: string | null
          health_score: number | null
          health_score_booked_call: number | null
          health_score_cpl: number | null
          health_score_cvr: number | null
          health_score_delivery: number | null
          health_score_downstream: number | null
          id: string
          ignored: boolean | null
          ignored_at: string | null
          ignored_by: string | null
          ignored_reason: string | null
          ignored_until: string | null
          issued_paid_7d: number | null
          last_budget_change_at: string | null
          last_budget_change_by: string | null
          last_status_change_at: string | null
          leads_last_7d: number | null
          leads_prior_7d: number | null
          leads_yesterday: number | null
          pace_drift_pct: number | null
          pre_safe_mode_budget: number | null
          reason_codes: string[] | null
          required_daily_spend: number | null
          safe_mode: boolean | null
          safe_mode_budget_used: number | null
          safe_mode_reason: string | null
          safe_mode_triggered_at: string | null
          status: string | null
          updated_at: string | null
          wallet_remaining: number | null
        }
        Insert: {
          ai_summary?: string | null
          apps_submitted_7d?: number | null
          booked_call_rate_7d?: number | null
          booked_call_rate_prior_7d?: number | null
          booked_call_rate_yesterday?: number | null
          booked_calls_last_7d?: number | null
          booked_calls_prior_7d?: number | null
          booked_calls_yesterday?: number | null
          client_id: string
          cp_issued_paid_7d?: number | null
          cpbc_7d?: number | null
          cpsa_7d?: number | null
          created_at?: string | null
          current_daily_budget?: number | null
          days_remaining_in_cycle?: number | null
          google_campaign_id: string
          google_customer_id: string
          health_drivers?: Json | null
          health_label?: string | null
          health_score?: number | null
          health_score_booked_call?: number | null
          health_score_cpl?: number | null
          health_score_cvr?: number | null
          health_score_delivery?: number | null
          health_score_downstream?: number | null
          id?: string
          ignored?: boolean | null
          ignored_at?: string | null
          ignored_by?: string | null
          ignored_reason?: string | null
          ignored_until?: string | null
          issued_paid_7d?: number | null
          last_budget_change_at?: string | null
          last_budget_change_by?: string | null
          last_status_change_at?: string | null
          leads_last_7d?: number | null
          leads_prior_7d?: number | null
          leads_yesterday?: number | null
          pace_drift_pct?: number | null
          pre_safe_mode_budget?: number | null
          reason_codes?: string[] | null
          required_daily_spend?: number | null
          safe_mode?: boolean | null
          safe_mode_budget_used?: number | null
          safe_mode_reason?: string | null
          safe_mode_triggered_at?: string | null
          status?: string | null
          updated_at?: string | null
          wallet_remaining?: number | null
        }
        Update: {
          ai_summary?: string | null
          apps_submitted_7d?: number | null
          booked_call_rate_7d?: number | null
          booked_call_rate_prior_7d?: number | null
          booked_call_rate_yesterday?: number | null
          booked_calls_last_7d?: number | null
          booked_calls_prior_7d?: number | null
          booked_calls_yesterday?: number | null
          client_id?: string
          cp_issued_paid_7d?: number | null
          cpbc_7d?: number | null
          cpsa_7d?: number | null
          created_at?: string | null
          current_daily_budget?: number | null
          days_remaining_in_cycle?: number | null
          google_campaign_id?: string
          google_customer_id?: string
          health_drivers?: Json | null
          health_label?: string | null
          health_score?: number | null
          health_score_booked_call?: number | null
          health_score_cpl?: number | null
          health_score_cvr?: number | null
          health_score_delivery?: number | null
          health_score_downstream?: number | null
          id?: string
          ignored?: boolean | null
          ignored_at?: string | null
          ignored_by?: string | null
          ignored_reason?: string | null
          ignored_until?: string | null
          issued_paid_7d?: number | null
          last_budget_change_at?: string | null
          last_budget_change_by?: string | null
          last_status_change_at?: string | null
          leads_last_7d?: number | null
          leads_prior_7d?: number | null
          leads_yesterday?: number | null
          pace_drift_pct?: number | null
          pre_safe_mode_budget?: number | null
          reason_codes?: string[] | null
          required_daily_spend?: number | null
          safe_mode?: boolean | null
          safe_mode_budget_used?: number | null
          safe_mode_reason?: string | null
          safe_mode_triggered_at?: string | null
          status?: string | null
          updated_at?: string | null
          wallet_remaining?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      categorization_rules: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          match_field: string
          match_type: string
          match_value: string
          priority: number
          rule_name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          match_field?: string
          match_type?: string
          match_value: string
          priority?: number
          rule_name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          match_field?: string
          match_type?: string
          match_value?: string
          priority?: number
          rule_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorization_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          status: string
          unread_count_admin: number
          unread_count_client: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          status?: string
          unread_count_admin?: number
          unread_count_client?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          status?: string
          unread_count_admin?: number
          unread_count_client?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          conversation_id: string
          created_at: string
          id: string
          link_preview: Json | null
          message: string
          read_at: string | null
          sender_avatar_url: string | null
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          link_preview?: Json | null
          message: string
          read_at?: string | null
          sender_avatar_url?: string | null
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          link_preview?: Json | null
          message?: string
          read_at?: string | null
          sender_avatar_url?: string | null
          sender_id?: string
          sender_name?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      client_credits: {
        Row: {
          amount: number
          applied_at: string | null
          applied_to_billing_id: string | null
          client_id: string
          created_at: string
          credit_type: string
          expires_at: string | null
          id: string
          original_amount: number
          reason: string
          remaining_balance: number
          updated_at: string
        }
        Insert: {
          amount: number
          applied_at?: string | null
          applied_to_billing_id?: string | null
          client_id: string
          created_at?: string
          credit_type?: string
          expires_at?: string | null
          id?: string
          original_amount: number
          reason: string
          remaining_balance: number
          updated_at?: string
        }
        Update: {
          amount?: number
          applied_at?: string | null
          applied_to_billing_id?: string | null
          client_id?: string
          created_at?: string
          credit_type?: string
          expires_at?: string | null
          id?: string
          original_amount?: number
          reason?: string
          remaining_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_credits_applied_to_billing_id_fkey"
            columns: ["applied_to_billing_id"]
            isOneToOne: false
            referencedRelation: "billing_records"
            referencedColumns: ["id"]
          },
        ]
      }
      client_kpi_daily: {
        Row: {
          ad_spend: number | null
          app_rate: number | null
          approvals: number | null
          approved_premium: number | null
          apps_submitted: number | null
          booked_calls: number | null
          booked_rate: number | null
          clicks: number | null
          client_id: string
          conversions: number | null
          cp_issued_paid: number | null
          cpbc: number | null
          cpl: number | null
          cpsa: number | null
          created_at: string | null
          date: string
          declines: number | null
          id: string
          issued_paid: number | null
          issued_premium: number | null
          issued_rate: number | null
          leads: number | null
          shows: number | null
          submitted_premium: number | null
          updated_at: string | null
        }
        Insert: {
          ad_spend?: number | null
          app_rate?: number | null
          approvals?: number | null
          approved_premium?: number | null
          apps_submitted?: number | null
          booked_calls?: number | null
          booked_rate?: number | null
          clicks?: number | null
          client_id: string
          conversions?: number | null
          cp_issued_paid?: number | null
          cpbc?: number | null
          cpl?: number | null
          cpsa?: number | null
          created_at?: string | null
          date: string
          declines?: number | null
          id?: string
          issued_paid?: number | null
          issued_premium?: number | null
          issued_rate?: number | null
          leads?: number | null
          shows?: number | null
          submitted_premium?: number | null
          updated_at?: string | null
        }
        Update: {
          ad_spend?: number | null
          app_rate?: number | null
          approvals?: number | null
          approved_premium?: number | null
          apps_submitted?: number | null
          booked_calls?: number | null
          booked_rate?: number | null
          clicks?: number | null
          client_id?: string
          conversions?: number | null
          cp_issued_paid?: number | null
          cpbc?: number | null
          cpl?: number | null
          cpsa?: number | null
          created_at?: string | null
          date?: string
          declines?: number | null
          id?: string
          issued_paid?: number | null
          issued_premium?: number | null
          issued_rate?: number | null
          leads?: number | null
          shows?: number | null
          submitted_premium?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      client_kpi_rolling: {
        Row: {
          ad_spend_7d: number | null
          ad_spend_prior_7d: number | null
          apps_submitted_7d: number | null
          booked_calls_7d: number | null
          booked_calls_prior_7d: number | null
          booked_rate_7d: number | null
          booked_rate_delta: number | null
          client_id: string
          cp_issued_paid_7d: number | null
          cpbc_7d: number | null
          cpbc_delta: number | null
          cpbc_prior_7d: number | null
          cpsa_7d: number | null
          created_at: string | null
          id: string
          issued_paid_7d: number | null
          leads_7d: number | null
          leads_prior_7d: number | null
          snapshot_date: string
        }
        Insert: {
          ad_spend_7d?: number | null
          ad_spend_prior_7d?: number | null
          apps_submitted_7d?: number | null
          booked_calls_7d?: number | null
          booked_calls_prior_7d?: number | null
          booked_rate_7d?: number | null
          booked_rate_delta?: number | null
          client_id: string
          cp_issued_paid_7d?: number | null
          cpbc_7d?: number | null
          cpbc_delta?: number | null
          cpbc_prior_7d?: number | null
          cpsa_7d?: number | null
          created_at?: string | null
          id?: string
          issued_paid_7d?: number | null
          leads_7d?: number | null
          leads_prior_7d?: number | null
          snapshot_date: string
        }
        Update: {
          ad_spend_7d?: number | null
          ad_spend_prior_7d?: number | null
          apps_submitted_7d?: number | null
          booked_calls_7d?: number | null
          booked_calls_prior_7d?: number | null
          booked_rate_7d?: number | null
          booked_rate_delta?: number | null
          client_id?: string
          cp_issued_paid_7d?: number | null
          cpbc_7d?: number | null
          cpbc_delta?: number | null
          cpbc_prior_7d?: number | null
          cpsa_7d?: number | null
          created_at?: string | null
          id?: string
          issued_paid_7d?: number | null
          leads_7d?: number | null
          leads_prior_7d?: number | null
          snapshot_date?: string
        }
        Relationships: []
      }
      client_payment_methods: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last_four: string | null
          client_id: string
          created_at: string | null
          id: string
          is_default: boolean | null
          stripe_account: string
          stripe_customer_id: string
          stripe_payment_method_id: string
          updated_at: string | null
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stripe_account: string
          stripe_customer_id: string
          stripe_payment_method_id: string
          updated_at?: string | null
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stripe_account?: string
          stripe_customer_id?: string
          stripe_payment_method_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      client_self_onboarding: {
        Row: {
          client_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string
          display_order: number | null
          help_url: string | null
          id: string
          task_key: string
          task_label: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          display_order?: number | null
          help_url?: string | null
          id?: string
          task_key: string
          task_label: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          display_order?: number | null
          help_url?: string | null
          id?: string
          task_key?: string
          task_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_self_onboarding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_stripe_customers: {
        Row: {
          client_id: string
          created_at: string
          id: string
          stripe_account: string
          stripe_customer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          stripe_account: string
          stripe_customer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          stripe_account?: string
          stripe_customer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_stripe_subscriptions: {
        Row: {
          amount: number
          billing_type: string
          canceled_at: string | null
          client_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          recurrence_type: string | null
          status: string
          stripe_account: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_type?: string
          canceled_at?: string | null
          client_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          recurrence_type?: string | null
          status?: string
          stripe_account: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_type?: string
          canceled_at?: string | null
          client_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          recurrence_type?: string | null
          status?: string
          stripe_account?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_wallets: {
        Row: {
          ad_spend_balance: number
          auto_billing_enabled: boolean | null
          auto_charge_amount: number | null
          billing_mode: string | null
          client_id: string
          created_at: string
          id: string
          last_auto_charge_at: string | null
          last_calculated_at: string | null
          last_charge_failed_at: string | null
          low_balance_threshold: number
          monthly_ad_spend_cap: number | null
          tracking_start_date: string | null
          updated_at: string
        }
        Insert: {
          ad_spend_balance?: number
          auto_billing_enabled?: boolean | null
          auto_charge_amount?: number | null
          billing_mode?: string | null
          client_id: string
          created_at?: string
          id?: string
          last_auto_charge_at?: string | null
          last_calculated_at?: string | null
          last_charge_failed_at?: string | null
          low_balance_threshold?: number
          monthly_ad_spend_cap?: number | null
          tracking_start_date?: string | null
          updated_at?: string
        }
        Update: {
          ad_spend_balance?: number
          auto_billing_enabled?: boolean | null
          auto_charge_amount?: number | null
          billing_mode?: string | null
          client_id?: string
          created_at?: string
          id?: string
          last_auto_charge_at?: string | null
          last_calculated_at?: string | null
          last_charge_failed_at?: string | null
          low_balance_threshold?: number
          monthly_ad_spend_cap?: number | null
          tracking_start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          a2p_brand_id: string | null
          a2p_brand_status: string | null
          a2p_campaign_id: string | null
          a2p_campaign_status: string | null
          a2p_last_synced_at: string | null
          ad_spend_budget: number | null
          ad_spend_renewal: string | null
          address_city: string | null
          address_country: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          ads_link: string | null
          ads_live: boolean | null
          agent_bio_input: string | null
          agent_id: string | null
          agreement_id: string | null
          agreement_link: string | null
          ai_bio: string | null
          allow_agent_self_topup: boolean | null
          applications: number | null
          automation_completed_at: string | null
          automation_started_at: string | null
          behind_target: number | null
          billing_cycle_end_at: string | null
          billing_cycle_start_at: string | null
          billing_frequency: string | null
          billing_status: string | null
          booked_calls: number | null
          churn_reason: string | null
          commission_contract_percent: number | null
          contract_signed_at: string | null
          conversion_rate: number | null
          cpa: number | null
          cpba: number | null
          cpc: number | null
          cpl: number | null
          created_at: string
          crm_delivery_enabled: boolean | null
          crm_link: string | null
          ctr: number | null
          current_quota: number | null
          custom_agreement_content: string | null
          deleted_at: string | null
          deleted_by: string | null
          discovery_calendar_id: string | null
          email: string
          end_date: string | null
          filters_notes: string | null
          gads_ad_created: boolean | null
          gads_adgroup_created: boolean | null
          gads_campaign_created: boolean | null
          gads_creation_error: string | null
          gads_last_attempt_at: string | null
          ghl_agent_ref: string | null
          ghl_contact_id: string | null
          ghl_phone_number: string | null
          ghl_user_id: string | null
          google_campaign_id: string | null
          headshot_updated_at: string | null
          historical_total_paid: number | null
          id: string
          lander_link: string | null
          last_nps_prompt_at: string | null
          made_review: boolean | null
          management_fee: number | null
          management_fee_renewal: string | null
          monthly_ad_spend: number | null
          mtd_ad_spend: number | null
          mtd_leads: number | null
          name: string
          nfia_link: string | null
          npn: string | null
          nps_prompt_count: number | null
          nps_score: number | null
          onboarding_call_scheduled_at: string | null
          onboarding_status:
            | Database["public"]["Enums"]["onboarding_status"]
            | null
          package_type: string | null
          password_set_at: string | null
          phone: string | null
          profile_image_url: string | null
          profit_margin: number | null
          prospect_id: string | null
          referral_code: string | null
          referred_by_client_id: string | null
          renewal_date: string | null
          scheduler_link: string | null
          stage_messages_sent: Json | null
          start_date: string | null
          states: string | null
          status: string
          subaccount_id: string | null
          success_manager_email: string | null
          success_manager_image_url: string | null
          success_manager_name: string | null
          success_manager_phone: string | null
          target_daily_spend: number | null
          team: string | null
          tfwp_profile_link: string | null
          thankyou_link: string | null
          timezone: string | null
          total_delivered: number | null
          updated_at: string
          url_slug: string | null
          user_id: string | null
          webflow_lander_id: string | null
          webflow_profile_id: string | null
          webflow_scheduler_id: string | null
          webflow_thankyou_id: string | null
          welcome_message_sent: boolean | null
        }
        Insert: {
          a2p_brand_id?: string | null
          a2p_brand_status?: string | null
          a2p_campaign_id?: string | null
          a2p_campaign_status?: string | null
          a2p_last_synced_at?: string | null
          ad_spend_budget?: number | null
          ad_spend_renewal?: string | null
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          ads_link?: string | null
          ads_live?: boolean | null
          agent_bio_input?: string | null
          agent_id?: string | null
          agreement_id?: string | null
          agreement_link?: string | null
          ai_bio?: string | null
          allow_agent_self_topup?: boolean | null
          applications?: number | null
          automation_completed_at?: string | null
          automation_started_at?: string | null
          behind_target?: number | null
          billing_cycle_end_at?: string | null
          billing_cycle_start_at?: string | null
          billing_frequency?: string | null
          billing_status?: string | null
          booked_calls?: number | null
          churn_reason?: string | null
          commission_contract_percent?: number | null
          contract_signed_at?: string | null
          conversion_rate?: number | null
          cpa?: number | null
          cpba?: number | null
          cpc?: number | null
          cpl?: number | null
          created_at?: string
          crm_delivery_enabled?: boolean | null
          crm_link?: string | null
          ctr?: number | null
          current_quota?: number | null
          custom_agreement_content?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discovery_calendar_id?: string | null
          email: string
          end_date?: string | null
          filters_notes?: string | null
          gads_ad_created?: boolean | null
          gads_adgroup_created?: boolean | null
          gads_campaign_created?: boolean | null
          gads_creation_error?: string | null
          gads_last_attempt_at?: string | null
          ghl_agent_ref?: string | null
          ghl_contact_id?: string | null
          ghl_phone_number?: string | null
          ghl_user_id?: string | null
          google_campaign_id?: string | null
          headshot_updated_at?: string | null
          historical_total_paid?: number | null
          id?: string
          lander_link?: string | null
          last_nps_prompt_at?: string | null
          made_review?: boolean | null
          management_fee?: number | null
          management_fee_renewal?: string | null
          monthly_ad_spend?: number | null
          mtd_ad_spend?: number | null
          mtd_leads?: number | null
          name: string
          nfia_link?: string | null
          npn?: string | null
          nps_prompt_count?: number | null
          nps_score?: number | null
          onboarding_call_scheduled_at?: string | null
          onboarding_status?:
            | Database["public"]["Enums"]["onboarding_status"]
            | null
          package_type?: string | null
          password_set_at?: string | null
          phone?: string | null
          profile_image_url?: string | null
          profit_margin?: number | null
          prospect_id?: string | null
          referral_code?: string | null
          referred_by_client_id?: string | null
          renewal_date?: string | null
          scheduler_link?: string | null
          stage_messages_sent?: Json | null
          start_date?: string | null
          states?: string | null
          status?: string
          subaccount_id?: string | null
          success_manager_email?: string | null
          success_manager_image_url?: string | null
          success_manager_name?: string | null
          success_manager_phone?: string | null
          target_daily_spend?: number | null
          team?: string | null
          tfwp_profile_link?: string | null
          thankyou_link?: string | null
          timezone?: string | null
          total_delivered?: number | null
          updated_at?: string
          url_slug?: string | null
          user_id?: string | null
          webflow_lander_id?: string | null
          webflow_profile_id?: string | null
          webflow_scheduler_id?: string | null
          webflow_thankyou_id?: string | null
          welcome_message_sent?: boolean | null
        }
        Update: {
          a2p_brand_id?: string | null
          a2p_brand_status?: string | null
          a2p_campaign_id?: string | null
          a2p_campaign_status?: string | null
          a2p_last_synced_at?: string | null
          ad_spend_budget?: number | null
          ad_spend_renewal?: string | null
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          ads_link?: string | null
          ads_live?: boolean | null
          agent_bio_input?: string | null
          agent_id?: string | null
          agreement_id?: string | null
          agreement_link?: string | null
          ai_bio?: string | null
          allow_agent_self_topup?: boolean | null
          applications?: number | null
          automation_completed_at?: string | null
          automation_started_at?: string | null
          behind_target?: number | null
          billing_cycle_end_at?: string | null
          billing_cycle_start_at?: string | null
          billing_frequency?: string | null
          billing_status?: string | null
          booked_calls?: number | null
          churn_reason?: string | null
          commission_contract_percent?: number | null
          contract_signed_at?: string | null
          conversion_rate?: number | null
          cpa?: number | null
          cpba?: number | null
          cpc?: number | null
          cpl?: number | null
          created_at?: string
          crm_delivery_enabled?: boolean | null
          crm_link?: string | null
          ctr?: number | null
          current_quota?: number | null
          custom_agreement_content?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discovery_calendar_id?: string | null
          email?: string
          end_date?: string | null
          filters_notes?: string | null
          gads_ad_created?: boolean | null
          gads_adgroup_created?: boolean | null
          gads_campaign_created?: boolean | null
          gads_creation_error?: string | null
          gads_last_attempt_at?: string | null
          ghl_agent_ref?: string | null
          ghl_contact_id?: string | null
          ghl_phone_number?: string | null
          ghl_user_id?: string | null
          google_campaign_id?: string | null
          headshot_updated_at?: string | null
          historical_total_paid?: number | null
          id?: string
          lander_link?: string | null
          last_nps_prompt_at?: string | null
          made_review?: boolean | null
          management_fee?: number | null
          management_fee_renewal?: string | null
          monthly_ad_spend?: number | null
          mtd_ad_spend?: number | null
          mtd_leads?: number | null
          name?: string
          nfia_link?: string | null
          npn?: string | null
          nps_prompt_count?: number | null
          nps_score?: number | null
          onboarding_call_scheduled_at?: string | null
          onboarding_status?:
            | Database["public"]["Enums"]["onboarding_status"]
            | null
          package_type?: string | null
          password_set_at?: string | null
          phone?: string | null
          profile_image_url?: string | null
          profit_margin?: number | null
          prospect_id?: string | null
          referral_code?: string | null
          referred_by_client_id?: string | null
          renewal_date?: string | null
          scheduler_link?: string | null
          stage_messages_sent?: Json | null
          start_date?: string | null
          states?: string | null
          status?: string
          subaccount_id?: string | null
          success_manager_email?: string | null
          success_manager_image_url?: string | null
          success_manager_name?: string | null
          success_manager_phone?: string | null
          target_daily_spend?: number | null
          team?: string | null
          tfwp_profile_link?: string | null
          thankyou_link?: string | null
          timezone?: string | null
          total_delivered?: number | null
          updated_at?: string
          url_slug?: string | null
          user_id?: string | null
          webflow_lander_id?: string | null
          webflow_profile_id?: string | null
          webflow_scheduler_id?: string | null
          webflow_thankyou_id?: string | null
          welcome_message_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_referred_by_client_id_fkey"
            columns: ["referred_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          body: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          amount: number | null
          body: string
          client_initials: string | null
          created_at: string | null
          id: string
          is_pinned: boolean | null
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          body: string
          client_initials?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number | null
          body?: string
          client_initials?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      conversions: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          email: string
          first_touch_campaign: string | null
          first_touch_source: string | null
          id: string
          last_touch_campaign: string | null
          last_touch_source: string | null
          lead_id: string | null
          payment_status: string | null
          product_name: string | null
          stripe_customer_id: string | null
          transaction_id: string
          visitor_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          email: string
          first_touch_campaign?: string | null
          first_touch_source?: string | null
          id?: string
          last_touch_campaign?: string | null
          last_touch_source?: string | null
          lead_id?: string | null
          payment_status?: string | null
          product_name?: string | null
          stripe_customer_id?: string | null
          transaction_id: string
          visitor_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          email?: string
          first_touch_campaign?: string | null
          first_touch_source?: string | null
          id?: string
          last_touch_campaign?: string | null
          last_touch_source?: string | null
          lead_id?: string | null
          payment_status?: string | null
          product_name?: string | null
          stripe_customer_id?: string | null
          transaction_id?: string
          visitor_id?: string | null
        }
        Relationships: []
      }
      course_user_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          last_activity_at: string | null
          started_at: string
          total_time_spent_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          last_activity_at?: string | null
          started_at?: string
          total_time_spent_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          last_activity_at?: string | null
          started_at?: string
          total_time_spent_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_user_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      decision_events: {
        Row: {
          ai_provider: string | null
          campaign_id: string | null
          client_id: string | null
          confidence_override: string | null
          created_at: string | null
          decision_at: string | null
          decision_outcome: string | null
          decision_type: string | null
          features_at_decision: Json
          final_action_type: string | null
          final_daily_budget: number | null
          final_delta_pct: number | null
          id: string
          next_action: string | null
          outcome_1d: Json | null
          outcome_3d: Json | null
          outcome_7d: Json | null
          outcome_score_3d: number | null
          outcome_score_7d: number | null
          policy_version: string | null
          primary_reason_category: string | null
          proposal_id: string | null
          proposed_action_type: string | null
          proposed_daily_budget: number | null
          proposed_delta_pct: number | null
          proposed_pacing_info: Json | null
          reason_codes: string[] | null
          recommendation_confidence: number | null
          similar_cases_ids: string[] | null
          specific_reason_codes: string[] | null
          status_at_decision: string | null
          updated_at: string | null
          user_note: string | null
          was_approved: boolean | null
        }
        Insert: {
          ai_provider?: string | null
          campaign_id?: string | null
          client_id?: string | null
          confidence_override?: string | null
          created_at?: string | null
          decision_at?: string | null
          decision_outcome?: string | null
          decision_type?: string | null
          features_at_decision?: Json
          final_action_type?: string | null
          final_daily_budget?: number | null
          final_delta_pct?: number | null
          id?: string
          next_action?: string | null
          outcome_1d?: Json | null
          outcome_3d?: Json | null
          outcome_7d?: Json | null
          outcome_score_3d?: number | null
          outcome_score_7d?: number | null
          policy_version?: string | null
          primary_reason_category?: string | null
          proposal_id?: string | null
          proposed_action_type?: string | null
          proposed_daily_budget?: number | null
          proposed_delta_pct?: number | null
          proposed_pacing_info?: Json | null
          reason_codes?: string[] | null
          recommendation_confidence?: number | null
          similar_cases_ids?: string[] | null
          specific_reason_codes?: string[] | null
          status_at_decision?: string | null
          updated_at?: string | null
          user_note?: string | null
          was_approved?: boolean | null
        }
        Update: {
          ai_provider?: string | null
          campaign_id?: string | null
          client_id?: string | null
          confidence_override?: string | null
          created_at?: string | null
          decision_at?: string | null
          decision_outcome?: string | null
          decision_type?: string | null
          features_at_decision?: Json
          final_action_type?: string | null
          final_daily_budget?: number | null
          final_delta_pct?: number | null
          id?: string
          next_action?: string | null
          outcome_1d?: Json | null
          outcome_3d?: Json | null
          outcome_7d?: Json | null
          outcome_score_3d?: number | null
          outcome_score_7d?: number | null
          policy_version?: string | null
          primary_reason_category?: string | null
          proposal_id?: string | null
          proposed_action_type?: string | null
          proposed_daily_budget?: number | null
          proposed_delta_pct?: number | null
          proposed_pacing_info?: Json | null
          reason_codes?: string[] | null
          recommendation_confidence?: number | null
          similar_cases_ids?: string[] | null
          specific_reason_codes?: string[] | null
          status_at_decision?: string | null
          updated_at?: string | null
          user_note?: string | null
          was_approved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          currency: string | null
          evidence_due_by: string | null
          id: string
          reason: string | null
          resolved_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_dispute_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          currency?: string | null
          evidence_due_by?: string | null
          id?: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_dispute_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          currency?: string | null
          evidence_due_by?: string | null
          id?: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_dispute_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_tracking_links: {
        Row: {
          campaign_name: string | null
          click_count: number | null
          client_id: string | null
          created_at: string
          destination_url: string
          email_template: string | null
          expires_at: string | null
          first_clicked_at: string | null
          id: string
          last_clicked_at: string | null
          recipient_email: string | null
          tracking_id: string
        }
        Insert: {
          campaign_name?: string | null
          click_count?: number | null
          client_id?: string | null
          created_at?: string
          destination_url: string
          email_template?: string | null
          expires_at?: string | null
          first_clicked_at?: string | null
          id?: string
          last_clicked_at?: string | null
          recipient_email?: string | null
          tracking_id?: string
        }
        Update: {
          campaign_name?: string | null
          click_count?: number | null
          client_id?: string | null
          created_at?: string
          destination_url?: string
          email_template?: string | null
          expires_at?: string | null
          first_clicked_at?: string | null
          id?: string
          last_clicked_at?: string | null
          recipient_email?: string | null
          tracking_id?: string
        }
        Relationships: []
      }
      enhanced_conversion_logs: {
        Row: {
          conversion_type: string
          created_at: string
          email_provided: string | null
          error_message: string | null
          first_name_provided: string | null
          gclid: string | null
          google_api_response: Json | null
          google_api_status: number | null
          id: string
          last_name_provided: string | null
          phone_provided: string | null
          source: string | null
          success: boolean | null
        }
        Insert: {
          conversion_type: string
          created_at?: string
          email_provided?: string | null
          error_message?: string | null
          first_name_provided?: string | null
          gclid?: string | null
          google_api_response?: Json | null
          google_api_status?: number | null
          id?: string
          last_name_provided?: string | null
          phone_provided?: string | null
          source?: string | null
          success?: boolean | null
        }
        Update: {
          conversion_type?: string
          created_at?: string
          email_provided?: string | null
          error_message?: string | null
          first_name_provided?: string | null
          gclid?: string | null
          google_api_response?: Json | null
          google_api_status?: number | null
          id?: string
          last_name_provided?: string | null
          phone_provided?: string | null
          source?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          granted_at: string | null
          granted_by_admin_id: string | null
          id: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          granted_at?: string | null
          granted_by_admin_id?: string | null
          id?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          granted_at?: string | null
          granted_by_admin_id?: string | null
          id?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string
          created_at: string
          display_order: number
          icon: string | null
          id: string
          is_tax_deductible: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_tax_deductible?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_tax_deductible?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          bank_account_id: string | null
          category_id: string | null
          created_at: string
          currency_code: string | null
          description: string
          id: string
          is_auto_categorized: boolean | null
          is_manual_entry: boolean
          is_pending: boolean
          is_recurring: boolean | null
          merchant_name: string | null
          notes: string | null
          plaid_category: string[] | null
          plaid_personal_finance_category: Json | null
          plaid_transaction_id: string | null
          posted_date: string | null
          receipt_url: string | null
          tags: string[] | null
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string
          currency_code?: string | null
          description: string
          id?: string
          is_auto_categorized?: boolean | null
          is_manual_entry?: boolean
          is_pending?: boolean
          is_recurring?: boolean | null
          merchant_name?: string | null
          notes?: string | null
          plaid_category?: string[] | null
          plaid_personal_finance_category?: Json | null
          plaid_transaction_id?: string | null
          posted_date?: string | null
          receipt_url?: string | null
          tags?: string[] | null
          transaction_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string
          currency_code?: string | null
          description?: string
          id?: string
          is_auto_categorized?: boolean | null
          is_manual_entry?: boolean
          is_pending?: boolean
          is_recurring?: boolean | null
          merchant_name?: string | null
          notes?: string | null
          plaid_category?: string[] | null
          plaid_personal_finance_category?: Json | null
          plaid_transaction_id?: string | null
          posted_date?: string | null
          receipt_url?: string | null
          tags?: string[] | null
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_api_logs: {
        Row: {
          company_id: string | null
          created_at: string
          error_message: string | null
          id: string
          location_id: string | null
          request_type: string
          response_data: Json | null
          status: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          location_id?: string | null
          request_type: string
          response_data?: Json | null
          status: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          location_id?: string | null
          request_type?: string
          response_data?: Json | null
          status?: string
        }
        Relationships: []
      }
      ghl_available_fields: {
        Row: {
          created_at: string | null
          field_id: string
          field_key: string | null
          field_name: string
          field_type: string | null
          id: string
          last_synced_at: string | null
          location_id: string
        }
        Insert: {
          created_at?: string | null
          field_id: string
          field_key?: string | null
          field_name: string
          field_type?: string | null
          id?: string
          last_synced_at?: string | null
          location_id: string
        }
        Update: {
          created_at?: string | null
          field_id?: string
          field_key?: string | null
          field_name?: string
          field_type?: string | null
          id?: string
          last_synced_at?: string | null
          location_id?: string
        }
        Relationships: []
      }
      ghl_custom_field_mappings: {
        Row: {
          client_id: string
          created_at: string | null
          field_name: string
          ghl_field_id: string | null
          ghl_field_key: string | null
          ghl_field_name: string | null
          id: string
          is_auto_matched: boolean | null
          last_synced_at: string | null
          location_id: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          field_name: string
          ghl_field_id?: string | null
          ghl_field_key?: string | null
          ghl_field_name?: string | null
          id?: string
          is_auto_matched?: boolean | null
          last_synced_at?: string | null
          location_id: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          field_name?: string
          ghl_field_id?: string | null
          ghl_field_key?: string | null
          ghl_field_name?: string | null
          id?: string
          is_auto_matched?: boolean | null
          last_synced_at?: string | null
          location_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ghl_custom_field_mappings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_oauth_tokens: {
        Row: {
          access_token: string
          company_id: string | null
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          company_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          company_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      internal_marketing_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      lead_attribution: {
        Row: {
          conversion_path: Json | null
          created_at: string
          first_touch_at: string | null
          first_touch_campaign: string | null
          first_touch_content: string | null
          first_touch_fbclid: string | null
          first_touch_gclid: string | null
          first_touch_landing_page: string | null
          first_touch_medium: string | null
          first_touch_referrer: string | null
          first_touch_source: string | null
          first_touch_term: string | null
          id: string
          last_touch_at: string | null
          last_touch_campaign: string | null
          last_touch_content: string | null
          last_touch_fbclid: string | null
          last_touch_gclid: string | null
          last_touch_landing_page: string | null
          last_touch_medium: string | null
          last_touch_referrer: string | null
          last_touch_source: string | null
          last_touch_term: string | null
          lead_id: string
          referral_code: string | null
          time_to_conversion_hours: number | null
          total_page_views: number | null
          total_sessions: number | null
          touch_count: number | null
          updated_at: string
          visitor_id: string
        }
        Insert: {
          conversion_path?: Json | null
          created_at?: string
          first_touch_at?: string | null
          first_touch_campaign?: string | null
          first_touch_content?: string | null
          first_touch_fbclid?: string | null
          first_touch_gclid?: string | null
          first_touch_landing_page?: string | null
          first_touch_medium?: string | null
          first_touch_referrer?: string | null
          first_touch_source?: string | null
          first_touch_term?: string | null
          id?: string
          last_touch_at?: string | null
          last_touch_campaign?: string | null
          last_touch_content?: string | null
          last_touch_fbclid?: string | null
          last_touch_gclid?: string | null
          last_touch_landing_page?: string | null
          last_touch_medium?: string | null
          last_touch_referrer?: string | null
          last_touch_source?: string | null
          last_touch_term?: string | null
          lead_id: string
          referral_code?: string | null
          time_to_conversion_hours?: number | null
          total_page_views?: number | null
          total_sessions?: number | null
          touch_count?: number | null
          updated_at?: string
          visitor_id: string
        }
        Update: {
          conversion_path?: Json | null
          created_at?: string
          first_touch_at?: string | null
          first_touch_campaign?: string | null
          first_touch_content?: string | null
          first_touch_fbclid?: string | null
          first_touch_gclid?: string | null
          first_touch_landing_page?: string | null
          first_touch_medium?: string | null
          first_touch_referrer?: string | null
          first_touch_source?: string | null
          first_touch_term?: string | null
          id?: string
          last_touch_at?: string | null
          last_touch_campaign?: string | null
          last_touch_content?: string | null
          last_touch_fbclid?: string | null
          last_touch_gclid?: string | null
          last_touch_landing_page?: string | null
          last_touch_medium?: string | null
          last_touch_referrer?: string | null
          last_touch_source?: string | null
          last_touch_term?: string | null
          lead_id?: string
          referral_code?: string | null
          time_to_conversion_hours?: number | null
          total_page_views?: number | null
          total_sessions?: number | null
          touch_count?: number | null
          updated_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      lead_delivery_logs: {
        Row: {
          attempt_number: number
          created_at: string
          error_message: string | null
          ghl_contact_id: string | null
          ghl_location_id: string | null
          id: string
          lead_id: string
          response_data: Json | null
          status: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          error_message?: string | null
          ghl_contact_id?: string | null
          ghl_location_id?: string | null
          id?: string
          lead_id: string
          response_data?: Json | null
          status: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          error_message?: string | null
          ghl_contact_id?: string | null
          ghl_location_id?: string | null
          id?: string
          lead_id?: string
          response_data?: Json | null
          status?: string
        }
        Relationships: []
      }
      lead_pipeline_metrics: {
        Row: {
          agent_id: string | null
          count: number
          created_at: string | null
          id: string
          metric_date: string
          stage: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          count?: number
          created_at?: string | null
          id?: string
          metric_date?: string
          stage: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          count?: number
          created_at?: string | null
          id?: string
          metric_date?: string
          stage?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          lead_id: string
          new_status: string
          old_status: string | null
          source_stage: string | null
          target_premium: number | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          lead_id: string
          new_status: string
          old_status?: string | null
          source_stage?: string | null
          target_premium?: number | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string
          new_status?: string
          old_status?: string | null
          source_stage?: string | null
          target_premium?: number | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          age: string | null
          agent_id: string
          approved_at: string | null
          approved_premium: number | null
          booked_call_at: string | null
          created_at: string | null
          delivered_at: string | null
          delivery_attempts: number | null
          delivery_error: string | null
          delivery_status: string | null
          email: string | null
          employment: string | null
          fbclid: string | null
          first_name: string | null
          gclid: string | null
          ghl_contact_id: string | null
          id: string
          interest: string | null
          investments: string | null
          issued_at: string | null
          issued_premium: number | null
          last_delivery_attempt_at: string | null
          last_name: string | null
          lead_data: Json | null
          lead_date: string | null
          lead_id: string
          lead_source: string | null
          notes: string | null
          phone: string | null
          savings: string | null
          state: string | null
          status: string | null
          submitted_at: string | null
          submitted_premium: number | null
          target_premium: number | null
          timezone: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          webhook_payload: Json | null
        }
        Insert: {
          age?: string | null
          agent_id: string
          approved_at?: string | null
          approved_premium?: number | null
          booked_call_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_attempts?: number | null
          delivery_error?: string | null
          delivery_status?: string | null
          email?: string | null
          employment?: string | null
          fbclid?: string | null
          first_name?: string | null
          gclid?: string | null
          ghl_contact_id?: string | null
          id?: string
          interest?: string | null
          investments?: string | null
          issued_at?: string | null
          issued_premium?: number | null
          last_delivery_attempt_at?: string | null
          last_name?: string | null
          lead_data?: Json | null
          lead_date?: string | null
          lead_id: string
          lead_source?: string | null
          notes?: string | null
          phone?: string | null
          savings?: string | null
          state?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_premium?: number | null
          target_premium?: number | null
          timezone?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          webhook_payload?: Json | null
        }
        Update: {
          age?: string | null
          agent_id?: string
          approved_at?: string | null
          approved_premium?: number | null
          booked_call_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_attempts?: number | null
          delivery_error?: string | null
          delivery_status?: string | null
          email?: string | null
          employment?: string | null
          fbclid?: string | null
          first_name?: string | null
          gclid?: string | null
          ghl_contact_id?: string | null
          id?: string
          interest?: string | null
          investments?: string | null
          issued_at?: string | null
          issued_premium?: number | null
          last_delivery_attempt_at?: string | null
          last_name?: string | null
          lead_data?: Json | null
          lead_date?: string | null
          lead_id?: string
          lead_source?: string | null
          notes?: string | null
          phone?: string | null
          savings?: string | null
          state?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_premium?: number | null
          target_premium?: number | null
          timezone?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          webhook_payload?: Json | null
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          id: string
          last_position_seconds: number | null
          lesson_id: string
          progress_percent: number | null
          started_at: string | null
          status: string | null
          time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          last_position_seconds?: number | null
          lesson_id: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          last_position_seconds?: number | null
          lesson_id?: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          lesson_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_ratings_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          bunny_embed_url: string | null
          bunny_video_id: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_preview: boolean | null
          module_id: string
          order_index: number | null
          resources: Json | null
          title: string
        }
        Insert: {
          bunny_embed_url?: string | null
          bunny_video_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_preview?: boolean | null
          module_id: string
          order_index?: number | null
          resources?: Json | null
          title: string
        }
        Update: {
          bunny_embed_url?: string | null
          bunny_video_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_preview?: boolean | null
          module_id?: string
          order_index?: number | null
          resources?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stats: {
        Row: {
          id: string
          last_updated: string
          stat_key: string
          stat_value: number
        }
        Insert: {
          id?: string
          last_updated?: string
          stat_key: string
          stat_value?: number
        }
        Update: {
          id?: string
          last_updated?: string
          stat_key?: string
          stat_value?: number
        }
        Relationships: []
      }
      mcp_audit_log: {
        Row: {
          created_at: string | null
          id: string
          params: Json
          result: string | null
          tool: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          params?: Json
          result?: string | null
          tool: string
        }
        Update: {
          created_at?: string | null
          id?: string
          params?: Json
          result?: string | null
          tool?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          order_index: number | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          sound_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          sound_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          sound_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nps_responses: {
        Row: {
          client_id: string
          created_at: string
          feedback: string | null
          google_review_completed: boolean | null
          google_review_credit_applied: boolean | null
          google_review_offered: boolean | null
          id: string
          score: number
          updated_at: string
          video_review_completed: boolean | null
          video_review_credit_applied: boolean | null
          video_review_offered: boolean | null
        }
        Insert: {
          client_id: string
          created_at?: string
          feedback?: string | null
          google_review_completed?: boolean | null
          google_review_credit_applied?: boolean | null
          google_review_offered?: boolean | null
          id?: string
          score: number
          updated_at?: string
          video_review_completed?: boolean | null
          video_review_credit_applied?: boolean | null
          video_review_offered?: boolean | null
        }
        Update: {
          client_id?: string
          created_at?: string
          feedback?: string | null
          google_review_completed?: boolean | null
          google_review_credit_applied?: boolean | null
          google_review_offered?: boolean | null
          id?: string
          score?: number
          updated_at?: string
          video_review_completed?: boolean | null
          video_review_credit_applied?: boolean | null
          video_review_offered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_automation_runs: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          error_log: Json | null
          id: string
          last_step_at: string | null
          max_retries: number | null
          retry_count: number | null
          started_at: string | null
          status: string | null
          step_data: Json | null
          steps_completed: Json | null
          steps_failed: Json | null
          total_steps: number | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          error_log?: Json | null
          id?: string
          last_step_at?: string | null
          max_retries?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          step_data?: Json | null
          steps_completed?: Json | null
          steps_failed?: Json | null
          total_steps?: number | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          error_log?: Json | null
          id?: string
          last_step_at?: string | null
          max_retries?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          step_data?: Json | null
          steps_completed?: Json | null
          steps_failed?: Json | null
          total_steps?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_automation_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checklist: {
        Row: {
          category: string
          checked_at: string | null
          checked_by: string | null
          client_id: string
          created_at: string
          display_order: number
          id: string
          item_key: string
          item_label: string
          notes: string | null
          status: Database["public"]["Enums"]["onboarding_check_status"]
          ticket_id: string | null
          updated_at: string
          verification_notes: string | null
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          category: string
          checked_at?: string | null
          checked_by?: string | null
          client_id: string
          created_at?: string
          display_order?: number
          id?: string
          item_key: string
          item_label: string
          notes?: string | null
          status?: Database["public"]["Enums"]["onboarding_check_status"]
          ticket_id?: string | null
          updated_at?: string
          verification_notes?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          category?: string
          checked_at?: string | null
          checked_by?: string | null
          client_id?: string
          created_at?: string
          display_order?: number
          id?: string
          item_key?: string
          item_label?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["onboarding_check_status"]
          ticket_id?: string | null
          updated_at?: string
          verification_notes?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_checklist_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_tasks: {
        Row: {
          client_id: string
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          display_order: number | null
          id: string
          task_label: string
          task_name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          task_label: string
          task_name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          task_label?: string
          task_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          calendar_link: string | null
          color: string
          commission_percent: number | null
          created_at: string
          ghl_location_id: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          calendar_link?: string | null
          color?: string
          commission_percent?: number | null
          created_at?: string
          ghl_location_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          calendar_link?: string | null
          color?: string
          commission_percent?: number | null
          created_at?: string
          ghl_location_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      performance_snapshots: {
        Row: {
          booked_calls_this_month: number | null
          client_id: string
          cost_per_lead: number | null
          fulfillment_status: string
          id: string
          last_updated_at: string
          leads_delivered_this_month: number | null
        }
        Insert: {
          booked_calls_this_month?: number | null
          client_id: string
          cost_per_lead?: number | null
          fulfillment_status?: string
          id?: string
          last_updated_at?: string
          leads_delivered_this_month?: number | null
        }
        Update: {
          booked_calls_this_month?: number | null
          client_id?: string
          cost_per_lead?: number | null
          fulfillment_status?: string
          id?: string
          last_updated_at?: string
          leads_delivered_this_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          last_login_at: string | null
          name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          last_login_at?: string | null
          name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          name?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          ai_diagnosis: string | null
          ai_provider: string | null
          ai_summary: string | null
          approved_at: string | null
          approved_by: string | null
          campaign_id: string
          client_id: string
          confidence_override: string | null
          created_at: string | null
          current_daily_budget: number | null
          decision_outcome: string | null
          delta_pct: number | null
          executed_at: string | null
          execution_result: Json | null
          health_score: number | null
          id: string
          next_action: string | null
          pacing_info: Json | null
          policy_version: string | null
          primary_reason_category: string | null
          proposed_action_type: string
          proposed_daily_budget: number | null
          reason_codes: string[] | null
          recommendation_confidence: number | null
          similar_cases_count: number | null
          similar_cases_summary: string | null
          specific_reason_codes: string[] | null
          status: string | null
          updated_at: string | null
          user_decline_reason: string | null
          user_note: string | null
          user_override_budget: number | null
        }
        Insert: {
          ai_diagnosis?: string | null
          ai_provider?: string | null
          ai_summary?: string | null
          approved_at?: string | null
          approved_by?: string | null
          campaign_id: string
          client_id: string
          confidence_override?: string | null
          created_at?: string | null
          current_daily_budget?: number | null
          decision_outcome?: string | null
          delta_pct?: number | null
          executed_at?: string | null
          execution_result?: Json | null
          health_score?: number | null
          id?: string
          next_action?: string | null
          pacing_info?: Json | null
          policy_version?: string | null
          primary_reason_category?: string | null
          proposed_action_type: string
          proposed_daily_budget?: number | null
          reason_codes?: string[] | null
          recommendation_confidence?: number | null
          similar_cases_count?: number | null
          similar_cases_summary?: string | null
          specific_reason_codes?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_decline_reason?: string | null
          user_note?: string | null
          user_override_budget?: number | null
        }
        Update: {
          ai_diagnosis?: string | null
          ai_provider?: string | null
          ai_summary?: string | null
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string
          client_id?: string
          confidence_override?: string | null
          created_at?: string | null
          current_daily_budget?: number | null
          decision_outcome?: string | null
          delta_pct?: number | null
          executed_at?: string | null
          execution_result?: Json | null
          health_score?: number | null
          id?: string
          next_action?: string | null
          pacing_info?: Json | null
          policy_version?: string | null
          primary_reason_category?: string | null
          proposed_action_type?: string
          proposed_daily_budget?: number | null
          reason_codes?: string[] | null
          recommendation_confidence?: number | null
          similar_cases_count?: number | null
          similar_cases_summary?: string | null
          specific_reason_codes?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_decline_reason?: string | null
          user_note?: string | null
          user_override_budget?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          created_by: string | null
          id: string
          prospect_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          prospect_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          prospect_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_activities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_attribution: {
        Row: {
          created_at: string
          first_referrer_url: string | null
          first_touch_at: string | null
          first_touch_campaign: string | null
          first_touch_content: string | null
          first_touch_fbclid: string | null
          first_touch_gclid: string | null
          first_touch_landing_page: string | null
          first_touch_medium: string | null
          first_touch_referrer: string | null
          first_touch_source: string | null
          first_touch_term: string | null
          first_touch_ttclid: string | null
          first_touch_utm_id: string | null
          id: string
          last_touch_at: string | null
          last_touch_campaign: string | null
          last_touch_content: string | null
          last_touch_fbclid: string | null
          last_touch_gclid: string | null
          last_touch_landing_page: string | null
          last_touch_medium: string | null
          last_touch_referrer: string | null
          last_touch_source: string | null
          last_touch_term: string | null
          last_touch_ttclid: string | null
          last_touch_utm_id: string | null
          prospect_id: string
          referral_code: string | null
          referrer_url: string | null
          time_to_conversion_hours: number | null
          total_page_views: number | null
          total_sessions: number | null
          updated_at: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          first_referrer_url?: string | null
          first_touch_at?: string | null
          first_touch_campaign?: string | null
          first_touch_content?: string | null
          first_touch_fbclid?: string | null
          first_touch_gclid?: string | null
          first_touch_landing_page?: string | null
          first_touch_medium?: string | null
          first_touch_referrer?: string | null
          first_touch_source?: string | null
          first_touch_term?: string | null
          first_touch_ttclid?: string | null
          first_touch_utm_id?: string | null
          id?: string
          last_touch_at?: string | null
          last_touch_campaign?: string | null
          last_touch_content?: string | null
          last_touch_fbclid?: string | null
          last_touch_gclid?: string | null
          last_touch_landing_page?: string | null
          last_touch_medium?: string | null
          last_touch_referrer?: string | null
          last_touch_source?: string | null
          last_touch_term?: string | null
          last_touch_ttclid?: string | null
          last_touch_utm_id?: string | null
          prospect_id: string
          referral_code?: string | null
          referrer_url?: string | null
          time_to_conversion_hours?: number | null
          total_page_views?: number | null
          total_sessions?: number | null
          updated_at?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          first_referrer_url?: string | null
          first_touch_at?: string | null
          first_touch_campaign?: string | null
          first_touch_content?: string | null
          first_touch_fbclid?: string | null
          first_touch_gclid?: string | null
          first_touch_landing_page?: string | null
          first_touch_medium?: string | null
          first_touch_referrer?: string | null
          first_touch_source?: string | null
          first_touch_term?: string | null
          first_touch_ttclid?: string | null
          first_touch_utm_id?: string | null
          id?: string
          last_touch_at?: string | null
          last_touch_campaign?: string | null
          last_touch_content?: string | null
          last_touch_fbclid?: string | null
          last_touch_gclid?: string | null
          last_touch_landing_page?: string | null
          last_touch_medium?: string | null
          last_touch_referrer?: string | null
          last_touch_source?: string | null
          last_touch_term?: string | null
          last_touch_ttclid?: string | null
          last_touch_utm_id?: string | null
          prospect_id?: string
          referral_code?: string | null
          referrer_url?: string | null
          time_to_conversion_hours?: number | null
          total_page_views?: number | null
          total_sessions?: number | null
          updated_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_attribution_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_available_fields: {
        Row: {
          created_at: string | null
          field_id: string
          field_key: string
          field_name: string
          field_type: string | null
          id: string
          location_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          field_id: string
          field_key: string
          field_name: string
          field_type?: string | null
          id?: string
          location_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          field_id?: string
          field_key?: string
          field_name?: string
          field_type?: string | null
          id?: string
          location_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      prospect_field_mappings: {
        Row: {
          created_at: string | null
          ghl_field_id: string | null
          ghl_field_key: string | null
          ghl_field_name: string | null
          id: string
          internal_field_name: string
          is_enabled: boolean | null
          location_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ghl_field_id?: string | null
          ghl_field_key?: string | null
          ghl_field_name?: string | null
          id?: string
          internal_field_name: string
          is_enabled?: boolean | null
          location_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ghl_field_id?: string | null
          ghl_field_key?: string | null
          ghl_field_name?: string | null
          id?: string
          internal_field_name?: string
          is_enabled?: boolean | null
          location_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      prospects: {
        Row: {
          ad_spend_budget: number | null
          ad_spend_invoice_pending: boolean | null
          additional_info: string | null
          application_submitted_at: string
          appointment_status: string | null
          appt_calendar_id: string | null
          appt_count_no_shows: number | null
          appt_count_reschedules: number | null
          appt_end_at: string | null
          appt_start_at: string | null
          assigned_to: string | null
          avg_monthly_issued_paid: string | null
          biggest_challenge: string | null
          billing_frequency: string | null
          calculator_notes: string | null
          calendar_booked_at: string | null
          call_count: number | null
          call_type: string | null
          client_id: string | null
          closed_at: string | null
          contact_capture_at: string | null
          converted_at: string | null
          created_at: string
          current_bottleneck: string | null
          deal_value: number | null
          deposit_amount: number | null
          deposit_type: string | null
          desired_timeline: string | null
          disposition: string | null
          disqual_reason: string | null
          downline_count: number | null
          email: string
          first_contact_at: string | null
          first_referrer_url: string | null
          forecast_probability: number | null
          form_completed_at: string | null
          ghl_appointment_id: string | null
          ghl_contact_id: string | null
          ghl_location_id: string | null
          has_downline: boolean | null
          headshot_url: string | null
          id: string
          intent: string | null
          last_activity_at: string | null
          last_contact_method: string | null
          last_contacted_at: string | null
          lead_source: string | null
          licensed_status: string | null
          lost_reason: string | null
          management_fee: number | null
          manual_referrer_agent_name: string | null
          manual_source: string | null
          monthly_budget_range: string | null
          monthly_production: string | null
          name: string
          next_action_due_at: string | null
          next_action_owner_id: string | null
          next_action_type: string | null
          next_follow_up_at: string | null
          offer_selected: string | null
          owner_role: string | null
          owner_user_id: string | null
          partial_answers: Json | null
          partial_sync_sent_at: string | null
          partner_id: string | null
          payment_amount: number | null
          payment_method: string | null
          payment_plan_credit_available: string | null
          payment_plan_interest: string | null
          payment_status: string | null
          phone: string | null
          pipeline_stage_id: string | null
          post_booking_submitted_at: string | null
          qual_status: string | null
          qualification_submit_at: string | null
          qualified_path: string | null
          referral_code: string | null
          referrer_client_id: string | null
          referrer_url: string | null
          sales_notes: string | null
          source_page: string | null
          status: string
          stripe_customer_id: string | null
          team_size: string | null
          timeline_to_scale: string | null
          timezone: string | null
          updated_at: string
          visitor_id: string
        }
        Insert: {
          ad_spend_budget?: number | null
          ad_spend_invoice_pending?: boolean | null
          additional_info?: string | null
          application_submitted_at?: string
          appointment_status?: string | null
          appt_calendar_id?: string | null
          appt_count_no_shows?: number | null
          appt_count_reschedules?: number | null
          appt_end_at?: string | null
          appt_start_at?: string | null
          assigned_to?: string | null
          avg_monthly_issued_paid?: string | null
          biggest_challenge?: string | null
          billing_frequency?: string | null
          calculator_notes?: string | null
          calendar_booked_at?: string | null
          call_count?: number | null
          call_type?: string | null
          client_id?: string | null
          closed_at?: string | null
          contact_capture_at?: string | null
          converted_at?: string | null
          created_at?: string
          current_bottleneck?: string | null
          deal_value?: number | null
          deposit_amount?: number | null
          deposit_type?: string | null
          desired_timeline?: string | null
          disposition?: string | null
          disqual_reason?: string | null
          downline_count?: number | null
          email: string
          first_contact_at?: string | null
          first_referrer_url?: string | null
          forecast_probability?: number | null
          form_completed_at?: string | null
          ghl_appointment_id?: string | null
          ghl_contact_id?: string | null
          ghl_location_id?: string | null
          has_downline?: boolean | null
          headshot_url?: string | null
          id?: string
          intent?: string | null
          last_activity_at?: string | null
          last_contact_method?: string | null
          last_contacted_at?: string | null
          lead_source?: string | null
          licensed_status?: string | null
          lost_reason?: string | null
          management_fee?: number | null
          manual_referrer_agent_name?: string | null
          manual_source?: string | null
          monthly_budget_range?: string | null
          monthly_production?: string | null
          name: string
          next_action_due_at?: string | null
          next_action_owner_id?: string | null
          next_action_type?: string | null
          next_follow_up_at?: string | null
          offer_selected?: string | null
          owner_role?: string | null
          owner_user_id?: string | null
          partial_answers?: Json | null
          partial_sync_sent_at?: string | null
          partner_id?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_plan_credit_available?: string | null
          payment_plan_interest?: string | null
          payment_status?: string | null
          phone?: string | null
          pipeline_stage_id?: string | null
          post_booking_submitted_at?: string | null
          qual_status?: string | null
          qualification_submit_at?: string | null
          qualified_path?: string | null
          referral_code?: string | null
          referrer_client_id?: string | null
          referrer_url?: string | null
          sales_notes?: string | null
          source_page?: string | null
          status?: string
          stripe_customer_id?: string | null
          team_size?: string | null
          timeline_to_scale?: string | null
          timezone?: string | null
          updated_at?: string
          visitor_id: string
        }
        Update: {
          ad_spend_budget?: number | null
          ad_spend_invoice_pending?: boolean | null
          additional_info?: string | null
          application_submitted_at?: string
          appointment_status?: string | null
          appt_calendar_id?: string | null
          appt_count_no_shows?: number | null
          appt_count_reschedules?: number | null
          appt_end_at?: string | null
          appt_start_at?: string | null
          assigned_to?: string | null
          avg_monthly_issued_paid?: string | null
          biggest_challenge?: string | null
          billing_frequency?: string | null
          calculator_notes?: string | null
          calendar_booked_at?: string | null
          call_count?: number | null
          call_type?: string | null
          client_id?: string | null
          closed_at?: string | null
          contact_capture_at?: string | null
          converted_at?: string | null
          created_at?: string
          current_bottleneck?: string | null
          deal_value?: number | null
          deposit_amount?: number | null
          deposit_type?: string | null
          desired_timeline?: string | null
          disposition?: string | null
          disqual_reason?: string | null
          downline_count?: number | null
          email?: string
          first_contact_at?: string | null
          first_referrer_url?: string | null
          forecast_probability?: number | null
          form_completed_at?: string | null
          ghl_appointment_id?: string | null
          ghl_contact_id?: string | null
          ghl_location_id?: string | null
          has_downline?: boolean | null
          headshot_url?: string | null
          id?: string
          intent?: string | null
          last_activity_at?: string | null
          last_contact_method?: string | null
          last_contacted_at?: string | null
          lead_source?: string | null
          licensed_status?: string | null
          lost_reason?: string | null
          management_fee?: number | null
          manual_referrer_agent_name?: string | null
          manual_source?: string | null
          monthly_budget_range?: string | null
          monthly_production?: string | null
          name?: string
          next_action_due_at?: string | null
          next_action_owner_id?: string | null
          next_action_type?: string | null
          next_follow_up_at?: string | null
          offer_selected?: string | null
          owner_role?: string | null
          owner_user_id?: string | null
          partial_answers?: Json | null
          partial_sync_sent_at?: string | null
          partner_id?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_plan_credit_available?: string | null
          payment_plan_interest?: string | null
          payment_status?: string | null
          phone?: string | null
          pipeline_stage_id?: string | null
          post_booking_submitted_at?: string | null
          qual_status?: string | null
          qualification_submit_at?: string | null
          qualified_path?: string | null
          referral_code?: string | null
          referrer_client_id?: string | null
          referrer_url?: string | null
          sales_notes?: string | null
          source_page?: string | null
          status?: string
          stripe_customer_id?: string | null
          team_size?: string | null
          timeline_to_scale?: string | null
          timezone?: string | null
          updated_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          client_id: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          partner_id: string | null
        }
        Insert: {
          client_id?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          partner_id?: string | null
        }
        Update: {
          client_id?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          partner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_codes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_commission_config: {
        Row: {
          billing_types: string[] | null
          commission_percentage: number
          created_at: string | null
          id: string
          is_active: boolean | null
          is_lifetime: boolean | null
          max_months: number | null
          updated_at: string | null
        }
        Insert: {
          billing_types?: string[] | null
          commission_percentage?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_lifetime?: boolean | null
          max_months?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_types?: string[] | null
          commission_percentage?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_lifetime?: boolean | null
          max_months?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_partners: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          notes: string | null
          phone: string | null
          referral_code: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          notes?: string | null
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          amount: number
          billing_record_id: string | null
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_reference: string | null
          period_end: string | null
          period_start: string | null
          referral_id: string
          referred_client_name: string | null
          referrer_client_id: string
          reward_type: string
          status: Database["public"]["Enums"]["reward_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_record_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          referral_id: string
          referred_client_name?: string | null
          referrer_client_id: string
          reward_type?: string
          status?: Database["public"]["Enums"]["reward_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_record_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          referral_id?: string
          referred_client_name?: string | null
          referrer_client_id?: string
          reward_type?: string
          status?: Database["public"]["Enums"]["reward_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_billing_record_id_fkey"
            columns: ["billing_record_id"]
            isOneToOne: false
            referencedRelation: "billing_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          activated_at: string | null
          created_at: string
          id: string
          referral_code_id: string
          referred_at: string
          referred_client_id: string | null
          referred_email: string
          referred_name: string | null
          referrer_client_id: string | null
          referrer_partner_id: string | null
          signed_up_at: string | null
          status: Database["public"]["Enums"]["referral_status"]
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          id?: string
          referral_code_id: string
          referred_at?: string
          referred_client_id?: string | null
          referred_email: string
          referred_name?: string | null
          referrer_client_id?: string | null
          referrer_partner_id?: string | null
          signed_up_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          id?: string
          referral_code_id?: string
          referred_at?: string
          referred_client_id?: string | null
          referred_email?: string
          referred_name?: string | null
          referrer_client_id?: string | null
          referrer_partner_id?: string | null
          signed_up_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_client_id_fkey"
            columns: ["referred_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_partner_id_fkey"
            columns: ["referrer_partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      rolling_snapshots: {
        Row: {
          booked_call_rate_7d: number | null
          booked_calls_7d: number | null
          campaign_id: string
          created_at: string | null
          delta_conversions_pct: number | null
          delta_cpc_pct: number | null
          delta_cpl_pct: number | null
          delta_ctr_pct: number | null
          delta_cvr_pct: number | null
          delta_spend_pct: number | null
          health_score_breakdown: Json | null
          id: string
          last_7d_avg_utilization: number | null
          last_7d_clicks: number | null
          last_7d_conversions: number | null
          last_7d_cpc: number | null
          last_7d_cpl: number | null
          last_7d_ctr: number | null
          last_7d_cvr: number | null
          last_7d_impressions: number | null
          last_7d_spend: number | null
          leads_7d: number | null
          prior_7d_clicks: number | null
          prior_7d_conversions: number | null
          prior_7d_cpc: number | null
          prior_7d_cpl: number | null
          prior_7d_ctr: number | null
          prior_7d_cvr: number | null
          prior_7d_impressions: number | null
          prior_7d_spend: number | null
          snapshot_date: string
        }
        Insert: {
          booked_call_rate_7d?: number | null
          booked_calls_7d?: number | null
          campaign_id: string
          created_at?: string | null
          delta_conversions_pct?: number | null
          delta_cpc_pct?: number | null
          delta_cpl_pct?: number | null
          delta_ctr_pct?: number | null
          delta_cvr_pct?: number | null
          delta_spend_pct?: number | null
          health_score_breakdown?: Json | null
          id?: string
          last_7d_avg_utilization?: number | null
          last_7d_clicks?: number | null
          last_7d_conversions?: number | null
          last_7d_cpc?: number | null
          last_7d_cpl?: number | null
          last_7d_ctr?: number | null
          last_7d_cvr?: number | null
          last_7d_impressions?: number | null
          last_7d_spend?: number | null
          leads_7d?: number | null
          prior_7d_clicks?: number | null
          prior_7d_conversions?: number | null
          prior_7d_cpc?: number | null
          prior_7d_cpl?: number | null
          prior_7d_ctr?: number | null
          prior_7d_cvr?: number | null
          prior_7d_impressions?: number | null
          prior_7d_spend?: number | null
          snapshot_date: string
        }
        Update: {
          booked_call_rate_7d?: number | null
          booked_calls_7d?: number | null
          campaign_id?: string
          created_at?: string | null
          delta_conversions_pct?: number | null
          delta_cpc_pct?: number | null
          delta_cpl_pct?: number | null
          delta_ctr_pct?: number | null
          delta_cvr_pct?: number | null
          delta_spend_pct?: number | null
          health_score_breakdown?: Json | null
          id?: string
          last_7d_avg_utilization?: number | null
          last_7d_clicks?: number | null
          last_7d_conversions?: number | null
          last_7d_cpc?: number | null
          last_7d_cpl?: number | null
          last_7d_ctr?: number | null
          last_7d_cvr?: number | null
          last_7d_impressions?: number | null
          last_7d_spend?: number | null
          leads_7d?: number | null
          prior_7d_clicks?: number | null
          prior_7d_conversions?: number | null
          prior_7d_cpc?: number | null
          prior_7d_cpl?: number | null
          prior_7d_ctr?: number | null
          prior_7d_cvr?: number | null
          prior_7d_impressions?: number | null
          prior_7d_spend?: number | null
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "rolling_snapshots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_pipeline_stages: {
        Row: {
          color: string
          created_at: string
          ghl_tag: string | null
          id: string
          is_closed: boolean
          order_index: number
          stage_key: string
          stage_name: string
        }
        Insert: {
          color?: string
          created_at?: string
          ghl_tag?: string | null
          id?: string
          is_closed?: boolean
          order_index?: number
          stage_key: string
          stage_name: string
        }
        Update: {
          color?: string
          created_at?: string
          ghl_tag?: string | null
          id?: string
          is_closed?: boolean
          order_index?: number
          stage_key?: string
          stage_name?: string
        }
        Relationships: []
      }
      sales_team_members: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          role: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sheet_config: {
        Row: {
          column_mappings: Json
          created_at: string
          id: string
          last_synced_at: string | null
          refresh_interval_seconds: number
          sheet_tab: string
          sheet_url: string
          updated_at: string
        }
        Insert: {
          column_mappings?: Json
          created_at?: string
          id?: string
          last_synced_at?: string | null
          refresh_interval_seconds?: number
          sheet_tab?: string
          sheet_url: string
          updated_at?: string
        }
        Update: {
          column_mappings?: Json
          created_at?: string
          id?: string
          last_synced_at?: string | null
          refresh_interval_seconds?: number
          sheet_tab?: string
          sheet_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      sla_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      support_agents: {
        Row: {
          categories: string[]
          created_at: string
          email: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          team: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          categories?: string[]
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          team?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          categories?: string[]
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          team?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          category: string
          client_id: string | null
          created_at: string
          due_date: string | null
          escalated_at: string | null
          id: string
          last_reply_at: string | null
          message: string
          onboarding_checklist_id: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          sla_deadline: string | null
          status: string
          subject: string
          ticket_number: number
          ticket_type: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          category: string
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          escalated_at?: string | null
          id?: string
          last_reply_at?: string | null
          message: string
          onboarding_checklist_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string
          subject: string
          ticket_number?: number
          ticket_type?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          escalated_at?: string | null
          id?: string
          last_reply_at?: string | null
          message?: string
          onboarding_checklist_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string
          subject?: string
          ticket_number?: number
          ticket_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_onboarding_checklist_id_fkey"
            columns: ["onboarding_checklist_id"]
            isOneToOne: false
            referencedRelation: "onboarding_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          severity?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          quote: string
          role: string
          stats_badge: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          quote: string
          role: string
          stats_badge: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          quote?: string
          role?: string
          stats_badge?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_replies: {
        Row: {
          created_at: string
          id: string
          is_admin_reply: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitor_events: {
        Row: {
          created_at: string
          element_id: string | null
          element_text: string | null
          event_data: Json | null
          event_type: string
          id: string
          page_url: string | null
          session_id: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          element_id?: string | null
          element_text?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          page_url?: string | null
          session_id: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          element_id?: string | null
          element_text?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          page_url?: string | null
          session_id?: string
          visitor_id?: string
        }
        Relationships: []
      }
      visitor_sessions: {
        Row: {
          converted_at: string | null
          created_at: string
          device_type: string | null
          email: string | null
          fbclid: string | null
          first_seen_at: string
          gclid: string | null
          id: string
          ip_country: string | null
          ip_region: string | null
          landing_page: string | null
          last_seen_at: string
          lead_id: string | null
          referral_code: string | null
          referrer_url: string | null
          session_id: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          device_type?: string | null
          email?: string | null
          fbclid?: string | null
          first_seen_at?: string
          gclid?: string | null
          id?: string
          ip_country?: string | null
          ip_region?: string | null
          landing_page?: string | null
          last_seen_at?: string
          lead_id?: string | null
          referral_code?: string | null
          referrer_url?: string | null
          session_id: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          device_type?: string | null
          email?: string | null
          fbclid?: string | null
          first_seen_at?: string
          gclid?: string | null
          id?: string
          ip_country?: string | null
          ip_region?: string | null
          landing_page?: string | null
          last_seen_at?: string
          lead_id?: string | null
          referral_code?: string | null
          referrer_url?: string | null
          session_id?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          billing_record_id: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          transaction_type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          billing_record_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          transaction_type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          billing_record_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          transaction_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_billing_record_id_fkey"
            columns: ["billing_record_id"]
            isOneToOne: false
            referencedRelation: "billing_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "client_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          request_count: number | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          request_count?: number | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          request_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_sla_deadline: {
        Args: {
          p_category: string
          p_priority: Database["public"]["Enums"]["ticket_priority"]
        }
        Returns: string
      }
      generate_referral_code: { Args: { client_name: string }; Returns: string }
      get_or_create_conversation: {
        Args: { p_client_id: string }
        Returns: string
      }
      get_or_create_partner_referral_code: {
        Args: { p_partner_id: string }
        Returns: string
      }
      get_or_create_referral_code: {
        Args: { p_client_id: string }
        Returns: string
      }
      get_support_agent_for_category: {
        Args: { p_category: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_pipeline_metric: {
        Args: { p_agent_id: string; p_stage: string }
        Returns: undefined
      }
      increment_stat: {
        Args: { amount?: number; key: string }
        Returns: number
      }
      initialize_onboarding_checklist: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      is_enrolled: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      link_client_to_user: { Args: never; Returns: string }
      mark_messages_read: {
        Args: { p_conversation_id: string; p_user_role: string }
        Returns: undefined
      }
      run_readonly_query: { Args: { query_text: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "member" | "guest" | "client" | "referrer"
      billing_status: "pending" | "paid" | "overdue" | "cancelled"
      billing_type: "ad_spend" | "management"
      onboarding_check_status: "pending" | "yes" | "no"
      onboarding_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "error"
        | "automation_complete"
      referral_status: "pending" | "signed_up" | "active" | "churned"
      reward_status: "pending" | "approved" | "paid" | "cancelled"
      ticket_priority: "low" | "normal" | "high" | "urgent"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member", "guest", "client", "referrer"],
      billing_status: ["pending", "paid", "overdue", "cancelled"],
      billing_type: ["ad_spend", "management"],
      onboarding_check_status: ["pending", "yes", "no"],
      onboarding_status: [
        "pending",
        "in_progress",
        "completed",
        "error",
        "automation_complete",
      ],
      referral_status: ["pending", "signed_up", "active", "churned"],
      reward_status: ["pending", "approved", "paid", "cancelled"],
      ticket_priority: ["low", "normal", "high", "urgent"],
    },
  },
} as const
