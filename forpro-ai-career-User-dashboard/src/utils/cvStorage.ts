import { CVDocument, CVAnalysisResult } from '../types';

const STORAGE_KEY = 'forpro_cv_database_v1';

export const defaultSeedCVs: CVDocument[] = [
  {
    id: 'cv-1',
    name: 'Marius_Akolly_CV.pdf',
    lastUpdated: 'Today',
    score: 88,
    size: '1.8 MB',
    isPrimary: true,
    roleTarget: 'Lead Architect',
    version: 'v3.2 - Master',
    fileType: 'application/pdf',
    parsedContent: {
      fullName: 'Marius Akolly',
      title: 'Senior Software Engineer & Systems Architect',
      email: 'akollymarius@gmail.com',
      phone: '+228 90 12 34 56',
      location: 'Lomé, Togo (Open to Remote / Relocation)',
      summary:
        'Senior Software Engineer with 8+ years of expertise designing high-throughput event-driven microservices, fintech payment bridges, and cloud-native infrastructure. Proven track record leading distributed engineering squads and optimizing high-concurrency systems at Moov Africa and GVA Group.',
      experiences: [
        {
          role: 'Senior Software Engineer / Engineering Manager',
          company: 'Moov Africa',
          period: '2023 - Present',
          highlights: [
            'Spearheaded the core mobile money gateway bridge processing over 15M+ daily transaction requests with 99.99% availability.',
            'Architected distributed event streaming using Apache Kafka and Spring Boot microservices, cutting inter-service latency by 42%.',
            'Led an engineering department of 15 developers, establishing strict CI/CD, trunk-based development, and code review governance.',
          ],
        },
        {
          role: 'Tech Lead & Cloud Systems Engineer',
          company: 'GVA Group',
          period: '2021 - 2023',
          highlights: [
            'Automated multi-region telecom infrastructure provisioning using Terraform and Kubernetes (EKS), reducing deployment cycle from 3 days to 25 minutes.',
            'Engineered centralized observability pipelines with Prometheus, Grafana, and OpenTelemetry, decreasing MTTR by 55%.',
          ],
        },
        {
          role: 'Senior Backend Developer',
          company: 'TogoTech Solutions',
          period: '2019 - 2021',
          highlights: [
            'Engineered scalable REST & gRPC backend services in Java and Python, serving 3M+ active mobile consumers.',
            'Optimized PostgreSQL query plans and connection pooling, boosting query execution performance by 45%.',
          ],
        },
      ],
      skills: [
        'Java',
        'Spring Boot',
        'Apache Kafka',
        'Kubernetes',
        'AWS Cloud',
        'Docker',
        'PostgreSQL',
        'Distributed Systems',
        'Microservices',
        'Terraform',
        'System Design',
        'Fintech API Bridges',
      ],
      education: [
        {
          degree: 'Master of Science in Distributed Systems & Computer Engineering',
          school: 'University of Science & Technology',
          year: '2018',
        },
        {
          degree: 'Bachelor of Science in Software Engineering',
          school: 'Polytechnic Institute',
          year: '2016',
        },
      ],
      certifications: [
        'AWS Certified Solutions Architect - Associate',
        'Certified Kubernetes Administrator (CKA)',
        'TOGAF Standard (In Progress)',
      ],
    },
    analysis: {
      atsScore: 88,
      grammarScore: 94,
      keywordsMatchScore: 86,
      impactScore: 92,
      summary:
        'Profil de calibre senior extrêmement compétitif pour un rôle de Lead Architect. Excellente quantification des réalisations (15M+ abonnés, 42% de réduction de latence).',
      strengths: [
        'Forte présence de métriques concrètes et de chiffres d’impact commercial et technique',
        'Architecture événementielle moderne démontrée en production (Kafka, Spring Boot, K8s)',
        'Progression logique et cohérente de Développeur à Tech Lead / Engineering Manager',
      ],
      improvements: [
        'Intégrer les mots-clés de gouvernance d’entreprise (TOGAF, Zero Trust Security)',
        'Mettre davantage en valeur l’alignement budgétaire et la stratégie Cloud ROI',
      ],
      matchedKeywords: [
        'Distributed Systems',
        'Microservices Architecture',
        'Apache Kafka',
        'Kubernetes',
        'AWS',
        'Spring Boot',
        'PostgreSQL',
        'High Concurrency',
        'Team Mentoring',
      ],
      missingKeywords: [
        'TOGAF 9.2 Enterprise Architecture',
        'Zero Trust Security Blueprint',
        'FinOps Cloud Cost Optimization',
        'Multi-Cloud Disaster Recovery',
      ],
      recommendedJobTitles: [
        'Lead Architect',
        'Principal Software Engineer',
        'Head of Backend Engineering',
        'Cloud Solutions Architect',
      ],
    },
  },
  {
    id: 'cv-2',
    name: 'Senior_Backend_Dev.pdf',
    lastUpdated: 'Aug 20, 2026',
    score: 78,
    size: '1.2 MB',
    isPrimary: false,
    roleTarget: 'Staff Backend Engineer',
    version: 'v2.1',
    fileType: 'application/pdf',
    parsedContent: {
      fullName: 'Marius Akolly',
      title: 'Senior Backend Engineer',
      email: 'akollymarius@gmail.com',
      phone: '+228 90 12 34 56',
      location: 'Lomé, Togo',
      summary:
        'Backend Engineer specialized in high-performance API design, relational and NoSQL databases, and asynchronous job processing.',
      experiences: [
        {
          role: 'Backend Engineer',
          company: 'DevLab Studio',
          period: '2017 - 2019',
          highlights: [
            'Built high-performance REST APIs using Node.js and Python.',
            'Managed Redis caching layer for sub-5ms session lookups.',
          ],
        },
      ],
      skills: ['Python', 'Django', 'PostgreSQL', 'Redis', 'Docker', 'REST APIs', 'Node.js'],
      education: [
        {
          degree: 'Bachelor of Science in Software Engineering',
          school: 'Polytechnic Institute',
          year: '2016',
        },
      ],
    },
    analysis: {
      atsScore: 78,
      grammarScore: 90,
      keywordsMatchScore: 74,
      impactScore: 80,
      summary:
        'Très bon CV technique axé sur le développement d’APIs backend, mais manque de focus sur la dimension stratégique et l’architecture globale.',
      strengths: ['Solide base algorithmique et bases de données relationnelles', 'Stack moderne et standard'],
      improvements: [
        'Ajouter des métriques de mise à l’échelle et de volumétrie utilisateur',
        'Démontrer la gestion de la haute disponibilité',
      ],
      matchedKeywords: ['Python', 'PostgreSQL', 'REST APIs', 'Docker', 'Redis'],
      missingKeywords: ['Event-driven Architecture', 'Kubernetes', 'Cloud Infrastructure', 'CI/CD Pipelines'],
      recommendedJobTitles: ['Senior Backend Engineer', 'API Platform Engineer', 'Backend Tech Lead'],
    },
  },
  {
    id: 'cv-3',
    name: 'Architecture_Lead_v2.pdf',
    lastUpdated: 'Jul 15, 2026',
    score: 82,
    size: '2.1 MB',
    isPrimary: false,
    roleTarget: 'Enterprise Architect',
    version: 'v1.4',
    fileType: 'application/pdf',
    parsedContent: {
      fullName: 'Marius Akolly',
      title: 'Cloud & Solutions Architect',
      email: 'akollymarius@gmail.com',
      phone: '+228 90 12 34 56',
      location: 'Lomé, Togo',
      summary:
        'Cloud Architect focused on enterprise cloud migration, microservices decomposition, and security compliance.',
      experiences: [
        {
          role: 'Cloud Architect',
          company: 'CloudVentures Advisory',
          period: '2022 - 2024',
          highlights: [
            'Designed multi-tenant Kubernetes clusters on AWS with automated Terraform gitops.',
            'Audited banking bridge compliance with ISO-27001 standards.',
          ],
        },
      ],
      skills: ['AWS', 'Kubernetes', 'Terraform', 'Kafka', 'TOGAF', 'Zero Trust', 'Microservices'],
      education: [
        {
          degree: 'Master of Science in Distributed Systems',
          school: 'University of Science & Technology',
          year: '2018',
        },
      ],
    },
    analysis: {
      atsScore: 82,
      grammarScore: 92,
      keywordsMatchScore: 84,
      impactScore: 85,
      summary: 'CV orienté infrastructure et conformité bancaire de bon niveau.',
      strengths: ['Bonne mise en avant de Terraform et Kubernetes', 'Connaissances sécurité et conformité ISO'],
      improvements: ['Préciser les volumes de transaction et la rentabilité financière'],
      matchedKeywords: ['AWS', 'Kubernetes', 'Terraform', 'Microservices', 'Zero Trust'],
      missingKeywords: ['Executive Presentation', 'Cost Reduction Metrics', 'FinOps'],
      recommendedJobTitles: ['Cloud Solutions Architect', 'Infrastructure Lead', 'Enterprise Architect'],
    },
  },
];

