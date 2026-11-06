/**
 * Landing-page CMS.
 *
 * The whole public homepage is described by one JSON document stored in the
 * `site_content` table (key = "home"). Admins edit it from /admin → Site editor;
 * visitors read it through the public read policy, so it renders identically on
 * the Lovable preview and on the Netlify-hosted site.
 *
 * Images are uploaded to the `site-media` bucket, compressed to WebP first, and
 * stored as long-lived signed URLs so they resolve on any host without extra
 * requests.
 */
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";

import logoUrl from "@/assets/homesake-logo.png";
import heroImage from "@/assets/hero-real-home.jpg";
import craftImage from "@/assets/craft-detail.jpg";
import avatar1 from "@/assets/avatar-1.jpg";
import avatar2 from "@/assets/avatar-2.jpg";
import avatar3 from "@/assets/avatar-3.jpg";
import {
  defaultFaqCategories,
  defaultStandardsPillars,
  defaultStandardsProcess,
  type FaqCategory,
  type StandardsItem,
} from "@/lib/public-page-content";
import {
  defaultBenefitChart,
  defaultBenefitExclusions,
  defaultBenefitModules,
  defaultBenefitPlans,
  defaultBenefitSchedule,
  defaultQuickCareIncluded,
  defaultQuickCareReferred,
  type BenefitChartRow,
  type BenefitExclusion,
  type BenefitModule,
  type BenefitPlan,
  type BenefitScheduleRow,
} from "@/lib/membership-benefits-content";

export const SITE_MEDIA_BUCKET = "site-media";
export const SITE_CONTENT_KEY = "home";

export type LinkItem = { label: string; href: string };

export type SiteContent = {
  seo: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    headScripts: string;
    bodyScripts: string;
  };
  header: {
    logo: string;
    logoAlt: string;
    logoHref: string;
    navLinks: LinkItem[];
    loginLabel: string;
    loginHref: string;
  };
  hero: {
    title: string;
    titleAccent: string;
    titleEnd: string;
    subtitle: string;
    primaryCta: LinkItem;
    secondaryCta: LinkItem;
    image: string;
    imageAlt: string;
    avatars: string[];
    trustPrefix: string;
    trustHighlight: string;
    trustSuffix: string;
    /** Play button + modal player shown over the hero. */
    video: {
      buttonLabel: string;
      src: string;
      /** Optional WebM fallback so every browser can play the clip. */
      srcWebm?: string;
      poster: string;
      title: string;
      description: string;
    };
  };
  health: {
    eyebrow: string;
    title: string;
    intro: string;
    score: number;
    scoreBadge: string;
    overallLabel: string;
    indicators: { label: string; status: string }[];
    nextVisitLabel: string;
    nextVisitDate: string;
    nextVisitNote: string;
    cta: LinkItem;
  };
  services: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    steps: { number: string; title: string; body: string }[];
    image: string;
    imageAlt: string;
    imageTitle: string;
    imageNote: string;
    cards: { title: string; body: string }[];
  };
  coverage: {
    eyebrow: string;
    title: string;
    body: string;
    placeholder: string;
    buttonLabel: string;
    /** Up to 10 labels shown in the on-page list (display only). */
    displayAreas: string[];
    coveredAreas: { zip: string; name: string }[];
    waitlistAreas: { zip: string; name: string }[];
    coveredNote: string;
    waitlistNote: string;
    noneNote: string;
    invalidNote: string;
  };
  pricing: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    monthlyLabel: string;
    annualLabel: string;
    featuredBadge: string;
    annualNote: string;
    monthlyNote: string;
    /** Link under the plans that opens the full benefits breakdown page. */
    benefitsLinkLabel: string;
    benefitsLinkHref: string;
    tiers: {
      name: string;
      monthly: number;
      /** Per-month price charged when the annual plan is selected. */
      annualMonthly: number;
      tagline: string;
      featured: boolean;
      features: string[];
      ctaLabel: string;
    }[];
  };
  consultation: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    body: string;
    bullets: string[];
    phoneLabel: string;
    phoneHref: string;
    web3formsAccessKey: string;
    propertyTypes: string[];
    callWindows: string[];
    submitLabel: string;
    successTitle: string;
    successBody: string;
  };
  terms: {
    eyebrow: string;
    title: string;
    intro: string;
    sections: { heading: string; body: string }[];
    closingNote: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    intro: string;
    searchPlaceholder: string;
    emptyMessage: string;
    categories: FaqCategory[];
    closingTitle: string;
    closingBody: string;
  };
  standards: {
    eyebrow: string;
    title: string;
    intro: string;
    trustStatement: string;
    processTitle: string;
    process: StandardsItem[];
    processSummary: string;
    pillarsTitle: string;
    pillars: StandardsItem[];
    principleOneTitle: string;
    principleOneBody: string;
    principleTwoTitle: string;
    principleTwoBody: string;
    promiseTitle: string;
    promiseBody: string;
    promiseStatement: string;
    promiseTagline: string;
  };
  team: {
    eyebrow: string;
    title: string;
    subtitle: string;
    founderName: string;
    founderRole: string;
    founderBio: string;
    founderQuote: string;
    founderImage: string;
    founderImageAlt: string;
    valuesTitle: string;
    values: { icon: string; title: string; body: string }[];
    processEyebrow: string;
    processTitle: string;
    processIntro: string;
    processStandards: { icon: string; title: string; body: string }[];
    teamEyebrow: string;
    teamTitle: string;
    teamIntro: string;
    teamMembers: {
      name: string;
      role: string;
      body: string;
      image: string;
      imageAlt: string;
    }[];
    coverageEyebrow: string;
    coverageTitle: string;
    coverageBody: string;
    coveragePromise: string;
    coverageHighlights: string[];
    ctaTitle: string;
    ctaBody: string;
    ctaLabel: string;
    ctaHref: string;
  };
  benefits: {
    eyebrow: string;
    title: string;
    intro: string;
    chartTitle: string;
    chartIntro: string;
    plans: BenefitPlan[];
    chart: BenefitChartRow[];
    chartFootnote: string;
    ctaLabel: string;
    ctaHref: string;
    systemTitle: string;
    systemBody: string;
    systemNote: string;
    modulesTitle: string;
    modulesIntro: string;
    modules: BenefitModule[];
    scheduleTitle: string;
    scheduleIntro: string;
    schedule: BenefitScheduleRow[];
    quickCareTitle: string;
    quickCareRule: string;
    quickCareIncludedTitle: string;
    quickCareIncluded: string[];
    quickCareReferredTitle: string;
    quickCareReferred: string[];
    exclusionsTitle: string;
    exclusionsIntro: string;
    exclusions: BenefitExclusion[];
    closingTitle: string;
    closingBody: string;
  };
  footer: {
    brand: string;
    blurb: string;
    columns: { title: string; links: LinkItem[] }[];
    legalLeft: string;
    legalRight: string;
    creditPrefix: string;
    creditName: string;
    creditHref: string;
  };
};


