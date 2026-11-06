export type FaqItemContent = { q: string; a: string };
export type FaqCategory = { title: string; items: FaqItemContent[] };
export type StandardsItem = { icon: string; title: string; body: string };

export const defaultFaqCategories: FaqCategory[] = [
  {
    title: "About Homesake",
    items: [
      {
        q: "What is Homesake?",
        a: "Homesake is a home management and preventive maintenance service designed to make homeownership easier. We provide regularly scheduled home visits, take care of routine maintenance items, document your home's condition, identify concerns, and help coordinate trusted professionals when specialized repairs are needed. Think of Homesake as an extra set of eyes and hands helping you stay on top of your home.",
      },
      {
        q: "Is Homesake a handyman service?",
        a: "Not exactly. While we handle certain minor maintenance tasks, Homesake provides ongoing management and preventive care for your home — not simply individual repair calls. We regularly visit your home, keep track of its needs, handle approved routine maintenance, document concerns, and help make sure important items don't fall through the cracks.",
      },
      {
        q: "Is Homesake a home inspection company?",
        a: "No. Homesake does not provide professional real-estate home inspections, code inspections, engineering inspections, structural inspections, or other licensed professional inspections. Our visits are routine, visual, non-invasive home checks designed to help identify observable maintenance concerns and keep up with preventive maintenance.",
      },
      {
        q: "Will Homesake find every problem in my home?",
        a: "No home-check service can guarantee every problem will be discovered. Some problems may be hidden, inaccessible, intermittent, or develop between visits. Homesake provides an additional layer of regular oversight and preventive care, but our visits do not replace professional inspections, specialized servicing, or appropriate homeowner's insurance.",
      },
    ],
  },
  {
    title: "Membership & what's included",
    items: [
      {
        q: "What is included with my Homesake membership?",
        a: "Your membership includes regularly scheduled home visits and routine preventive maintenance based on your membership plan. During a typical visit, your Homesake professional will check important areas of your home, document concerns, and take care of included everyday maintenance tasks. This may include changing standard HVAC filters, replacing smoke and CO detector batteries, replacing accessible standard light bulbs, lubricating squeaky hinges, tightening loose cabinet hardware, checking for visible leaks, checking your sump pump and water heater, and other approved routine upkeep. Standard replacement items included in your plan are provided at no additional cost, subject to reasonable limits.",
      },
      {
        q: "What isn't included with my membership?",
        a: "Homesake does not perform major repairs or work requiring a specialized or licensed professional. Electrical repairs, plumbing repairs, HVAC repairs, roofing, structural work, gas-line work, major appliance repair, mold or asbestos remediation, pest-control treatments, major construction, remodeling, and similar specialized services are not included. Specialty or unusually expensive replacement items may also have an additional cost. If we discover something outside our scope, we'll let you know and can help coordinate the appropriate professional at your request.",
      },
      {
        q: "Can Homesake replace something if I already purchased the item?",
        a: "For minor tasks that fall within Homesake's approved service scope, we may be able to install or replace a customer-provided item during a scheduled visit. Some items may require specialized installation and would need to be handled by an appropriate professional.",
      },
      {
        q: "What if a maintenance task takes longer than expected?",
        a: "Homesake memberships are intended for routine home management and minor preventive maintenance. If a task becomes more involved than expected or falls outside the scope of a normal visit, we'll explain the situation and discuss your options rather than performing additional work without authorization.",
      },
    ],
  },
  {
    title: "Visits & home records",
    items: [
      {
        q: "How long does a typical Homesake visit take?",
        a: "Visit times can vary depending on the size and condition of the home and the services being performed. A typical recurring visit provides time to complete your scheduled home check, handle included routine maintenance, take necessary photos, and document concerns.",
      },
      {
        q: "Do I need to be home during my visit?",
        a: "No. With your authorization, Homesake can use an approved access method such as a key, garage code, or smart lock. You'll receive documentation following your visit so you know what was checked, what was handled, and what may need attention.",
      },
      {
        q: "How will I know what was done during my visit?",
        a: "After your visit, you'll receive a record of the services performed and any concerns identified. Depending on your membership and available Homesake features, this may include photographs, completed maintenance items, recommendations, open issues, and your home's ongoing service history.",
      },
      {
        q: "What is the Homesake Home Passport?",
        a: "Your Home Passport is designed to become your home's ongoing maintenance and service history. It can keep maintenance records, equipment details, service dates, photographs, repairs, contractor work, recommendations, and other property information organized in one place.",
      },
      {
        q: "What is the Homesake Home Health Score?",
        a: "The Home Health Score is a simple way to understand the overall maintenance status of your home based on information documented through Homesake. It can highlight areas doing well, items to monitor, routine maintenance needs, and issues requiring attention. It is a home-management tool and is not a professional inspection, appraisal, safety certification, or guarantee of your home's condition.",
      },
      {
        q: "Can I request an additional visit?",
        a: "Yes. Members can request additional visits when needed, subject to scheduling availability and the pricing or benefits associated with their membership plan.",
      },
      {
        q: "Can I reschedule a visit?",
        a: "Yes. We understand schedules change. We ask that you provide at least 24 hours' notice whenever possible when canceling or rescheduling a scheduled visit.",
      },
    ],
  },
  {
    title: "Repairs & contractors",
    items: [
      {
        q: "What happens if you find a problem?",
        a: "We'll document the concern and let you know what we found. If it's something included within Homesake's routine maintenance scope, we may be able to take care of it during the visit. If the issue requires specialized or licensed service, Homesake can coordinate the repair at your request.",
      },
      {
        q: "Can Homesake arrange a plumber, electrician, HVAC company, or other contractor for me?",
        a: "Yes. At your request, Homesake can help coordinate trusted professionals for work outside our service scope. Depending on the situation, we may assist with contacting the provider, scheduling access, communicating the issue, documenting the work, and keeping the repair history organized. You'll be informed before work resulting in an additional charge is authorized.",
      },
      {
        q: "Can I use my own contractor?",
        a: "Absolutely. You're never required to use a contractor recommended by Homesake. If you already have a professional you trust, we can work with your preferred provider when appropriate.",
      },
      {
        q: "Will you authorize repairs without asking me?",
        a: "No. We will not authorize non-emergency third-party work at your expense without your approval. If we identify something that needs attention, we'll notify you and discuss the next step.",
      },
    ],
  },
  {
    title: "Homesake Away & family support",
    items: [
      {
        q: "Can Homesake check my house while I'm on vacation?",
        a: "Yes. Homesake Away is designed for homeowners who are traveling, seasonal residents, snowbirds, second-home owners, and anyone who wants an extra set of eyes on their property while they're gone. Depending on the service selected, we can visually check the interior and exterior, look for signs of water intrusion or other concerns, check important home systems, document the property's condition, and notify you if something needs attention.",
      },
      {
        q: "Can you bring packages inside while I'm away?",
        a: "When authorized and included with your service, Homesake may be able to bring delivered packages inside during a scheduled visit. Homesake is not a package-delivery or security service and cannot guarantee the condition or security of packages left before our arrival.",
      },
      {
        q: "What happens if you discover an emergency while I'm away?",
        a: "We'll make reasonable efforts to contact you using the information on your account. Depending on the circumstances and your authorization, we may also contact an appropriate emergency service or service provider. Homesake is not a 24/7 emergency-response or security-monitoring service.",
      },
      {
        q: "Can Homesake help care for my parents' home?",
        a: "Yes. Homesake can be particularly helpful for families assisting older parents or loved ones with homeownership. With proper authorization, family members can help arrange recurring visits, keep track of maintenance needs, review reports, and coordinate services without having to personally manage every small issue.",
      },
      {
        q: "Can I purchase Homesake for someone else?",
        a: "Yes. A Homesake membership can be a practical option for parents, grandparents, adult children, frequent travelers, or anyone who could use help staying on top of their home. The property owner or other authorized person will need to approve access and services.",
      },
      {
        q: "Do you work with second homes and seasonal residences?",
        a: "Yes. Recurring home checks and Homesake Away can be especially valuable for second homes and properties that aren't occupied year-round.",
      },
    ],
  },
  {
    title: "Safety & trust",
    items: [
      {
        q: "Are Homesake employees background checked?",
        a: "Trust is extremely important when someone is entering your home. Homesake's hiring and training standards are designed around professionalism, reliability, safety, and responsible access to customers' homes. Final screening and background-check practices will be reflected in Homesake's published service standards.",
      },
      {
        q: "Will I know who is coming to my house?",
        a: "Homesake is designed to provide clear information about your scheduled service and the professional assigned to your home. Customers can receive appointment information and identification details before arrival as those features become available.",
      },
      {
        q: "What if I have pets?",
        a: "Pets are welcome, but we ask that you tell us about them and provide any necessary instructions before your visit. Animals that may interfere with service or present a safety concern should be safely secured before we arrive.",
      },
      {
        q: "Does Homesake provide emergency repairs?",
        a: "No. Homesake is not an emergency repair or emergency-response company. If you have an active flood, fire, suspected gas leak, dangerous electrical problem, break-in, medical emergency, or other immediate threat, contact the appropriate emergency service first.",
      },
      {
        q: "Does Homesake replace my homeowners insurance?",
        a: "No. Homesake is not an insurance company and does not replace homeowners, flood, liability, or other property insurance. Homeowners remain responsible for maintaining appropriate insurance coverage.",
      },
      {
        q: "Does having Homesake guarantee that nothing will go wrong with my home?",
        a: "No. Homes naturally age, equipment can fail unexpectedly, and problems can develop between visits. Homesake's purpose is to help you stay ahead of routine maintenance, provide another set of eyes on your property, and make it easier to respond when something needs attention.",
      },
    ],
  },
  {
    title: "Billing, cancellation & getting started",
    items: [
      {
        q: "Can I cancel my Homesake membership?",
        a: "Yes. Homesake memberships can be canceled at any time. To prevent your next recurring membership charge and future scheduled membership service, cancellation should be submitted at least 24 hours before your next scheduled service visit, subject to the terms of your Membership Service Agreement.",
      },
      {
        q: "Do I have to sign a long-term contract?",
        a: "Homesake is intended to make homeownership easier — not lock customers into a service they no longer want. Your specific membership term, billing frequency, renewal terms, and cancellation options will be clearly displayed when you enroll.",
      },
      {
        q: "What types of homes can Homesake service?",
        a: "Homesake is designed primarily for residential properties. Service availability may depend on property type, size, location, accessibility, condition, and the services requested.",
      },
      {
        q: "How do I know if Homesake is available in my area?",
        a: "Enter your ZIP code on our website to check current service availability. New service areas may be added gradually as Homesake grows.",
      },
      {
        q: "How do I get started?",
        a: "Simply check availability for your ZIP code, tell us a little about your home, choose the membership option that's right for you, and schedule your first visit. From there, Homesake starts building a better understanding of your home and helping you stay ahead of its ongoing needs.",
      },
    ],
  },
];

