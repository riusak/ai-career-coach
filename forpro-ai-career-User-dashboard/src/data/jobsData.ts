import { JobListing } from '../types';

export const initialJobListings: JobListing[] = [
  {
    id: 'job-1',
    title: 'Staff Cloud & Distributed Systems Architect',
    company: 'Wave Mobile Money',
    companyLogo: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=100&auto=format&fit=crop&q=80',
    location: 'Dakar / Remote (Africa & Europe)',
    workplaceType: 'remote',
    contractType: 'cdi',
    department: 'architecture',
    salary: '€110k - €135k',
    matchScore: 96,
    matchedSkills: ['Java', 'Kafka', 'Kubernetes', 'AWS', 'PostgreSQL', 'High Concurrency'],
    missingSkills: ['FinOps', 'Terraform Cloud'],
    experienceLevel: 'Staff',
    postedDate: '2d ago',
    description: 'Lead the architectural evolution of our multi-country payment core processing billions in financial volume. Design zero-downtime event-driven microservices spanning West and Central Africa.',
    responsibilities: [
      'Architect resilient event streaming pipelines with Apache Kafka processing >20,000 TPS.',
      'Ensure sub-50ms latency for cross-border ledger synchronization across intermittent connectivity environments.',
      'Mentor senior engineering leads and establish infrastructure-as-code standards on AWS EKS.',
      'Represent architecture governance in executive technical reviews and regulatory compliance audits.'
    ],
    requirements: [
      '8+ years in backend systems and distributed systems architecture.',
      'Demonstrated expertise with Kafka, distributed transactions (Saga), and distributed caching.',
      'Proven leadership in fintech, telecom mobile money, or high-throughput transaction engines.',
      'Fluency in French and English.'
    ],
    benefits: [
      '100% remote-first policy with generous home office stipend',
      'Stock option equity package (Series B+)',
      'Comprehensive family healthcare coverage',
      'Annual learning budget of €3,500'
    ],
    isSaved: true,
    isApplied: false,
  },
  {
    id: 'job-2',
    title: 'Lead Architect - Core Banking & Payment Systems',
    company: 'Ecobank Transnational',
    companyLogo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&auto=format&fit=crop&q=80',
    location: 'Lomé, Togo (Hybrid)',
    workplaceType: 'hybrid',
    contractType: 'cdi',
    department: 'architecture',
    salary: 'FCFA 48M - 65M',
    matchScore: 93,
    matchedSkills: ['Java', 'Spring Boot', 'Kafka', 'System Design', 'PostgreSQL', 'Telecom'],
    missingSkills: ['ISO 20022', 'TOGAF'],
    experienceLevel: 'Lead',
    postedDate: '3d ago',
    description: 'Define and champion the technological blueprint for pan-African banking services serving 33 African nations from our Lomé headquarters.',
    responsibilities: [
      'Modernize legacy monoliths into modular domain-driven microservices.',
      'Lead a 25-person engineering tribe across backend, platform, and security.',
      'Collaborate directly with the Group CTO to drive the 2026-2030 digital transformation roadmap.',
      'Spearhead API open banking gateway integrations with global financial institutions.'
    ],
    requirements: [
      '7+ years architecting mission-critical financial or telecom payment gateways.',
      'Deep mastery of Java/Spring, event sourcing, Docker/Kubernetes containerization.',
      'Strong ability to communicate complex trade-offs to business stakeholders.'
    ],
    benefits: [
      'Executive performance bonus (up to 30%)',
      'Relocation assistance & company vehicle allowance',
      'Premium international health insurance',
      'Access to international banking leadership symposiums'
    ],
    isSaved: false,
    isApplied: true,
    appliedDate: 'Yesterday',
  },
  {
    id: 'job-3',
    title: 'Senior Principal Backend Engineer (Kafka & Go)',
    company: 'Alan Health',
    companyLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=100&auto=format&fit=crop&q=80',
    location: 'Paris / Full Remote (UTC-2 to UTC+3)',
    workplaceType: 'remote',
    contractType: 'cdi',
    department: 'backend',
    salary: '€95k - €120k',
    matchScore: 91,
    matchedSkills: ['Kafka', 'Distributed Systems', 'Kubernetes', 'AWS', 'Docker'],
    missingSkills: ['Go (Golang)', 'GraphQL'],
    experienceLevel: 'Senior',
    postedDate: '5d ago',
    description: 'Design robust asynchronous processing systems for millions of European health members with strict zero-trust data privacy standards.',
    responsibilities: [
      'Design reliable asynchronous processing and claim verification engines.',
      'Eliminate concurrency bottlenecks in distributed datastores.',
      'Maintain 99.999% availability for real-time mobile API consumers.'
    ],
    requirements: [
      'Solid foundations in concurrency models, distributed storage, and cache eviction.',
      'Comfort with autonomous distributed teams and asynchronous written culture.'
    ],
    benefits: [
      'Equity package (BSPCE)',
      'Flexible working hours & 6 weeks annual leave',
      'Full top-tier health coverage for employee and dependents'
    ],
    isSaved: true,
    isApplied: false,
  },
  {
    id: 'job-4',
    title: 'Engineering Manager - Platform & Infrastructure',
    company: 'Paystack (Stripe Africa)',
    companyLogo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80',
    location: 'Lagos / Accra / Remote',
    workplaceType: 'remote',
    contractType: 'cdi',
    department: 'leadership',
    salary: '$125k - $160k',
    matchScore: 88,
    matchedSkills: ['Leadership', 'Kubernetes', 'AWS', 'Microservices', 'PostgreSQL'],
    missingSkills: ['Multi-cloud FinOps', 'Terraform Enterprise'],
    experienceLevel: 'Lead',
    postedDate: '1w ago',
    description: 'Oversee 3 autonomous infrastructure squads responsible for high availability, site reliability, and cloud network security across Sub-Saharan Africa.',
    responsibilities: [
      'Foster high engineering velocity while keeping incident rate near zero.',
      'Conduct regular 1:1s, performance roadmaps, and senior engineering recruitment.',
      'Budget cloud resources across multi-region AWS and hybrid private cloud.'
    ],
    requirements: [
      'Previous experience managing at least 8-12 engineers in a high-growth tech environment.',
      'Strong technical grounding in cloud architecture to challenge design proposals.'
    ],
    benefits: [
      'Competitive USD salary benchmarked to tier-1 standards',
      'Stripe global equity stock units',
      'Parental leave 16 weeks fully paid'
    ],
    isSaved: false,
    isApplied: false,
  },
  {
    id: 'job-5',
    title: 'Lead Systems Architect - Telecom Infrastructure',
    company: 'Orange Middle East & Africa',
    companyLogo: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=100&auto=format&fit=crop&q=80',
    location: 'Abidjan / Casablanca (Hybrid)',
    workplaceType: 'hybrid',
    contractType: 'cdi',
    department: 'architecture',
    salary: '€85k - €105k',
    matchScore: 87,
    matchedSkills: ['Kafka', 'Microservices', 'Telecom', 'Java', 'Docker'],
    missingSkills: ['5G Core Architecture', 'OpenRAN'],
    experienceLevel: 'Lead',
    postedDate: '1w ago',
    description: 'Drive the network virtualization and microservices core for telecom VAS services, USSD payment integrations, and digital mobile apps across 18 countries.',
    responsibilities: [
      'Transition legacy VAS architecture to cloud-native containerized platforms.',
      'Optimize latency for 40M daily USSD & mobile money sessions.',
      'Standardize CI/CD pipelines across regional operating companies.'
    ],
    requirements: [
      'Deep telecom or fintech experience with high transaction rates.',
      'Mastery of event-driven architectures and network protocols.'
    ],
    benefits: [
      'Generous pension plan and executive profit sharing',
      'International mobility programs',
      'Continuous executive certification sponsorship'
    ],
    isSaved: false,
    isApplied: false,
  },
  {
    id: 'job-6',
    title: 'Staff Reliability & Cloud Systems Engineer',
    company: 'Datadog EMEA',
    companyLogo: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=100&auto=format&fit=crop&q=80',
    location: 'Remote (EMEA timezones)',
    workplaceType: 'remote',
    contractType: 'cdi',
    department: 'devops',
    salary: '€105k - €130k',
    matchScore: 84,
    matchedSkills: ['Kubernetes', 'Linux', 'AWS', 'Distributed Systems'],
    missingSkills: ['eBPF', 'Rust', 'Chaos Engineering'],
    experienceLevel: 'Staff',
    postedDate: '2w ago',
    description: 'Build hyper-scale telemetry ingest systems handling trillion metrics per day. Ensure extreme durability and sub-second querying across petabyte-scale clusters.',
    responsibilities: [
      'Harden multi-tenant Kubernetes clusters against cascading failures.',
      'Conduct deep-dive postmortems and build automated self-healing controllers.'
    ],
    requirements: [
      'Extensive experience diagnosing complex Linux kernel and network issues.',
      'Fluency with distributed tracing and large-scale data stores.'
    ],
    benefits: [
      'Competitive equity grant',
      'Unlimited PTO policy',
      'Wellness and mental health support programs'
    ],
    isSaved: false,
    isApplied: false,
  }
];