export const defaultSiteContent: SiteContent = {
  seo: {
    metaTitle: "Homesake — Luxury Home Management Membership",
    metaDescription:
      "A private membership that manages your home: vetted contractors, proactive maintenance, and one dedicated estate manager.",
    metaKeywords: "home management, estate management, luxury home maintenance, vetted contractors",
    headScripts: "",
    bodyScripts: "",
  },
  header: {
    logo: logoUrl,
    logoAlt: "Homesake logo",
    logoHref: "/",
    navLinks: [
      { label: "Services", href: "#services" },
      { label: "Our Standards", href: "/our-standards" },
      { label: "Coverage", href: "#coverage" },
      { label: "Membership", href: "#pricing" },
      { label: "Team", href: "/meet-the-team" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "#consultation" },
    ],
    loginLabel: "Client Portal Login",
    loginHref: "/login",
  },
  hero: {
    title: "Home maintenance",
    titleAccent: "and home checks",
    titleEnd: "in South Elgin, IL",
    subtitle:
      "Homesake helps you stay on top of routine home maintenance with scheduled visits, included upkeep, and a clear record of what we checked. We can change standard HVAC filters and replace detector batteries when included in your plan. If something needs specialized work, we can help coordinate the right professional.",
    primaryCta: { label: "Request a Free Consultation", href: "#consultation" },
    secondaryCta: { label: "Get a Free Consultation", href: "#consultation" },
    image: heroImage,
    imageAlt: "Large luxury home exterior at dusk cared for by Homesake",
    avatars: [avatar1, avatar2, avatar3],
    trustPrefix: "",
    trustHighlight: "",
    trustSuffix: "",
    video: {
      buttonLabel: "Watch how it works",
      src: "",
      srcWebm: "",
      poster: "",
      title: "Inside a Homesake visit",
      description:
        "Discover how Homesake handles complete home maintenance with certified care and regular inspections.",
    },
  },
  health: {
    eyebrow: "Member dashboard preview",
    title: "Your Home Maintenance Report",
    intro: "See completed maintenance, photos when applicable, and items that need follow-up after your scheduled visit.",
    score: 94,
    scoreBadge: "Excellent",
    overallLabel: "Overall score",
    indicators: [
      { label: "Roof", status: "Good" },
      { label: "HVAC", status: "Good" },
      { label: "Plumbing", status: "Good" },
      { label: "Electrical", status: "Good" },
      { label: "Exteriors", status: "Good" },
      { label: "Interiors", status: "Good" },
      { label: "Safety", status: "Good" },
      { label: "Appliances", status: "Good" },
    ],
    nextVisitLabel: "Next visit",
    nextVisitDate: "Sep 14",
    nextVisitNote: "9:00 AM · Seasonal HVAC & roof check",
    cta: { label: "View Full Report", href: "/login" },
  },
  services: {
    eyebrow: "How it works",
    title: "What We Check and",
    titleAccent: "Maintain During a Visit",
    steps: [
      {
        number: "01",
        title: "The walkthrough",
        body: "We start by learning about your home and noting the accessible systems and equipment that need routine care.",
      },
      {
        number: "02",
        title: "The care plan",
        body: "We schedule routine maintenance and seasonal home checks based on your membership.",
      },
      {
        number: "03",
        title: "We handle it",
        body: "We document the visit, explain what needs attention, and can help arrange a qualified contractor at your request.",
      },
    ],
    image: craftImage,
    imageAlt: "Craftsman fitting a brass fixture in a luxury home",
    imageTitle: "Routine home maintenance",
    imageNote: "Small upkeep tasks and a record of what was completed.",
    cards: [
      {
        title: "Preventive maintenance",
        body: "We handle approved upkeep such as standard filter changes, detector batteries, and accessible loose hardware.",
      },
      {
        title: "Contractor coordination",
        body: "When work needs a specialist, we can help coordinate a qualified contractor at your request.",
      },
      {
        title: "Visual home checks",
        body: "We look for visible issues such as leaks or deterioration and let you know what needs attention.",
      },
      {
        title: "Visit documentation",
        body: "Review completed tasks, observations, and photos when applicable.",
      },
      {
        title: "Seasonal upkeep",
        body: "Scheduled visits help you keep up with seasonal home maintenance and follow-up items.",
      },
      {
        title: "Vacation home checks",
        body: "Ask about Homesake Away for scheduled checks while you travel.",
      },
    ],
  },
  coverage: {
    eyebrow: "Coverage",
    title: "Home Maintenance Service Areas",
    body: "Based in South Elgin, Illinois. Check your ZIP code or request a free consultation to confirm service at your address.",
    placeholder: "Enter ZIP code",
    buttonLabel: "Check",
    displayAreas: ["South Elgin, IL"],
    coveredAreas: [{ zip: "60177", name: "South Elgin, IL" }],
    waitlistAreas: [],
    coveredNote: "Request a free consultation to confirm availability at your address.",
    waitlistNote: "Request a consultation to ask about availability.",
    noneNote: "If you’re near South Elgin, request a consultation so we can confirm coverage at your address.",
    invalidNote: "Please enter a valid 5-digit ZIP code.",
  },
  pricing: {
    eyebrow: "Membership",
    title: "Compare Home Maintenance",
    titleAccent: "Memberships",
    monthlyLabel: "Monthly",
    annualLabel: "Annual — Save 15%",
    featuredBadge: "Most chosen",
    annualNote: "Billed annually",
    monthlyNote: "Billed monthly · cancel anytime",
    benefitsLinkLabel: "Compare Full Plan Features",
    benefitsLinkHref: "/membership-benefits",
    tiers: [
      {
        name: "Essential",
        monthly: 249,
        annualMonthly: 208,
        tagline: "For a primary residence that just needs to run.",
        featured: false,
        features: [
          "Seasonal maintenance calendar",
          "Vetted contractor bench access",
          "Quarterly scheduled home visits",
          "Digital home record & warranties",
          "Business-hours support line",
        ],
        ctaLabel: "Start with Essential",
      },
      {
        name: "Signature",
        monthly: 549,
        annualMonthly: 458,
        tagline: "Our most-chosen membership. Full hands-off care.",
        featured: true,
        features: [
          "Everything in Essential",
          "Dedicated estate manager",
          "Unlimited coordination & scheduling",
          "24/7 emergency triage",
          "Quarterly on-site inspections",
          "Member contractor rates (avg. 14% off)",
        ],
        ctaLabel: "Start with Signature",
      },
      {
        name: "Estate",
        monthly: 1290,
        annualMonthly: 1075,
        tagline: "Multi-property portfolios and staffed households.",
        featured: false,
        features: [
          "Everything in Signature",
          "Up to four properties",
          "Renovation project management",
          "Vendor & household staff oversight",
          "Annual capital-planning report",
          "Same-day priority dispatch",
        ],
        ctaLabel: "Start with Estate",
      },
    ],
  },
  consultation: {
    eyebrow: "Consultation",
    title: "A 20-minute call.",
    titleAccent: "No pitch, no pressure.",
    body: "We'll walk your property's systems, age, and history, then tell you plainly whether a membership is worth it for you. If it isn't, we'll say so.",
    bullets: [
      "Same-week availability in served metros",
      "Your estate manager joins the call",
      "Transparent pricing before you commit",
    ],
    phoneLabel: "",
    phoneHref: "",
    web3formsAccessKey: "",
    propertyTypes: ["Primary residence", "Second home", "Multi-property portfolio"],
    callWindows: ["Morning (9–12)", "Afternoon (12–4)", "Evening (4–7)"],
    submitLabel: "Request my consultation",
    successTitle: "Request received.",
    successBody: "An estate manager will confirm your slot within one business day.",
  },
  terms: {
    eyebrow: "Legal",
    title: "Terms and Conditions",
    intro:
      "These terms govern the Homesake membership, the services we perform at your property, and the recurring billing that supports them. By purchasing a membership or allowing Homesake to perform services at your property, you confirm you have read and agreed to them.",
    sections: [
      {
        heading: "Homesake services",
        body: "Homesake provides recurring home-management, preventive-maintenance, home-check, documentation, and service-coordination services. Depending on the plan selected, services may include scheduled visits, visual observations of accessible areas, routine preventive-maintenance tasks, replacement of certain standard consumable items, photographs and reports, identification and documentation of observable maintenance concerns, vacation and away checks, maintenance reminders, and, at your request, coordination of specialized or licensed service providers. Specific services, visit frequency, included items, limits, and benefits are determined by the membership plan purchased and may be subject to reasonable service limitations communicated by Homesake.",
      },
      {
        heading: "Homesake is not a home inspection company",
        body: "Homesake does not provide professional home inspections. Our services are not a real-estate, code, engineering, environmental, structural, appraisal, or insurance inspection, and must not be represented as one. Home Specialists are not acting as licensed home inspectors unless Homesake enters into a separate written agreement stating otherwise. Visits provide routine home oversight, preventive maintenance, and observations of readily accessible conditions. Hire an appropriately licensed professional whenever an inspection, diagnosis, certification, testing, engineering opinion, or specialized evaluation is required.",
      },
      {
        heading: "No guarantee that every problem will be identified",
        body: "Homesake uses reasonable care, but does not guarantee that every existing or developing condition, defect, hazard, failure, leak, malfunction, or maintenance need will be discovered during a visit. Many conditions are concealed, intermittent, inaccessible, underground, behind walls or ceilings, inside equipment, or obscured by personal property, and conditions can develop between scheduled visits. A Homesake visit is not a guarantee of the condition or safety of a home, nor a guarantee against damage, mechanical failure, water intrusion, mold, fire, theft, pest activity, weather damage, or other losses.",
      },
      {
        heading: "Visual and non-invasive checks",
        body: "Unless agreed otherwise in writing, observations are visual and non-invasive. Homesake does not remove walls, ceilings, flooring, insulation, or permanently installed components; dismantle mechanical equipment; perform destructive or environmental testing; enter areas reasonably considered unsafe or inaccessible; move unusually heavy furniture; or excavate. Homesake may decline any task a Home Specialist reasonably determines is unsafe, outside our scope, or better performed by a specialized or licensed provider.",
      },
      {
        heading: "Routine preventive maintenance included",
        body: "Depending on the plan, Homesake may replace standard smoke and CO detector batteries, standard HVAC filters, and accessible standard light bulbs; tighten loose cabinet hardware; lubricate squeaky hinges; and perform other minor routine maintenance included in the plan. Standard replacement items identified as included may be provided at no additional charge, subject to reasonable quantity, size, type, accessibility, availability, and cost limits. Specialty, premium, proprietary, custom-sized, smart-home, commercial-grade, or excessive-quantity products are not included unless expressly stated, and approval may be required before purchase.",
      },
      {
        heading: "Services Homesake does not perform",
        body: "Unless Homesake states in writing that it is appropriately licensed and has agreed to the work, Home Specialists do not perform work requiring specialized licensing, including electrical work, plumbing repairs, HVAC repairs, roofing, structural repairs, gas-line work, major appliance repairs, mold or asbestos remediation, pest-control treatments, hazardous-material handling, or major construction. Homesake may also decline work involving unreasonable heights, roofs, confined spaces, energized systems, hazardous materials, aggressive animals, or other conditions that present a safety concern.",
      },
      {
        heading: "Specialized services and contractor coordination",
        body: "If an issue requires specialized or licensed service, Homesake can coordinate the repair at your request. No third-party work will be authorized at your expense without your approval, except under separate written emergency authorization. Contractors perform work independently and are responsible for their own workmanship, licensing, insurance, and warranties. A referral is not a guarantee of a contractor, and you may always select your own. Homesake may receive referral, coordination, or similar compensation from participating providers where permitted by law, with any required disclosures made to you.",
      },
      {
        heading: "Access, pets and property conditions",
        body: "You authorize Homesake personnel to enter the property at scheduled or otherwise authorized times and perform services within the scope of your plan, and confirm that you own the property or have authority to grant access. Keys, garage codes, alarm details, and smart-lock credentials you share will be safeguarded using reasonable procedures, and you should notify Homesake promptly when access instructions change. Animals or conditions that could affect the safety of our personnel must be disclosed; a visit may be refused or ended if a safety risk is reasonably believed to exist.",
      },
      {
        heading: "Photographs, reports and home records",
        body: "You authorize Homesake to photograph areas of the property reasonably necessary to document services, conditions, completed tasks, recommendations, and property history. These photographs may be stored in your Homesake account and service records. Identifiable interior photographs will not intentionally be used for public advertising without separate permission. Reports reflect observations made at the time of the visit and are not certifications or guarantees regarding the condition of the property.",
      },
      {
        heading: "Emergencies",
        body: "Homesake is not an emergency-response service and does not guarantee 24-hour monitoring or immediate response. For fire, suspected gas leaks, active flooding, electrical hazards, medical emergencies, crimes in progress, or immediate danger, contact 911, the fire department, your utility provider, or another appropriate emergency service. If Homesake discovers what reasonably appears to be an emergency during a visit, you authorize reasonable steps to notify you and/or emergency services.",
      },
      {
        heading: "Scheduling, visit cancellations and missed access",
        body: "Homesake makes reasonable efforts to perform visits at the frequency included in your plan. Exact arrival times are not guaranteed unless confirmed, and visits may be rescheduled due to severe weather, illness, unsafe conditions, emergencies, holidays, or other circumstances outside our reasonable control. Please give at least 24 hours' notice to cancel or reschedule an individual visit; a missed-visit or late-cancellation fee may apply where less notice is given, particularly once a Home Specialist has been dispatched. Any such fee will be disclosed before it is charged.",
      },
      {
        heading: "Membership cancellation",
        body: "Members can turn off automatic renewal through the member portal before their next scheduled billing date. Membership remains active through the end of the paid billing period, including annual terms. Cancellation does not retroactively refund services already performed or membership periods already provided, except where required by law. The 24-hour visit cancellation notice applies separately to individual appointments.",
      },
      {
        heading: "Automatic renewal and recurring billing",
        body: "Unless expressly stated otherwise, memberships are continuous subscriptions that renew automatically at the applicable billing interval until canceled. By enrolling, you authorize Homesake and its payment processor to charge the payment method on file for recurring membership fees and other charges you specifically authorize. Membership price, billing frequency, automatic-renewal terms, cancellation procedure, and any minimum commitment are disclosed before enrollment. Pricing may change on advance notice as required by law, applied prospectively only.",
      },
      {
        heading: "Payment authorization and refunds",
        body: "You agree to maintain a valid payment method. Membership fees and authorized additional charges are processed through our third-party payment processor. Failed payment may result in suspension of future services after reasonable notice and an opportunity to update your payment information. Except where required by law, fees attributable to completed service periods are generally non-refundable. If Homesake cancels a prepaid service it cannot reasonably reschedule or provide, an appropriate credit or refund may be issued.",
      },
      {
        heading: "No warranty of future condition",
        body: "Homesake does not warrant that maintenance performed or observations made during a visit will prevent future failures, damage, accidents, deterioration, or repair costs. Homes and their systems age naturally and may fail without visible advance warning. Recommendations regarding maintenance intervals are general unless expressly based on manufacturer specifications or specialist advice.",
      },
      {
        heading: "Limitation of liability",
        body: "To the maximum extent permitted by applicable law, Homesake is not liable for indirect, incidental, special, exemplary, punitive, or consequential damages arising from services provided under these terms. Nothing here is intended to exclude liability that cannot lawfully be excluded or limited. Homesake is not responsible for pre-existing conditions it did not cause, for concealed or inaccessible defects, or for conditions arising between visits.",
      },
      {
        heading: "Your personal property",
        body: "Homesake personnel use reasonable care while working within the property. Please secure valuable, fragile, irreplaceable, confidential, or hazardous property before service. Any alleged damage caused during a visit should be reported promptly so it can be investigated.",
      },
      {
        heading: "Weather and events beyond our control",
        body: "Homesake is not responsible for delays or inability to perform services caused by severe weather, natural disasters, utility outages, government actions, road conditions, labor disruptions, emergencies, or other circumstances beyond our reasonable control.",
      },
      {
        heading: "Insurance and certifications",
        body: "Homesake maintains insurance appropriate to its operations. Membership does not provide insurance coverage for your property; you remain responsible for homeowner's, property, liability, flood, and other coverage. Homesake is not acting as an insurer, public adjuster, engineer, architect, building-code official, or environmental testing company, does not guarantee code compliance, and does not represent members in negotiating insurance claims, though factual service records and photographs may be provided where appropriate.",
      },
      {
        heading: "Communications, privacy and data",
        body: "You authorize Homesake to contact you about appointments, service reports, identified issues, billing, membership administration, and requested services by email, telephone, text message, app notification, or other contact details you provide, subject to applicable law. Homesake collects information needed to operate the membership, including contact and property information, service history, photographs, maintenance records, contractor information, and payment-related information, handled in accordance with our Privacy Policy.",
      },
      {
        heading: "Changes, termination and governing law",
        body: "Homesake may reasonably update its service offerings, operating procedures, or these terms; material changes affecting existing members are communicated as required by law and are not applied retroactively where prohibited. Homesake may terminate or suspend membership for nonpayment, unsafe conditions, abusive conduct toward personnel, repeated inability to access the property, fraudulent activity, or other material violations, with reasonable notice where practical. These terms are governed by the laws of the State of Illinois, without regard to conflict-of-law principles. If any provision is found invalid or unenforceable, the remaining provisions stay in effect.",
      },
      {
        heading: "Member responsibilities and entire agreement",
        body: "You remain ultimately responsible for the ownership, maintenance, repair, security, insurance, and operation of your property. Membership does not replace homeowner's insurance, professional inspections, manufacturer-recommended servicing, emergency services, or licensed contractors, and urgent conditions reported by Homesake should be addressed promptly. These terms, your selected plan, applicable service descriptions, the Privacy Policy, and any separately executed service authorization form the agreement between you and Homesake concerning membership services.",
      },
    ],
    closingNote:
      "Questions about these terms? Contact your estate manager or the Homesake support line and we'll walk you through them.",
  },
  faq: {
    eyebrow: "Support",
    title: "Home Maintenance Membership FAQ",
    intro:
      "Everything members ask about what Homesake does, how visits work, and how billing is handled.",
    searchPlaceholder: "Search questions…",
    emptyMessage: "No questions match your search. Try a different word, or contact us directly.",
    categories: defaultFaqCategories,
    closingTitle: "Still have questions?",
    closingBody:
      "We're happy to help. Contact Homesake and we'll explain how the service works, what's included with your membership, and whether Homesake is the right fit for your home.",
  },
  standards: {
    eyebrow: "Our Standards",
    title: "What to Expect During a Homesake Visit",
    intro:
      "Inviting someone into your home requires trust. At Homesake, that trust is something we believe must be earned on every visit. That's why we've created clear standards for how our team members are selected, trained, identified, how they enter and care for your home, and how every visit is documented.",
    trustStatement:
      "Whether you're home, at work, traveling, or trusting us to help care for a loved one's property, you should always know who is in your home, what they're doing, and what was completed.",
    processTitle: "The Homesake Standard",
    process: defaultStandardsProcess,
    processSummary: "We check it. We care for it. We document it. We help get the rest handled.",
    pillarsTitle: "How we work",
    pillars: defaultStandardsPillars,
    principleOneTitle: "We don't guess",
    principleOneBody:
      "If we're unsure about something, we don't pretend to know. We document what we observe, communicate the concern, and recommend further evaluation when appropriate. We would rather tell you, ‘This should be looked at by a professional,’ than attempt something outside our expertise.",
    principleTwoTitle: "Safety comes first",
    principleTwoBody:
      "No maintenance task is worth putting a homeowner, employee, or property at unnecessary risk. Homesake professionals may stop or decline a task when conditions are unsafe, when specialized equipment or licensing is required, or when the work falls outside our approved service scope. Safety isn't an inconvenience — it's part of our standard.",
    promiseTitle: "The Homesake Promise",
    promiseBody:
      "We can't promise that nothing will ever go wrong with your home. No company can. What we can promise is a commitment to showing up with a professional process, treating your home with respect, taking care of the routine things within our scope, documenting what we see, communicating concerns, and helping you determine what happens next. Because taking care of a home isn't one big thing. It's hundreds of little things handled consistently over time.",
    promiseStatement: "That's the Homesake Standard.",
    promiseTagline: "Your home. Taken care of.",
  },
  team: {
    eyebrow: "Meet the team",
    title: "Meet Steven Woloszyk, Founder of Homesake",
    subtitle: "Meet the team behind Homesake’s scheduled home maintenance and home checks in the South Elgin area.",
    founderName: "Steven Woloszyk",
    founderRole: "Founder & CEO",
    founderBio:
      "Steven founded Homesake after 15 years with the St. Charles Police Department and experience owning and operating a commercial cleaning and maintenance business. He brings that focus on trust, accountability, and consistent follow-through to routine home care.",
    founderQuote:
      "We help homeowners stay on top of routine upkeep and know what needs attention after each visit.",
    founderImage: craftImage,
    founderImageAlt: "Detail of home maintenance work",
    valuesTitle: "What we stand for",
    values: [
      {
        icon: "ShieldCheck",
        title: "Integrity First",
        body: "Rooted in law enforcement values—transparency, trust, and accountability in every job.",
      },
      {
        icon: "Eye",
        title: "Proactive Protection",
        body: "We fix small issues before they become expensive problems.",
      },
      {
        icon: "Hammer",
        title: "Craftsmanship",
        body: "Clear checklists, careful work, and a record of what was done.",
      },
    ],
    processEyebrow: "Our process & standards",
    processTitle: "Trusted people. Consistent standards.",
    processIntro:
      "Every person invited into your home is selected with care and supported by clear service standards.",
    processStandards: [
      {
        icon: "BadgeCheck",
        title: "Carefully vetted",
        body: "Team members and trade partners are reviewed for experience, professionalism, communication, and fit with the Homesake standard.",
      },
      {
        icon: "ShieldCheck",
        title: "Background checked",
        body: "Our home-care professionals complete identity and background screening before serving members in their homes.",
      },
      {
        icon: "Wrench",
        title: "Professionally prepared",
        body: "Applicable licensing, insurance, certifications, and trade qualifications are verified before specialized work is coordinated.",
      },
      {
        icon: "Sparkles",
        title: "Held to a higher standard",
        body: "Documented visits, respectful conduct, clean work areas, and clear follow-through are built into every member interaction.",
      },
    ],
    teamEyebrow: "Your home-care team",
    teamTitle: "The right support at every step",
    teamIntro:
      "From the person who knows your property to the specialists who keep each visit moving, Homesake brings one coordinated team around your home.",
    teamMembers: [
      {
        name: "Your Property Manager",
        role: "Dedicated home advocate",
        body: "Your consistent point of contact who understands your home, tracks priorities, and keeps the care plan moving.",
        image: "",
        imageAlt: "Homesake property manager",
      },
      {
        name: "Home-Care Technicians",
        role: "Inspection & maintenance team",
        body: "Detail-focused professionals who complete scheduled checkpoints, approved quick-care tasks, and clear visit documentation.",
        image: "",
        imageAlt: "Homesake home-care technician",
      },
      {
        name: "Member Support",
        role: "Scheduling & coordination",
        body: "Responsive support for appointments, follow-up questions, service coordination, and the details between visits.",
        image: "",
        imageAlt: "Homesake member support specialist",
      },
    ],
    coverageEyebrow: "Local coverage & commitment",
    coverageTitle: "Local attention, backed by a clear promise.",
    coverageBody:
      "Homesake serves a focused regional footprint so our team can stay responsive, know the homes we care for, and build lasting relationships with members and trusted local professionals.",
    coveragePromise:
      "If something about a visit does not meet the Homesake standard, tell us. We will listen, communicate clearly, and work to make it right.",
    coverageHighlights: [
      "A dedicated team that knows your home",
      "Reliable communication before and after visits",
      "Trusted local trade coordination when specialist work is needed",
    ],
    ctaTitle: "Let's talk about your home.",
    ctaBody:
      "Book a short call and we'll walk your property's systems, age, and history — then tell you plainly whether a membership is worth it.",
    ctaLabel: "Request a consultation",
    ctaHref: "/#consultation",
  },
  benefits: {
    eyebrow: "Membership benefits",
    title: "Compare Home Maintenance Membership Plans",
    intro:
      "A clear guide to what Homesake checks, what each service covers, and when each level of care happens throughout the year. We check. We maintain. We document. We coordinate.",
    chartTitle: "Membership packages at a glance",
    chartIntro:
      "Choose the level of ongoing home care that best fits your property and how involved you want Homesake to be.",
    plans: defaultBenefitPlans,
    chart: defaultBenefitChart,
    chartFootnote:
      "Pool & Hot Tub / Spa Care are optional add-ons for homes with these features at $20 per applicable visit. If a home has both a pool and a hot tub/spa, each selected add-on is $20 per visit.",
    ctaLabel: "Choose a membership",
    ctaHref: "/#pricing",
    systemTitle: "The 350-Point Year-Round Home Care System",
    systemBody:
      "The Homesake 350-Point Year-Round Home Care System is the complete care framework. It is not a promise that all 350 checkpoints are performed during a single visit. Checkpoints are scheduled according to membership level, season, equipment, prior findings, and what is present, accessible, safe, and applicable to the home.",
    systemNote:
      "Pool and hot tub/spa checkpoints apply only to homes with those features and are visual, non-invasive care observations. Homesake does not replace a licensed pool/spa technician, perform code or barrier-compliance inspections, or guarantee water chemistry, sanitation, equipment performance, or swimmer safety.",
    modulesTitle: "Every checkpoint, module by module",
    modulesIntro:
      "Open a module to read each checkpoint. Items are performed when present, accessible, safe and applicable to your home.",
    modules: defaultBenefitModules,
    scheduleTitle: "Service-by-service scheduling guide",
    scheduleIntro: "When each part of the system happens across the year.",
    schedule: defaultBenefitSchedule,
    quickCareTitle: "What we handle — and what we refer",
    quickCareRule:
      "Homesake Quick-Care Rule: if it is safe, takes only a few minutes, requires no specialized trade skill, and falls within Homesake's approved maintenance scope, we take care of it during the visit.",
    quickCareIncludedTitle: "Included within approved Quick-Care scope",
    quickCareIncluded: defaultQuickCareIncluded,
    quickCareReferredTitle: "Documented and referred to a qualified professional",
    quickCareReferred: defaultQuickCareReferred,
    exclusionsTitle: "Work Homesake does not perform",
    exclusionsIntro:
      "Homesake is a preventive home-care and home-management service — not a home inspection, handyman, or licensed trade contractor. We do not diagnose, certify, or perform specialized work that should be completed by a qualified or licensed professional.",
    exclusions: defaultBenefitExclusions,
    closingTitle: "Check. Care. Document. Coordinate.",
    closingBody:
      "Homesake checks the home, takes care of approved routine maintenance within our scope, documents what we observe, and helps coordinate the right professional when a larger or specialized job is needed.",
  },
  footer: {
    brand: "Homesake",
    blurb:
      "Routine home maintenance, documented visits, and help coordinating specialized work.",
    columns: [
      {
        title: "Membership",
        links: [
          { label: "Essential", href: "#pricing" },
          { label: "Signature", href: "#pricing" },
          { label: "Estate", href: "#pricing" },
          { label: "What's included", href: "/membership-benefits" },
          { label: "Gift a membership", href: "#consultation" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "Meet the team", href: "/meet-the-team" },
          { label: "Our standards", href: "/our-standards" },
          { label: "FAQ", href: "/faq" },
          { label: "Terms & Conditions", href: "/terms" },
        ],
      },
      {
        title: "Support",
        links: [
          { label: "Member login", href: "/login" },
          { label: "Coverage map", href: "#coverage" },
          { label: "Contact", href: "#consultation" },
        ],
      },
    ],
    legalLeft: "© {year} Homesake. All rights reserved.",
    legalRight: "",
    creditPrefix: "Developed by",
    creditName: "Sitelora",
    creditHref: "https://sitelora.com/",
  },

};

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Saved values win; missing keys fall back to the shipped defaults. */
export function mergeContent<T>(base: T, saved: unknown): T {
  if (saved === null || saved === undefined) return base;
  if (Array.isArray(base)) return (Array.isArray(saved) ? saved : base) as T;
  if (typeof base === "object" && base !== null) {
    if (typeof saved !== "object" || Array.isArray(saved)) return base;
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const key of Object.keys(base as Record<string, unknown>)) {
      out[key] = mergeContent(
        (base as Record<string, unknown>)[key],
        (saved as Record<string, unknown>)[key],
      );
    }
    return out as T;
  }
  return (typeof saved === typeof base ? saved : base) as T;
}