export const defaultStandardsProcess: StandardsItem[] = [
  {
    icon: "ClipboardCheck",
    title: "Check.",
    body: "We follow a structured process to look over the important areas included in your Homesake visit. We don't simply walk through your house and rely on memory. Our process helps create consistency from one visit to the next.",
  },
  {
    icon: "Wrench",
    title: "Care.",
    body: "When we encounter routine maintenance that's included with your membership, we take care of it while we're there whenever reasonably possible — HVAC filters, detector batteries, light bulbs, loose hardware, and other everyday upkeep.",
  },
  {
    icon: "ScrollText",
    title: "Document.",
    body: "You shouldn't have to wonder what happened during your visit. Homesake documents completed tasks, observations, concerns, and applicable photographs so you have a clear record of your home's ongoing care.",
  },
  {
    icon: "HeartHandshake",
    title: "Coordinate.",
    body: "Some things require the right professional. When we identify an issue outside Homesake's scope, we'll let you know — and at your request we can help coordinate the appropriate specialized or licensed professional.",
  },
];

export const defaultStandardsPillars: StandardsItem[] = [
  {
    icon: "UserCheck",
    title: "Carefully selected professionals",
    body: "Homesake team members are selected for their ability to care for a home and for their professionalism, reliability, communication, judgment, and respect for others. Our goal is simple: hire good people, train them well, and hold them to a high standard.",
  },
  {
    icon: "BadgeCheck",
    title: "Background checked",
    body: "Homesake Home Specialists undergo a background-screening process before being approved to independently enter a member's home. Our screening and hiring standards are designed around trust, professionalism, and responsibility.",
  },
  {
    icon: "GraduationCap",
    title: "Homesake trained",
    body: "Training covers residential systems and routine preventive maintenance, visible signs of leaks and deterioration, HVAC filters, smoke and CO detectors, sump pumps and water heaters, exterior observations, safe work practices, documentation and photography, privacy and property access — and knowing when to stop and call a specialized professional.",
  },
  {
    icon: "Sparkles",
    title: "Professionalism in your home",
    body: "Your house isn't a jobsite to us. We treat your property, belongings, family members, and pets with respect — working carefully, keeping work areas clean, following property instructions, and leaving your home the way we found it or better.",
  },
  {
    icon: "Eye",
    title: "You'll know who is coming",
    body: "Before applicable visits, Homesake can provide information identifying the professional assigned to your appointment. Our personnel arrive professionally presented and clearly identifiable as representing Homesake.",
  },
  {
    icon: "CameraOff",
    title: "Respect for your privacy",
    body: "Photographs are taken only when reasonably necessary for service documentation, maintenance records, or to show you something that needs attention. Your home is not content — we will not use identifiable interior photographs for public marketing without your permission.",
  },
  {
    icon: "KeyRound",
    title: "Secure property access",
    body: "Keys, garage codes, and smart-lock access are used only for authorized Homesake services and handled according to Homesake's security procedures. Our team members are never permitted to share your property-access information with unauthorized individuals.",
  },
  {
    icon: "ShieldCheck",
    title: "We stay within our scope",
    body: "Homesake handles routine preventive maintenance and home-management services within a defined scope. When an electrical, plumbing, HVAC, roofing, structural, gas, or environmental issue requires professional attention, we'll tell you — and can coordinate the repair at your request.",
  },
  {
    icon: "Repeat",
    title: "Consistency matters",
    body: "Your experience shouldn't depend on which team member arrives at your door. Standardized procedures, training, documentation, and service expectations create a consistent experience from home to home and visit to visit. One company. One process. One standard of care.",
  },
  {
    icon: "CalendarCheck",
    title: "Accountability after every visit",
    body: "Your visit record creates accountability for what was checked, completed, observed, and what may still need attention. Through your Homesake Home Passport, maintenance, repairs, photographs, equipment information, and contractor work stay organized instead of scattered across emails and receipts.",
  },
];
