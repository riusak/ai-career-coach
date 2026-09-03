import { describe, expect, it } from 'vitest';
import { heuristicCvGate } from '@/lib/quick-test/guardrail';

describe('heuristicCvGate', () => {
  const sampleCv = `Jean Dupont — Développeur senior
  Email : jean.dupont@email.fr

  Expérience professionnelle
  - Piloté une équipe de 6 personnes chez Acme.
  - Conçu une plateforme e-commerce.

  Formation : Master Informatique, 2019.
  Compétences : TypeScript, React, Node.js.
  Langues : Français (natif), Anglais (courant).`;

  it('accepts a typical French CV', () => {
    const gate = heuristicCvGate(sampleCv);
    expect(gate.ok).toBe(true);
  });

  it('accepts a typical English CV (multilingual indicators)', () => {
    const text = `John Smith — Software Engineer
    Work history
    - Led a team of 6 engineers at Acme Corp.
    - Developed the checkout platform.

    Education: MSc Computer Science.
    Skills: TypeScript, React, Go.`;
    expect(heuristicCvGate(text).ok).toBe(true);
  });

  it('accepts a typical German CV (multilingual indicators)', () => {
    const text = `Max Mustermann — Softwareentwickler
    Berufserfahrung
    - Verantwortlich für die Plattformentwicklung bei Acme GmbH.

    Ausbildung: MSc Informatik.
    Kenntnisse: TypeScript, React, Go.
    Sprachen: Deutsch (Muttersprache), Englisch (fließend).`;
    expect(heuristicCvGate(text).ok).toBe(true);
  });

  it('rejects an invoice (dominant non-CV indicators)', () => {
    const text = `FACTURE 2026-041
    Facturation : Acme SARL
    Montant dû : 1 200,00 €
    Total TTC : 1 440,00 € (TVA 20 %)
    IBAN : FR76 3000 4000 0300 0012 3456 789
    BIC : BNPAFRPP
    Échéance : 30 jours. Numéro de commande : 88121.`;
    const gate = heuristicCvGate(text);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toContain('administratif');
  });

  it('rejects very short texts', () => {
    expect(heuristicCvGate('Bonjour').ok).toBe(false);
    expect(heuristicCvGate('   ').ok).toBe(false);
  });

  it('accepts by default when uncertain (conservative net)', () => {
    const text =
      'Texte ambigu sans mot-clé connu mais suffisamment long pour dépasser le seuil de longueur minimal exigé par le garde-fou.';
    expect(heuristicCvGate(text).ok).toBe(true);
  });
});