const legacyServiceCopy = new Map<string, string>(Object.entries({
  "A certified estate manager documents every system, appliance, warranty, and finish in your home.": "We start by learning about your home and noting the accessible systems and equipment that need routine care.",
  "We build a seasonal maintenance calendar with cost forecasts, so nothing is a surprise.": "We schedule routine maintenance and seasonal home checks based on your membership.",
  "Scheduling, contractor vetting, on-site supervision, invoices, and follow-up. You approve, we execute.": "We document the visit, explain what needs attention, and can help arrange a qualified contractor at your request.",
  "HVAC, plumbing, roofing, and mechanicals on a scheduled cadence.": "We handle approved upkeep such as standard filter changes, detector batteries, and accessible loose hardware.",
  "Vetted contractor bench": "Contractor coordination",
  "Licensed, insured, background-checked trades at member-only rates.": "When work needs a specialist, we can help coordinate a qualified contractor at your request.",
  "Emergency response": "Visual home checks",
  "24/7 line with a named human. Triage in minutes, not hours.": "We look for visible issues such as leaks or deterioration and let you know what needs attention.",
  "Project management": "Visit documentation",
  "Renovations supervised end-to-end with transparent bid comparison.": "Review completed tasks, observations, and photos when applicable.",
  "Vendor coordination": "Seasonal upkeep",
  "Landscaping, pool, cleaning, and seasonal crews on one calendar.": "Scheduled visits help you keep up with seasonal home maintenance and follow-up items.",
  "Home concierge": "Vacation home checks",
  "Deliveries, guest prep, and pre-arrival readiness for second homes.": "Ask about Homesake Away for scheduled checks while you travel.",
}));

