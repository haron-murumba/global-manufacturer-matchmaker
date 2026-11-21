import Link from "next/link";
import Image from "next/image";
import styles from "./landing.module.css";

const steps = [
  {
    number: "01",
    icon: "▤",
    title: "Submit Your Product",
    description:
      "Upload your product specifications and CAD files. Tell us about your materials, processes and production requirements.",
  },
  {
    number: "02",
    icon: "◎",
    title: "Find Matching Manufacturers",
    description:
      "GMM evaluates your requirements and connects your project with manufacturers that match your production needs.",
  },
  {
    number: "03",
    icon: "↗",
    title: "Compare Quotes & Choose",
    description:
      "Request quotations, review supplier responses and compare offers to make informed sourcing decisions.",
  },
];

const benefits = [
  {
    icon: "✓",
    title: "Verified Manufacturers",
    description: "Connect with manufacturers reviewed through our verification process.",
  },
  {
    icon: "⌕",
    title: "Smarter Matching",
    description: "Find potential manufacturing partners based on your project requirements.",
  },
  {
    icon: "⇄",
    title: "Centralized RFQs",
    description: "Manage quotation requests and supplier responses in one workspace.",
  },
  {
    icon: "◷",
    title: "Clearer Decisions",
    description: "Compare supplier quotations and make more informed sourcing choices.",
  },
];

const faqs = [
  {
    question: "What is Global Manufacturer Matchmaker?",
    answer:
      "GMM helps businesses find potential manufacturing partners by matching product requirements with manufacturer capabilities.",
  },
  {
    question: "How do I find a suitable manufacturer?",
    answer:
      "Create a sourcing project, provide your product specifications, material, manufacturing process and quantity. GMM evaluates manufacturers against your requirements.",
  },
  {
    question: "Can I upload CAD files?",
    answer:
      "Yes. You can securely attach supported STEP, STP, IGES, IGS and PDF files. You also provide product details such as materials, manufacturing process and order quantity. Uploading a file does not currently mean GMM automatically extracts or analyses its geometry.",
  },
  {
    question: "Are manufacturers verified?",
    answer:
      "Manufacturers can register on the platform and undergo an administrator review before receiving verified status.",
  },
  {
    question: "Can I request and compare quotations?",
    answer:
      "GMM supports RFQ management, supplier quotation submissions, response tracking and quotation comparison. Administrators can review submitted offers and record a supplier award.",
  },
  {
    question: "How do manufacturers join GMM?",
    answer:
      "Manufacturers can register through the Manufacturer Portal and submit their business and production details for review.",
  },
];

