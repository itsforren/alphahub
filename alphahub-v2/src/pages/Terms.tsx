import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
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
        
        <h1 className="text-4xl font-black mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: January 2025</p>
          
          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing or using Alpha Agent's website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">2. Description of Services</h2>
            <p>
              Alpha Agent provides a client acquisition system for insurance agents, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Exclusive territory-based lead generation</li>
              <li>Agent-branded marketing campaigns</li>
              <li>CRM and follow-up automation tools</li>
              <li>Training and support resources</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">3. Eligibility</h2>
            <p>
              Our services are intended for licensed insurance agents and agency owners. By using our services, you represent that you:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Are at least 18 years of age</li>
              <li>Hold a valid insurance license in your operating state(s)</li>
              <li>Have the authority to enter into binding agreements</li>
              <li>Will comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">4. Service Terms</h2>
            <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Territory Exclusivity</h3>
            <p>
              Territory assignments are subject to availability and Alpha Agent's discretion. We reserve the right to modify territory boundaries as needed to optimize performance.
            </p>

            <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Payment Terms</h3>
            <p>
              Service fees are billed according to the pricing plan selected. All fees are non-refundable unless otherwise specified in writing. Late payments may result in service suspension.
            </p>

            <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Performance Expectations</h3>
            <p>
              While we provide tools and systems for lead generation, results may vary based on factors including but not limited to market conditions, agent effort, and compliance with our recommended practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">5. User Responsibilities</h2>
            <p>As a user of our services, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Use our services in compliance with all applicable laws</li>
              <li>Not misrepresent your affiliation or credentials</li>
              <li>Not engage in any activity that disrupts our services</li>
              <li>Follow all advertising and marketing regulations in your jurisdiction</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">6. Intellectual Property</h2>
            <p>
              All content, trademarks, and intellectual property on our website and within our services are owned by Alpha Agent or our licensors. You may not copy, modify, distribute, or create derivative works without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">7. Disclaimer of Warranties</h2>
            <p>
              Our services are provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee specific results, lead quality, or conversion rates.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Alpha Agent shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">9. Termination</h2>
            <p>
              Either party may terminate the service agreement according to the terms specified in your service contract. We reserve the right to suspend or terminate access for violations of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">10. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. Changes will be effective upon posting to our website. Continued use of our services after changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">11. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">12. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us through our website or booking system.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Terms;