function updatedServiceCopy(value: string): string {
  return legacyServiceCopy.get(value) ?? value;
}

/** Fills in fields added after content was first saved (saved arrays win wholesale). */
function normalize(content: SiteContent): SiteContent {
  const sampleAreas = new Set([
    "Palo Alto, CA", "Los Altos, CA", "Beverly Hills, CA", "Upper West Side, NY",
    "Miami Beach, FL", "Austin, TX", "Lincoln Park, IL", "Back Bay, MA",
    "Bellevue, WA", "Boulder, CO", "Buckhead, GA",
  ]);
  const display = (content.coverage.displayAreas ?? []).filter(
    (name) => typeof name === "string" && name.trim() !== "" && !sampleAreas.has(name),
  );
  const configuredAreas = content.coverage.coveredAreas.filter((area) => !sampleAreas.has(area.name));
  const coveredAreas = !configuredAreas.length && content.coverage.coveredAreas.length
    ? defaultSiteContent.coverage.coveredAreas
    : configuredAreas;
  const waitlistAreas = content.coverage.waitlistAreas.filter((area) => !sampleAreas.has(area.name));
  const legacyHero =
    content.hero.title === "Your Trusted Local" || content.hero.title === "Routine maintenance";
  const placeholderPhone = content.consultation.phoneHref === "tel:+18005550142"
    || content.consultation.phoneLabel === "(800) 555-0142";
  return {
    ...content,
    hero: {
      ...content.hero,
      ...(legacyHero ? {
        title: defaultSiteContent.hero.title,
        titleAccent: defaultSiteContent.hero.titleAccent,
        titleEnd: defaultSiteContent.hero.titleEnd,
        subtitle: defaultSiteContent.hero.subtitle,
      } : {}),
      primaryCta: content.hero.primaryCta.label === "Schedule a Walkthrough" &&
        content.hero.primaryCta.href === "#consultation"
        ? defaultSiteContent.hero.primaryCta
        : content.hero.primaryCta,
      trustHighlight: content.hero.trustHighlight === "1,200+" ? "" : content.hero.trustHighlight,
    },
    health: {
      ...content.health,
      title: content.health.title === "Your Home Health at a Glance"
        ? defaultSiteContent.health.title : content.health.title,
      intro: content.health.intro === "A living record of every system in your home, updated after each inspection."
        ? defaultSiteContent.health.intro : content.health.intro,
    },
    services: {
      ...content.services,
      title: content.services.title === "Three steps to a home that"
        ? defaultSiteContent.services.title : content.services.title,
      titleAccent: content.services.titleAccent === "maintains itself."
        ? defaultSiteContent.services.titleAccent : content.services.titleAccent,
      imageTitle: content.services.imageTitle === "Every trade, personally vetted."
        ? defaultSiteContent.services.imageTitle : content.services.imageTitle,
      imageNote: content.services.imageNote === "Fewer than 1 in 9 applicants join our bench."
        ? defaultSiteContent.services.imageNote : content.services.imageNote,
      steps: content.services.steps.map((step) => ({ ...step, body: updatedServiceCopy(step.body) })),
      cards: content.services.cards.map((card) => ({
        title: updatedServiceCopy(card.title),
        body: updatedServiceCopy(card.body),
      })),
    },
    standards: {
      ...content.standards,
      title: content.standards.title === "Your home deserves a higher standard."
        ? defaultSiteContent.standards.title : content.standards.title,
    },
    benefits: {
      ...content.benefits,
      title: content.benefits.title === "The 350-Point Year-Round Home Care System"
        ? defaultSiteContent.benefits.title : content.benefits.title,
      systemTitle: content.benefits.systemTitle === "How the 350-Point System works"
        ? defaultSiteContent.benefits.systemTitle : content.benefits.systemTitle,
    },
    consultation: {
      ...content.consultation,
      ...(placeholderPhone ? { phoneLabel: "", phoneHref: "" } : {}),
    },
    team: {
      ...content.team,
      founderImageAlt: content.team.founderImage === craftImage
        ? defaultSiteContent.team.founderImageAlt : content.team.founderImageAlt,
      title: content.team.title === "The People Behind Your Peace of Mind"
        ? defaultSiteContent.team.title : content.team.title,
      subtitle: content.team.subtitle === "Dedicated professionals committed to protecting and preserving your home."
        ? defaultSiteContent.team.subtitle : content.team.subtitle,
      founderBio: content.team.founderBio === "Built on a foundation of service and craftsmanship, Steven founded Homesake after years of dedicated service as a police officer and licensed general contractor. Having seen firsthand how neglected property maintenance leads to costly repairs, he created Homesake—a proactive home management system designed to protect your home's value and give homeowners absolute peace of mind."
        ? defaultSiteContent.team.founderBio : content.team.founderBio,
      founderQuote: content.team.founderQuote === "Your home is your largest investment. Our mission is to handle the details so you never have to worry about unexpected repairs again."
        ? defaultSiteContent.team.founderQuote : content.team.founderQuote,
      values: content.team.values.map((value) => value.body === "Quality standards driven by professional general contracting experience."
        ? { ...value, body: "Clear checklists, careful work, and a record of what was done." } : value),
    },
    faq: {
      ...content.faq,
      title: content.faq.title === "Frequently asked questions"
        ? defaultSiteContent.faq.title : content.faq.title,
      categories: content.faq.categories.map((category) => ({
        ...category,
        items: category.items.map((item) => item.a === "Yes. Homesake memberships can be canceled at any time. To prevent your next recurring membership charge and future scheduled membership service, cancellation should be submitted at least 24 hours before your next scheduled service visit, subject to the terms of your Membership Service Agreement."
          ? { ...item, a: "Yes. Turn off renewal in your member portal before your next billing date. Your membership stays active through the end of the period you already paid for, including an annual term. The 24-hour notice applies to rescheduling or canceling an individual visit. See the Membership Terms for refund details." } : item),
      })),
    },
    terms: {
      ...content.terms,
      sections: content.terms.sections.map((section) => section.body === "Memberships may be canceled at any time. To prevent the next recurring charge and future scheduled service, cancellation must be submitted at least 24 hours before your next scheduled service visit. Cancellation does not retroactively refund services already performed or membership periods already provided, except where required by law. After cancellation takes effect, no additional recurring membership charges are made. Members who enrolled online are provided an online method of cancellation as required by law."
        ? { ...section, body: "Members can turn off automatic renewal through the member portal before their next scheduled billing date. Membership remains active through the end of the paid billing period, including annual terms. Cancellation does not retroactively refund services already performed or membership periods already provided, except where required by law. The 24-hour visit cancellation notice applies separately to individual appointments." } : section),
    },
    footer: {
      ...content.footer,
      brand: content.footer.brand.replaceAll("Home Harmony Hub", "Homesake"),
      legalLeft: content.footer.legalLeft.replaceAll("Home Harmony Hub", "Homesake"),
      blurb: content.footer.blurb.includes("quietly obsessive about detail")
        ? defaultSiteContent.footer.blurb : content.footer.blurb,
      legalRight: content.footer.legalRight.includes("#HHH-4471") ? "" : content.footer.legalRight,
    },
    coverage: {
      ...content.coverage,
      title: content.coverage.title === "Are we on your street yet?"
        ? defaultSiteContent.coverage.title : content.coverage.title,
      ...(content.coverage.body === "We operate in eight metros with a full contractor bench in each. Enter your ZIP to see availability and current onboarding time." ? {
        body: defaultSiteContent.coverage.body,
        coveredNote: defaultSiteContent.coverage.coveredNote,
        noneNote: defaultSiteContent.coverage.noneNote,
      } : {}),
      coveredAreas,
      waitlistAreas,
      displayAreas: (display.length
        ? display
        : coveredAreas.map((area) => area.name)
      ).slice(0, 10),
    },
    pricing: {
      ...content.pricing,
      title: content.pricing.title === "Priced like a service."
        ? defaultSiteContent.pricing.title : content.pricing.title,
      titleAccent: content.pricing.titleAccent === "Felt like a staff."
        ? defaultSiteContent.pricing.titleAccent : content.pricing.titleAccent,
      tiers: content.pricing.tiers.map((t) => ({
        ...t,
        features: t.features.map((feature) => feature === "Two supervised service visits / year"
          ? "Quarterly scheduled home visits" : feature),
        annualMonthly:
          typeof t.annualMonthly === "number" && t.annualMonthly > 0
            ? t.annualMonthly
            : Math.round((t.monthly * 10) / 12),
      })),
    },
  };
}

