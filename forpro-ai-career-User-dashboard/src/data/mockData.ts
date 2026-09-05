import { UserProfile, CareerMilestone, CVDocument, ActivityItem, DonutSegment } from '../types';

export const activeUser: UserProfile = {
  id: 'usr-1',
  name: 'Marius Akolly',
  title: 'Senior Software Engineer',
  email: 'akollymarius@gmail.com',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  plan: 'Free Plan',
  profileStrength: 65,
  totalYearsExp: 4.5,
  isEmptyState: false,
};

export const emptyUser: UserProfile = {
  id: 'usr-empty',
  name: 'Marius Akolly',
  title: 'Nouveau Membre',
  email: 'akollymarius@gmail.com',
  plan: 'Free Plan',
  profileStrength: 0,
  totalYearsExp: 0,
  isEmptyState: true,
};

export const activeMilestones: CareerMilestone[] = [
  {
    id: 'm1',
    year: '2017',
    yearRange: '2016 - 2017',
    role: 'Junior Developer',
    company: 'Upwork Global',
    companyLogo: 'up',
    description: 'Started my journey in software development, delivering responsive websites and algorithmic components.',
    keyMissions: [
      'Developed responsive single-page web applications with React and JavaScript',
      'Integrated RESTful APIs and payment gateways with high reliability',
      'Earned Top Rated badge with 100% client satisfaction score',
    ],
    technologies: ['JavaScript', 'HTML/CSS', 'React', 'Git', 'REST APIs'],
    domain: 'frontend',
  },
  {
    id: 'm2',
    year: '2019',
    yearRange: '2017 - 2019',
    role: 'Software Developer',
    company: 'DevLab Studio',
    companyLogo: 'cube',
    description: 'Gained expertise in building scalable applications, backend microservices, and database optimizations.',
    keyMissions: [
      'Engineered scalable microservices processing over 1M requests daily',
      'Implemented robust data pipelines and optimized SQL indexing',
      'Introduced containerized Docker-based development workflows',
    ],
    technologies: ['Node.js', 'Python', 'PostgreSQL', 'Docker', 'Redis'],
    domain: 'backend',
  },
  {
    id: 'm3',
    year: '2021',
    yearRange: '2019 - 2021',
    role: 'Senior Developer',
    company: 'TogoTech Solutions',
    companyLogo: 'cube',
    description: 'Led projects and mentored junior developers across distributed systems and cloud infrastructure.',
    keyMissions: [
      'Architected high-throughput microservices processing over 3M requests daily',
      'Mentored 6 junior engineers and instituted clean code standards',
      'Spearheaded automated CI/CD deployment pipelines cutting release time by 60%',
    ],
    technologies: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker', 'Kafka'],
    domain: 'backend',
  },
  {
    id: 'm4',
    year: '2023',
    yearRange: '2021 - 2023',
    role: 'Tech Lead',
    company: 'GVA Group',
    companyLogo: 'gva',
    description: 'Leading engineering team and delivering high-impact solutions across multi-region telecom backbones.',
    keyMissions: [
      'Managed cloud infrastructure with Terraform and Kubernetes across multi-datacenter nodes',
      'Automated deployment pipelines cutting release cycle from 3 days to 25 minutes',
      'Monitored telecommunication network health with Prometheus and Grafana',
    ],
    technologies: ['Go', 'Kubernetes', 'Terraform', 'Prometheus', 'Linux'],
    domain: 'devops',
  },
  {
    id: 'm5',
    year: '2024',
    yearRange: '2023 - Now',
    role: 'Engineering Manager',
    company: 'Moov Africa',
    companyLogo: 'moov',
    description: 'Managing teams, strategic planning and growing talent across mission-critical fintech telecom bridges.',
    keyMissions: [
      'Spearheaded mobile money transaction bridge supporting 15M+ subscribers',
      'Architected event-driven asynchronous microservices with Apache Kafka',
      'Supervised 15 engineers, conducting performance reviews and technical roadmap planning',
    ],
    technologies: ['Java', 'Kafka', 'AWS', 'Microservices', 'Leadership'],
    domain: 'architecture',
    isCurrent: true,
  },
  {
    id: 'm6',
    year: 'Goal',
    yearRange: 'Next Goal',
    role: 'Lead Architect',
    company: 'Visionary Peak',
    description: 'Driving architecture vision and technical excellence across enterprise distributed systems.',
    keyMissions: [
      'Design globally distributed zero-trust cloud architectures',
      'Standardize engineering principles across multi-disciplinary product squads',
      'Drive tech roadmap alignment with C-suite executive goals',
    ],
    technologies: ['System Design', 'Cloud Architecture', 'Kafka', 'Kubernetes', 'Leadership'],
    domain: 'architecture',
    isGoal: true,
  },
];

export const activeDonutSegments: DonutSegment[] = [
  { label: 'Backend Development', percentage: 45, years: 3.6, color: '#FF7A00' },
  { label: 'System Architecture', percentage: 30, years: 2.4, color: '#0F172A' },
  { label: 'DevOps & Cloud', percentage: 15, years: 1.2, color: '#F59E0B' },
  { label: 'Leadership', percentage: 10, years: 0.8, color: '#94A3B8' },
];

export const activeCVs: CVDocument[] = [
  {
    id: 'cv-1',
    name: 'Marius_Akolly_CV.pdf',
    lastUpdated: 'Today',
    score: 65,
    size: '1.8 MB',
    isPrimary: true,
  },
  {
    id: 'cv-2',
    name: 'Senior_Backend_Dev.pdf',
    lastUpdated: 'Aug 20',
    score: 58,
    size: '1.2 MB',
    isPrimary: false,
  },
  {
    id: 'cv-3',
    name: 'Architecture_Lead_v2.pdf',
    lastUpdated: 'Jul 15',
    score: 48,
    size: '2.1 MB',
    isPrimary: false,
  },
];

export const activeActivities: ActivityItem[] = [
  {
    id: 'act-1',
    title: 'CV Updated',
    desc: 'Marius_Akolly_CV.pdf (ATS score 65%)',
    time: '2 hours ago',
    type: 'cv',
  },
  {
    id: 'act-2',
    title: 'Milestone Completed',
    desc: 'Senior Software Engineer at Moov Africa',
    time: '3 days ago',
    type: 'milestone',
  },
  {
    id: 'act-3',
    title: 'New Skill Added',
    desc: 'TypeScript & Cloud Architecture',
    time: '1 week ago',
    type: 'skill',
  },
];
