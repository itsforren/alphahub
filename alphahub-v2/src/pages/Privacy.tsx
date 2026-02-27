import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        
        <h1 className="text-4xl font-black mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: December 2024</p>
          
          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">1. Introduction</h2>
            <p>
              Alpha Agent ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services, including the <strong>Alpha Hub</strong> application.
            </p>
            <p className="mt-4">
              <strong>Alpha Hub</strong> is an internal business management tool used by authorized employees, contractors, and business partners of Alpha Agent. Access to Alpha Hub is restricted to authenticated users who have been granted access by Alpha Agent administrators.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Personal Information</h3>
            <p>We may collect personal information that you voluntarily provide to us when you:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fill out our contact or booking forms</li>
              <li>Subscribe to our newsletter</li>
              <li>Request information about our services</li>
              <li>Communicate with us via email or phone</li>
              <li>Use Alpha Hub for business operations</li>
            </ul>
            <p className="mt-4">This information may include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Business information</li>
              <li>Geographic location/territory preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Financial Data via Plaid</h3>
            <p>
              Alpha Hub uses <strong>Plaid Inc.</strong> ("Plaid") to connect to financial institutions and retrieve financial data for internal bookkeeping and expense management purposes. When you connect a bank account through Plaid Link, we may collect and process the following information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Institution information:</strong> The name of your financial institution</li>
              <li><strong>Account information:</strong> Account name, account type (checking, savings, etc.), and masked account numbers (last 4 digits only)</li>
              <li><strong>Balance information:</strong> Current and available account balances</li>
              <li><strong>Transaction data:</strong> Transaction history including merchant name, transaction amount, date, description, and category</li>
              <li><strong>Plaid identifiers:</strong> Technical identifiers such as Plaid item IDs and account IDs used to maintain the connection</li>
            </ul>
            <p className="mt-4 font-semibold">
              Important: We do NOT receive your banking login credentials. Plaid securely handles all authentication with your financial institution, and your username and password are never shared with or stored by Alpha Agent.
            </p>

            <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Automatically Collected Information</h3>
            <p>When you visit our website or use Alpha Hub, we may automatically collect certain information, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Referring website</li>
              <li>Pages viewed and time spent on pages</li>
              <li>Date and time of visits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">3. How We Use Your Information</h2>
            
            <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">General Usage</h3>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, operate, and maintain our services</li>
              <li>Respond to your inquiries and fulfill your requests</li>
              <li>Send you marketing and promotional communications (with your consent)</li>
              <li>Improve our website and services</li>
              <li>Analyze usage patterns and trends</li>
              <li>Protect against fraudulent or unauthorized activity</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Financial Data Usage</h3>
            <p>Financial data collected via Plaid is used exclusively for the following internal business purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Bookkeeping and expense tracking:</strong> Categorizing and recording business expenses</li>
              <li><strong>Financial reconciliation:</strong> Matching transactions with internal records</li>
              <li><strong>Cash flow reporting:</strong> Monitoring account balances and financial health</li>
              <li><strong>Internal business reporting:</strong> Generating financial reports and analytics</li>
              <li><strong>Accuracy improvement:</strong> Ensuring financial records are complete and accurate</li>
              <li><strong>Security and auditing:</strong> Detecting anomalies and maintaining audit trails</li>
              <li><strong>Troubleshooting:</strong> Resolving technical issues with bank connections</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">4. Information Sharing</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. <strong>We do NOT sell financial data.</strong></p>
            <p className="mt-4">We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Plaid Inc.:</strong> We use Plaid as a service provider for secure bank connectivity. Plaid receives only the information necessary to establish and maintain connections with your financial institutions. Plaid's use of your data is governed by <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Plaid's End User Privacy Policy</a>.</li>
              <li><strong>Hosting and infrastructure providers:</strong> Secure cloud hosting and database services that store and process data on our behalf</li>
              <li><strong>Service providers:</strong> Other vendors who assist in our operations under strict confidentiality agreements</li>
              <li><strong>Professional advisors:</strong> Lawyers, accountants, and auditors as necessary</li>
              <li><strong>Law enforcement:</strong> When required by law, court order, or to protect our rights</li>
            </ul>
            <p className="mt-4">All third-party service providers are contractually obligated to protect your information and may only use it for the specific purposes we authorize.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal and financial information. Our security practices include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Encryption in transit:</strong> All data transmitted between your browser and our servers uses TLS 1.2 or higher encryption</li>
              <li><strong>Encryption at rest:</strong> Sensitive data, including financial information and access tokens, is encrypted using AES-256 encryption</li>
              <li><strong>Access controls:</strong> Role-Based Access Control (RBAC) with least-privilege principles ensures users only access data necessary for their role</li>
              <li><strong>Multi-Factor Authentication (MFA):</strong> Required for all administrator accounts accessing sensitive financial data</li>
              <li><strong>Regular security reviews:</strong> Periodic access audits and security assessments</li>
              <li><strong>Secure token storage:</strong> Plaid access tokens are encrypted and stored securely with limited access</li>
            </ul>
            <p className="mt-4">
              While we strive to protect your information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security but are committed to industry-standard protections.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">6. Data Retention and Deletion</h2>
            <p>We retain your information only for as long as necessary to fulfill the purposes described in this policy or as required by law.</p>
            
            <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Retention Periods</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Plaid access tokens:</strong> Deleted within 7 days of account disconnection or upon user request</li>
              <li><strong>Transaction data:</strong> Retained for up to 7 years to comply with accounting and tax requirements</li>
              <li><strong>System and access logs:</strong> Retained for 90 days for security and troubleshooting purposes</li>
              <li><strong>Backups:</strong> Encrypted backups expire and are automatically deleted within 30 days</li>
            </ul>
            <p className="mt-4">
              <strong>Note:</strong> Deleted data may persist in encrypted backup systems until those backups naturally expire. We do not actively restore deleted data from backups.
            </p>

            <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">How to Disconnect Accounts and Request Deletion</h3>
            <p>To disconnect a linked bank account:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Log in to Alpha Hub with your authorized credentials</li>
              <li>Navigate to the Banking section in Settings</li>
              <li>Select the account you wish to disconnect</li>
              <li>Click "Disconnect" to revoke access</li>
            </ol>
            <p className="mt-4">
              To request complete deletion of your financial data, please contact us at <a href="mailto:privacy@alphaagent.io" className="text-primary hover:underline">privacy@alphaagent.io</a>. We will process your request within 30 days and confirm deletion via email.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">7. Consent and Authorization</h2>
            <p>
              <strong>Plaid Link Authorization:</strong> When you connect a bank account through Plaid Link, you explicitly authorize Alpha Agent to access your financial account information as described in this policy. By completing the Plaid Link connection flow, you consent to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Plaid accessing your account information on your behalf</li>
              <li>Alpha Agent receiving and storing the financial data described in Section 2</li>
              <li>The use of your financial data for the purposes described in Section 3</li>
            </ul>
            <p className="mt-4">
              You may withdraw your consent at any time by disconnecting your bank account as described in Section 6. Withdrawal of consent does not affect the lawfulness of processing based on consent before withdrawal.
            </p>
            <p className="mt-4">
              <strong>Continued Use:</strong> Your continued use of Alpha Hub after connecting financial accounts constitutes ongoing consent to the collection and processing of financial data as described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">8. Your Rights</h2>
            <p>Depending on your location, you may have certain rights regarding your personal information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal retention requirements</li>
              <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
              <li><strong>Opt-out:</strong> Opt-out of marketing communications at any time</li>
              <li><strong>Withdraw consent:</strong> Withdraw consent for data processing where consent is the legal basis</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Jurisdiction-Specific Rights</h3>
            <p>
              Your privacy rights may vary depending on your location. Residents of certain U.S. states (including California, Virginia, Colorado, and others with comprehensive privacy laws) may have additional rights under state privacy laws. If applicable laws grant you additional rights, we will honor those rights upon verified request.
            </p>

            <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">International Data Processing</h3>
            <p>
              Alpha Agent is based in the United States. If you access our services from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States where our servers are located. By using our services, you consent to the transfer of your information to the United States.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">9. Cookies</h2>
            <p>
              We use cookies and similar tracking technologies to enhance your browsing experience and analyze usage patterns. You can control cookie settings through your browser preferences. Essential cookies required for Alpha Hub functionality cannot be disabled while using the application.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. For significant changes affecting financial data processing, we may also provide notice through Alpha Hub or via email.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or wish to exercise your privacy rights, please contact us:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li><strong>Privacy inquiries and data requests:</strong> <a href="mailto:privacy@alphaagent.io" className="text-primary hover:underline">privacy@alphaagent.io</a></li>
              <li><strong>General support:</strong> <a href="mailto:support@alphaagent.io" className="text-primary hover:underline">support@alphaagent.io</a></li>
            </ul>
            <p className="mt-4">
              We will respond to verified privacy requests within 30 days. For complex requests, we may extend this period by an additional 30 days with notice.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Privacy;
