const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FathomTranscriptItem {
  speaker?: {
    display_name?: string;
    matched_calendar_invitee_email?: string;
  };
  text?: string;
  timestamp?: string;
}

interface FathomMeeting {
  id?: string;
  title?: string;
  meeting_title?: string;
  url?: string;
  share_url?: string;
  created_at: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  recording_start_time?: string;
  recording_end_time?: string;
  calendar_invitees?: Array<{
    is_external?: boolean;
    name?: string;
    email?: string;
  }>;
  recorded_by?: {
    name?: string;
    email?: string;
    team?: string;
  };
  transcript?: FathomTranscriptItem[];
  default_summary?: {
    template_name?: string;
    markdown_formatted?: string;
  };
  action_items?: Array<{
    description?: string;
    user_generated?: boolean;
    completed?: boolean;
  }>;
  crm_matches?: {
    contacts?: Array<{ name?: string; email?: string }>;
    companies?: Array<{ name?: string }>;
  };
}

interface FathomCall {
  id: string;
  title?: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  summary?: string;
  action_items?: string[];
  key_topics?: string[];
  sentiment?: string;
  recording_url?: string;
  participants?: Array<{
    email?: string;
    name?: string;
  }>;
}

function uniqEmails(list: Array<string | undefined | null>) {
  const s = new Set<string>();
  for (const e of list) {
    const v = (e || '').trim().toLowerCase();
    if (v) s.add(v);
  }
  return [...s];
}

function normalizeStr(s: string | undefined | null): string {
  return (s || '').trim().toLowerCase();
}

function nameMatches(targetName: string, candidateName: string): boolean {
  const t = normalizeStr(targetName);
  const c = normalizeStr(candidateName);
  if (!t || !c) return false;
  // Check if either contains the other (handles "John" matching "John Smith")
  return c.includes(t) || t.includes(c);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FATHOM_API_KEY");
    if (!apiKey) {
      console.error("FATHOM_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Fathom API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, name, limit = 20, showAll = false } = await req.json();
    console.log("Fetching Fathom calls for:", { email, name, showAll });

    if (!email && !name && !showAll) {
      return new Response(
        JSON.stringify({ error: "Email or name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchUrl = new URL("https://api.fathom.ai/external/v1/meetings");
    searchUrl.searchParams.set("limit", String(limit));
    searchUrl.searchParams.set("include_transcript", "true");

    console.log("Calling Fathom API:", searchUrl.toString());

    const response = await fetch(searchUrl.toString(), {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fathom API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: `Fathom API error: ${response.status}`,
          details: errorText.substring(0, 500),
          calls: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const items: FathomMeeting[] = data.items || [];
    console.log(`Received ${items.length} meetings from Fathom`);

    const emailLower = normalizeStr(email);
    const nameLower = normalizeStr(name);

    const calls: FathomCall[] = items
      .filter((meeting) => {
        // If showAll, don't filter
        if (showAll) return true;

        // Collect all emails from the meeting
        const inviteeEmails = (meeting.calendar_invitees || []).map((i) => i.email);
        const crmEmails = (meeting.crm_matches?.contacts || []).map((c) => c.email);
        const transcriptEmails = (meeting.transcript || []).map((t) => t.speaker?.matched_calendar_invitee_email);
        const allEmails = uniqEmails([
          ...inviteeEmails,
          ...crmEmails,
          ...transcriptEmails,
          meeting.recorded_by?.email,
        ]);

        // Collect all names from the meeting
        const inviteeNames = (meeting.calendar_invitees || []).map((i) => i.name);
        const transcriptNames = (meeting.transcript || []).map((t) => t.speaker?.display_name);
        const crmNames = (meeting.crm_matches?.contacts || []).map((c) => c.name);
        const allNames = [
          ...inviteeNames,
          ...transcriptNames,
          ...crmNames,
          meeting.recorded_by?.name,
        ].filter(Boolean) as string[];

        // Log for debugging
        console.log(`Meeting "${meeting.title || meeting.meeting_title}": emails=[${allEmails.join(', ')}], names=[${allNames.join(', ')}]`);

        // Check email match
        if (emailLower && allEmails.includes(emailLower)) {
          console.log(`  -> Email match: ${emailLower}`);
          return true;
        }

        // Check name match
        if (nameLower) {
          for (const n of allNames) {
            if (nameMatches(nameLower, n)) {
              console.log(`  -> Name match: "${nameLower}" ~ "${n}"`);
              return true;
            }
          }
        }

        return false;
      })
      .map((meeting) => {
        let durationSeconds: number | undefined;
        if (meeting.recording_start_time && meeting.recording_end_time) {
          const start = new Date(meeting.recording_start_time).getTime();
          const end = new Date(meeting.recording_end_time).getTime();
          durationSeconds = Math.max(0, Math.floor((end - start) / 1000));
        }

        const actionItems = (meeting.action_items || [])
          .map((item) => item.description)
          .filter((d): d is string => !!d);

        const participants = (meeting.calendar_invitees || []).map((inv) => ({
          email: inv.email,
          name: inv.name,
        }));

        const startedAt = meeting.recording_start_time || meeting.scheduled_start_time || meeting.created_at;
        const endedAt = meeting.recording_end_time || meeting.scheduled_end_time;

        return {
          id: meeting.id || meeting.url || meeting.share_url || meeting.created_at,
          title: meeting.title || meeting.meeting_title,
          started_at: startedAt,
          ended_at: endedAt,
          duration_seconds: durationSeconds,
          summary: meeting.default_summary?.markdown_formatted,
          action_items: actionItems,
          key_topics: [],
          sentiment: undefined,
          recording_url: meeting.url || meeting.share_url,
          participants,
        };
      });

    console.log(`Found ${calls.length} calls${showAll ? ' (unfiltered)' : ` matching email/name`}`);

    return new Response(JSON.stringify({ success: true, calls }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching Fathom calls:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message, calls: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
