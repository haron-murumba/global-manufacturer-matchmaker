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
      "Yes. You can attach supported STEP, STP, IGES, IGS and PDF files to your sourcing projects.",
  },
  {
    question: "Are manufacturers verified?",
    answer:
      "Manufacturers can register on the platform and undergo an administrator review before receiving verified status.",
  },
  {
    question: "Can I request and compare quotations?",
    answer:
      "GMM is designed to support RFQ management and quotation comparison. These workflows are part of the platform's ongoing development.",
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
          <a href="#about">About</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className={styles.headerActions}>
          <Link href="/login" className={styles.signIn}>
            Sign In
          </Link>
          <Link href="/register" className={styles.primaryButton}>
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
            Find the right manufacturing partners for your products.
            Match your requirements with manufacturers, manage RFQs and
            compare quotations — all in one place.
          </p>

          <div className={styles.heroActions}>
            <Link href="/register" className={styles.primaryButton}>
              Get Started Free →
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