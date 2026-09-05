import { MockInterviewSession } from '../types';

export interface InterviewTrackDefinition {
  id: string;
  title: string;
  category: string;
  duration: string;
  difficulty: string;
  description: string;
  iconType: 'architecture' | 'microservices' | 'leadership' | 'star' | 'algorithms';
  questionsCount: number;
  questions: {
    id: string;
    prompt: string;
    context: string;
    keyCheckpoints: string[];
    sampleHighAnswer: string;
  }[];
}

export const interviewTracks: InterviewTrackDefinition[] = [
  {
    id: 'system-design',
    title: 'Architecture & Conception Système (High-Scale)',
    category: 'Architecture',
    duration: '45 mins',
    difficulty: 'Senior / Lead',
    iconType: 'architecture',
    questionsCount: 3,
    description: 'Concevez une plateforme distribuée hautement disponible capable d’absorber des pics de 15M requêtes/jour avec tolérance aux pannes réseau.',
    questions: [
      {
        id: 'sd-q1',
        prompt: 'Concevez un moteur d’idempotence et de déduplication distribué pour une passerelle de paiement mobile money traitant 15 000 transactions/sec.',
        context: 'Le système doit garantir un paiement unique même en cas de re-tentatives violentes de l’opérateur télécom lors de coupures réseau.',
        keyCheckpoints: [
          'Clé d’idempotence unique (UUIDv7 + transaction hash)',
          'Verrou distribué Redis avec TTL strict et libération atomique (Lua)',
          'État persistant en base relationnelle avec verrouillage optimiste / row-level lock',
          'Gestion des timeouts asynchrones et pattern Outbox'
        ],
        sampleHighAnswer: 'Pour garantir l’idempotence à 15k TPS, j’implémente une architecture à deux niveaux : un sas de déduplication en mémoire vive via Redis Cluster avec un script Lua effectuant SETNX avec TTL de 120 secondes sur le hash de la transaction...'
      },
      {
        id: 'sd-q2',
        prompt: 'Comment concevriez-vous un partitionnement Kafka et une stratégie de tolérance aux pannes pour assurer un ordre strict des événements financiers ?',
        context: 'Les soldes des comptes doivent être recalculés dans l’ordre exact sans bloquer les autres comptes indépendants.',
        keyCheckpoints: [
          'Partition Key basée sur l’Account ID',
          'Producer idempotence activée (enable.idempotence=true, acks=all)',
          'Dead Letter Queue (DLQ) pour les événements malformés',
          'Mécanisme de rebalance coopératif sans interruption globale'
        ],
        sampleHighAnswer: 'L’ordre strict n’est requis qu’au niveau du compte individuel. En configurant la clé de partitionnement sur le wallet_id et en activant le mode acks=all avec min.insync.replicas=2, nous garantissons la sérialité...'
      },
      {
        id: 'sd-q3',
        prompt: 'Expliquez comment vous structurez une stratégie de Disaster Recovery Multi-Région avec un RPO < 1 seconde et RTO < 30 secondes.',
        context: 'Un data-center principal subit une panne de câble sous-marin critique.',
        keyCheckpoints: [
          'Réplication asynchrone semi-synchrone des bases de données',
          'DNS Failover automatique avec health checks stricts (Route53/Cloudflare)',
          'Gestion du split-brain avec quorum de consensus',
          'Stratégie de synchronisation des caches et jetons d’authentification'
        ],
        sampleHighAnswer: 'Pour un RTO < 30s et RPO quasi-nul, nous déployons une topologie active-passive chaude avec réplication continue de streaming WAL...'
      }
    ]
  },
  {
    id: 'distributed-microservices',
    title: 'Microservices Distribués & Concurrence Avancée',
    category: 'Backend',
    duration: '35 mins',
    difficulty: 'Senior / Staff',
    iconType: 'microservices',
    questionsCount: 2,
    description: 'Gestion des transactions distribuées (Saga Orchestrée vs Chorégraphiée), consistance éventuelle et patterns de résilience.',
    questions: [
      {
        id: 'ms-q1',
        prompt: 'Comparez l’orchestration Saga et la chorégraphie Saga pour une commande multi-étapes (réservation stock, débit bancaire, notification). Lequel préconisez-vous et pourquoi ?',
        context: 'L’équipe grandit et plusieurs services tiers ont des temps de réponse variables.',
        keyCheckpoints: [
          'Orchestrateur centralisé (visibilité, gestion d’état, complexité de couplage)',
          'Chorégraphie basée événements (faible couplage, risque de boucles cycliques)',
          'Transactions compensatoires en cas d’échec du débit'
        ],
        sampleHighAnswer: 'Pour des flux critiques avec transactions compensatoires complexes, je privilégie l’orchestration Saga car elle offre un point central d’audit et évite l’effet de dépendances cycliques...'
      },
      {
        id: 'ms-q2',
        prompt: 'Comment protégez-vous vos microservices des pannes en cascade lors d’une dégradation d’un service en aval ?',
        context: 'Un service tiers ralentit, saturant les pools de threads Tomcat/Spring Boot.',
        keyCheckpoints: [
          'Circuit Breaker (Resilience4j / Istio)',
          'Bulkhead pattern (isolation des pools de threads/connexions)',
          'Timeouts agressifs avec fallback dégradé'
        ],
        sampleHighAnswer: 'Nous appliquons le pattern Circuit Breaker couplé au Bulkhead. Si le taux d’échec ou de latence dépasse 50% sur une fenêtre glissante, le disjoncteur bascule en état OPEN...'
      }
    ]
  },
  {
    id: 'tech-leadership',
    title: 'Leadership Technique, Stratégie & Gestion des Hommes',
    category: 'Leadership',
    duration: '40 mins',
    difficulty: 'Lead / Staff / Director',
    iconType: 'leadership',
    questionsCount: 2,
    description: 'Arbitrages architecturaux, gestion de la dette technique face aux impératifs produit, et montée en compétences des ingénieurs.',
    questions: [
      {
        id: 'lead-q1',
        prompt: 'Comment arbitrez-vous lorsqu’un Product Manager exige une fonctionnalité pour la fin du mois alors que son intégration requiert un refactoring architectural de 3 semaines ?',
        context: 'Une opportunité commerciale majeure dépend de cette date de livraison.',
        keyCheckpoints: [
          'Découpage en MVP pragmatique avec dette technique assumée et isolée',
          'Documentation formelle de l’ADR (Architecture Decision Record)',
          'Planification inscrite au backlog du remboursement de dette dans le sprint suivant'
        ],
        sampleHighAnswer: 'Je commence par aligner les enjeux business et techniques sans confrontation. Nous identifions un compromis tactique : isoler la nouvelle feature dans un module temporaire avec un contrat d’interface clair...'
      },
      {
        id: 'lead-q2',
        prompt: 'Décrivez comment vous avez guidé un ingénieur senior résistant aux nouvelles pratiques d’ingénierie (tests automatisés, revues d’architecture).',
        context: 'L’ingénieur est très productif individuellement mais génère des régressions en production.',
        keyCheckpoints: [
          'Approche empathique en 1:1 orientée données factuelles',
          'Co-conception des standards plutôt qu’imposition unilatérale',
          'Mise en place de l’automatisation dans le pipeline CI pour dépersonnaliser la règle'
        ],
        sampleHighAnswer: 'Lors des 1:1, je m’appuie sur les métriques objectives d’incidents plutôt que des jugements subjectifs. Je l’ai impliqué comme co-responsable de la définition du standard CI...'
      }
    ]
  },
  {
    id: 'behavioral-star',
    title: 'Entretien Comportemental (Méthode STAR)',
    category: 'Culture & Comportement',
    duration: '30 mins',
    difficulty: 'Tous Niveaux',
    iconType: 'star',
    questionsCount: 2,
    description: 'Valorisez vos accomplissements avec la structure STAR : Situation, Tâche, Action, Résultat chiffré.',
    questions: [
      {
        id: 'star-q1',
        prompt: 'Racontez une situation où une mise en production a provoqué un incident critique. Quelles ont été vos actions immédiates et les enseignements durables ?',
        context: 'Incident de niveau Sev-1 en direct.',
        keyCheckpoints: [
          'Situation claire et enjeu business mesuré',
          'Calme, leadership opérationnel et rollback rapide',
          'Postmortem blameless et amélioration de la résilience'
        ],
        sampleHighAnswer: 'Chez Moov Africa, lors d’une migration nocturne de notre cluster Kafka, une perte de métadonnées a interrompu les transactions. J’ai immédiatement pris le rôle d’Incident Commander, exécuté le plan de rollback en 8 minutes...'
      }
    ]
  }
];

