import Foundation
import Supabase

enum SupabaseConfig {
    static let client = SupabaseClient(
        supabaseURL: URL(string: "https://qcunascacayiiuufjtaq.supabase.co")!,
        supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdW5hc2NhY2F5aWl1dWZqdGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjQyMDMsImV4cCI6MjA4Nzc0MDIwM30.9BWy2WLaD3ZnWF_ragrslDv9PgpoSG-21OBPIT07owE",
        options: SupabaseClientOptions(
            auth: .init(
                storage: KeychainLocalStorage(
                    service: "com.alphaagent.ios",
                    accessGroup: nil
                ),
                flowType: .pkce
            )
        )
    )
}