export async function fetchSiteContent(): Promise<SiteContent> {
  const { data, error } = await supabase
    .from("site_content")
    .select("content")
    .eq("key", SITE_CONTENT_KEY)
    .maybeSingle();
  if (error) return defaultSiteContent;
  return normalize(mergeContent(defaultSiteContent, data?.content ?? null));
}

export async function saveSiteContent(content: SiteContent) {
  const { error } = await supabase
    .from("site_content")
    .upsert(
      { key: SITE_CONTENT_KEY, content: content as unknown as Json },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
}

/**
 * Compresses to WebP (≤200KB), uploads to the media bucket, and returns a
 * long-lived signed URL that renders on any host, preview or production.
 */
export async function uploadSiteImage(file: File) {
  const optimized = await compressImage(file);
  const path = `home/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(SITE_MEDIA_BUCKET)
    .upload(path, optimized, { contentType: "image/webp", upsert: true });
  if (error) throw new Error(error.message);

  const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
  const { data, error: signError } = await supabase.storage
    .from(SITE_MEDIA_BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (signError || !data?.signedUrl) throw new Error(signError?.message ?? "Could not link image.");

  return { url: data.signedUrl, size: optimized.size };
}

/** Uploads a CMS-managed MP4/WebM video and returns a long-lived playable URL. */
export async function uploadSiteVideo(file: File) {
  const supportedTypes = ["video/mp4", "video/webm"];
  const maxBytes = 20 * 1024 * 1024;
  if (!supportedTypes.includes(file.type)) {
    throw new Error("Choose an MP4 or WebM video.");
  }
  if (file.size > maxBytes) {
    throw new Error("Video files must be 20MB or smaller.");
  }

  const extension = file.type === "video/webm" ? "webm" : "mp4";
  const path = `home/videos/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(SITE_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);

  const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
  const { data, error: signError } = await supabase.storage
    .from(SITE_MEDIA_BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (signError || !data?.signedUrl) throw new Error(signError?.message ?? "Could not link video.");

  return { url: data.signedUrl, size: file.size };
}