export const initialPastSessions: MockInterviewSession[] = [
  {
    id: 'sess-1',
    jobTitle: 'Lead Cloud & Systems Architect',
    company: 'Wave Mobile Money',
    date: '2026-08-28',
    duration: '18 min',
    score: 88,
    clarityScore: 92,
    depthScore: 85,
    language: 'fr',
    mode: 'audio',
    feedback: 'Excellente maîtrise du sharding de bases de données et de l’intégration de Kafka pour les transactions idempotentes. Pensez à approfondir le dimensionnement mémoire des nœuds Redis.',
    strengths: [
      'Clarté de structuration de la réponse',
      'Maîtrise des compromis CAP theorem et patterns Saga',
      'Chiffrage réaliste des ordres de grandeur'
    ],
    recommendations: [
      'Détailler davantage la gestion du split-brain lors du failover multi-région',
      'Spécifier les métriques de monitoring Prometheus associées'
    ]
  },
  {
    id: 'sess-2',
    jobTitle: 'Staff Distributed Systems Engineer',
    company: 'Paystack',
    date: '2026-08-15',
    duration: '15 min',
    score: 91,
    clarityScore: 94,
    depthScore: 89,
    language: 'en',
    mode: 'audio',
    feedback: 'Très bon positionnement stratégique. Votre approche pour concilier vélocité business et rigueur architecturale est exemplaire pour un poste de Lead ou Staff Architect.',
    strengths: [
      'Communication calme et persuasive',
      'Usage judicieux des ADRs pour consigner les compromis',
      'Exemples concrets tirés de l’expérience telecom'
    ],
    recommendations: [
      'Expliciter les KPIs d’impact de la dette technique sur le coût du cloud (FinOps)'
    ]
  }
];