export default function HomePage() {
  return (
    <main className={styles.page} id="home">
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="GMM Home">
          <span className={styles.brandIcon}>G</span>
          <span>
            <span className={styles.brandName}>GMM</span>
            <span className={styles.brandSub}>
              GLOBAL MANUFACTURER MATCHMAKER
            </span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#how-it-works">How It Works</a>
          <Link href="/manufacturers">Manufacturers</Link>
          <a href="#capabilities">Capabilities</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className={styles.headerActions}>
          <Link href="/login" className={styles.signIn}>
            Sign In
          </Link>
          <Link href="#account-types" className={styles.primaryButton}>
            Get Started
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>
            YOUR GLOBAL SOURCING PARTNER
          </span>

          <h1 className={styles.heroTitle}>
            Connect.
            <span>Source. Grow.</span>
          </h1>

          <p className={styles.heroDescription}>
            Move from product design to manufacturing sourcing with one
            organized workspace. Share CAD files and product requirements,
            discover potential manufacturing partners, manage RFQs and
            compare supplier quotations.
          </p>

          <div className={styles.heroActions}>
            <Link href="#account-types" className={styles.primaryButton}>
              Choose Your Account →
            </Link>
            <a href="#how-it-works" className={styles.secondaryButton}>
              Discover How It Works
            </a>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <Image
            src="/gmm-manufacturing-hero.png"
            alt="Industrial robotic arm operating on a modern manufacturing production line"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 50vw"
            className={styles.heroImage}
          />
          <div className={styles.imageOverlay} />
        </div>
      </section>

      <section className={styles.accountTypesSection} id="account-types">
        <div className={styles.accountTypesIntro}>
          <span className={styles.eyebrow}>GET STARTED WITH GMM</span>
          <h2>How would you like to use GMM?</h2>
          <p>
            Choose the account that matches your role. Customers and
            manufacturers have separate registration and workspaces.
          </p>
        </div>

        <div className={styles.accountTypesGrid}>
          <article className={styles.accountTypeCard}>
            <span className={styles.accountTypeIcon}>01</span>
            <h3>I'm a Customer</h3>
            <p>
              Find suitable manufacturing partners, create sourcing projects,
              upload technical documents and manage quotation requests.
            </p>
            <Link href="/register" className={styles.accountTypeButton}>
              Create Customer Account →
            </Link>
            <span className={styles.accountTypeNote}>
              For businesses looking to manufacture products
            </span>
          </article>

          <article className={styles.accountTypeCard}>
            <span className={styles.accountTypeIcon}>02</span>
            <h3>I'm a Manufacturer</h3>
            <p>
              Submit your company profile, manufacturing processes,
              materials, production capabilities and supporting documents
              for verification.
            </p>
            <Link href="/manufacturers" className={styles.accountTypeButton}>
              Apply as a Manufacturing Partner →
            </Link>
            <span className={styles.accountTypeNote}>
              Applications are reviewed before supplier access is approved
            </span>
          </article>
        </div>
      </section>

      <section className={styles.section} id="how-it-works">
        <h2 className={styles.sectionHeading}>How GMM Works</h2>
        <p className={styles.sectionSubtitle}>
          A straightforward path from product requirements to manufacturing partners.
        </p>

        <div className={styles.steps}>
          {steps.map((step) => (
            <article className={styles.step} key={step.number}>
              <span className={styles.stepNumber}>{step.number}</span>
              <div>
                <span className={styles.stepIcon}>{step.icon}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.benefitsSection} id="about">
        <h2 className={styles.sectionHeading}>
          Manufacturing Sourcing, Simplified
        </h2>
        <p className={styles.sectionSubtitle}>
          Tools to help businesses discover and work with manufacturing partners.
        </p>

        <div className={styles.benefits}>
          {benefits.map((benefit) => (
            <article className={styles.benefit} key={benefit.title}>
              <span className={styles.benefitIcon}>{benefit.icon}</span>
              <div>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.capabilitiesSection} id="capabilities">
        <div className={styles.capabilitiesIntro}>
          <span className={styles.eyebrow}>A MORE ORGANIZED SOURCING PROCESS</span>
          <h2 className={styles.sectionHeading}>
            From Product Requirements to Supplier Decisions
          </h2>
          <p className={styles.sectionSubtitle}>
            Bring the information manufacturers need into one structured
            sourcing workflow.
          </p>
        </div>

        <div className={styles.capabilityGrid}>
          <article className={styles.capabilityCard}>
            <span className={styles.capabilityNumber}>01</span>
            <h3>CAD Files & Product Specifications</h3>
            <p>
              Attach supported STEP, STP, IGES, IGS or PDF files. Describe
              your product, category, material, manufacturing process and
              required production quantity.
            </p>
            <span className={styles.capabilityNote}>
              Your files and project details stay together.
            </span>
          </article>

          <article className={styles.capabilityCard}>
            <span className={styles.capabilityNumber}>02</span>
            <h3>Global Manufacturer Sourcing</h3>
            <p>
              Organize manufacturer discovery around production requirements,
              capabilities and verification status, with a sourcing focus on
              manufacturers across Asia and Europe.
            </p>
            <span className={styles.capabilityNote}>
              Actual matches depend on available supplier records.
            </span>
          </article>

          <article className={styles.capabilityCard}>
            <span className={styles.capabilityNumber}>03</span>
            <h3>RFQs & Quotation Comparison</h3>
            <p>
              Manage requests for quotation, track supplier responses,
              review submitted offers and compare quotations in one
              centralized workflow.
            </p>
            <span className={styles.capabilityNote}>
              Keep supplier decisions connected to each project.
            </span>
          </article>
        </div>
      </section>

      <section className={styles.sourcingSection}>
        <div className={styles.sourcingContent}>
          <span className={styles.eyebrow}>BUILT AROUND YOUR PRODUCT</span>
          <h2>Better product information. More useful manufacturer matches.</h2>
          <p>
            A useful sourcing brief goes beyond a product name. Include
            production quantity, materials, manufacturing processes and
            technical requirements so potential suppliers can assess the
            project more effectively.
          </p>
          <Link href="/register" className={styles.primaryButton}>
            Create a Sourcing Project →
          </Link>
        </div>
        <div className={styles.sourcingFacts}>
          <div>
            <strong>CAD & Documents</strong>
            <span>Attach technical files to your project.</span>
          </div>
          <div>
            <strong>Supplier Verification</strong>
            <span>Review manufacturer approval status.</span>
          </div>
          <div>
            <strong>Quotation Workflow</strong>
            <span>Track responses and compare submitted offers.</span>
          </div>
        </div>
      </section>

      <section className={styles.businessModelSection}>
        <span className={styles.businessModelLabel}>GMM BUSINESS PROPOSITION</span>
        <h2>$1,200 per product sourcing project</h2>
        <p>
          A defined sourcing-project service model focused on connecting
          product requirements with suitable manufacturing partners and
          organizing the quotation process.
        </p>
      </section>

      <section className={styles.faqSection} id="faq">
        <h2 className={styles.sectionHeading}>
          Frequently Asked Questions
        </h2>

        <p className={styles.sectionSubtitle}>
          Everything you need to know about getting started with GMM.
        </p>

        <div className={styles.faqList}>
          {faqs.map((faq, index) => (
            <details className={styles.faqItem} key={index}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <div>
          <h2>Ready to find your manufacturing partner?</h2>
          <p>
            Start organizing your sourcing projects and discover potential
            manufacturing matches with GMM.
          </p>
        </div>
        <Link href="/register" className={styles.ctaButton}>
          Get Started Free →
        </Link>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 Global Manufacturer Matchmaker. All rights reserved.</span>
        <span>
          <Link href="/supplier/login">Manufacturer Portal</Link>
          {" · "}
          <Link href="/dashboard">Dashboard</Link>
        </span>
      </footer>
    </main>
  );
}