export function getStoredCVs(): CVDocument[] {
  try {
    if (typeof window === 'undefined') return defaultSeedCVs;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSeedCVs));
      return defaultSeedCVs;
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return defaultSeedCVs;
  } catch (err) {
    console.warn('Failed to load stored CVs, falling back to seed:', err);
    return defaultSeedCVs;
  }
}

export function saveStoredCVs(cvs: CVDocument[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cvs));
    }
  } catch (err) {
    console.error('Failed to save CVs to storage:', err);
  }
}

export function setPrimaryCV(cvId: string, currentCVs: CVDocument[]): CVDocument[] {
  const updated = currentCVs.map((cv) => ({
    ...cv,
    isPrimary: cv.id === cvId,
  }));
  saveStoredCVs(updated);
  return updated;
}

export function deleteCV(cvId: string, currentCVs: CVDocument[]): CVDocument[] {
  let updated = currentCVs.filter((cv) => cv.id !== cvId);
  // If the deleted one was primary and there are remaining CVs, set the first as primary
  if (updated.length > 0 && !updated.some((c) => c.isPrimary)) {
    updated[0].isPrimary = true;
  }
  saveStoredCVs(updated);
  return updated;
}

export function addUploadedCV(
  file: File,
  currentCVs: CVDocument[],
  fileBase64?: string
): { updatedList: CVDocument[]; newCV: CVDocument } {
  const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
  const score = Math.floor(Math.random() * 18) + 76; // e.g. 76 - 94%

  const newCV: CVDocument = {
    id: `cv-${Date.now()}`,
    name: file.name,
    lastUpdated: 'Just now',
    score: score,
    size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` || '1.4 MB',
    isPrimary: currentCVs.length === 0, // First CV uploaded becomes primary
    roleTarget: fileNameWithoutExt.includes('Lead')
      ? 'Lead Architect'
      : fileNameWithoutExt.includes('Backend')
      ? 'Senior Backend Engineer'
      : 'Fullstack / Systems Engineer',
    version: 'v1.0 - New',
    fileType: file.type || 'application/pdf',
    fileData: fileBase64,
    parsedContent: {
      fullName: 'Marius Akolly',
      title: 'Senior Software Engineer & Systems Architect',
      email: 'akollymarius@gmail.com',
      phone: '+228 90 12 34 56',
      location: 'Lomé, Togo (Open to Remote / Relocation)',
      summary:
        'Uploaded CV document processed by ForPro AI Parser. Strong background in scalable backend architectures, high-performance API engineering, and distributed systems.',
      experiences: [
        {
          role: 'Senior Software Engineer',
          company: 'Moov Africa',
          period: '2023 - Present',
          highlights: [
            'Architected mobile money gateway supporting high-concurrency transaction traffic.',
            'Implemented event streaming microservices with Apache Kafka and Spring Boot.',
          ],
        },
        {
          role: 'Tech Lead',
          company: 'GVA Group',
          period: '2021 - 2023',
          highlights: [
            'Automated infrastructure deployments using Docker and Kubernetes.',
            'Maintained multi-datacenter connectivity backbones.',
          ],
        },
      ],
      skills: ['Java', 'Kafka', 'Kubernetes', 'AWS', 'Docker', 'PostgreSQL', 'Microservices', 'System Design'],
      education: [
        {
          degree: 'Master of Science in Computer Science & Distributed Systems',
          school: 'University of Science & Technology',
          year: '2018',
        },
      ],
      certifications: ['AWS Certified Solutions Architect', 'CKA (Kubernetes Administrator)'],
    },
    analysis: {
      atsScore: score,
      grammarScore: 92,
      keywordsMatchScore: Math.floor(score * 0.95),
      impactScore: Math.floor(score * 0.98),
      summary: `Analyse automatique effectuée pour ${file.name}. Excellent potentiel de matching pour les postes d'ingénierie senior et d'architecture.`,
      strengths: [
        'Clarté de la structure et lisibilité ATS standard',
        'Présence de compétences clés fortement recherchées',
      ],
      improvements: [
        'Ajouter davantage de verbes d’action dans les puces de description',
        'Aligner les mots-clés sur la fiche de poste ciblée',
      ],
      matchedKeywords: ['Java', 'Kafka', 'Kubernetes', 'AWS', 'Microservices', 'PostgreSQL'],
      missingKeywords: ['TOGAF Framework', 'Multi-Cloud Strategy', 'FinOps Cost Modeling'],
      recommendedJobTitles: ['Lead Architect', 'Senior Staff Engineer', 'Cloud Solutions Architect'],
    },
  };

  const updatedList = [newCV, ...currentCVs];
  saveStoredCVs(updatedList);
  return { updatedList, newCV };
}
