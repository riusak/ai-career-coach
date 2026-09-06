import { describe, expect, it } from 'vitest';
import {
  extractOfferMetadata,
  GENERIC_JOB_TITLE,
} from './offer-metadata';

describe('extractOfferMetadata', () => {
  it('falls back to the canonical generic title constant', () => {
    expect(GENERIC_JOB_TITLE).toBe('Offre d’emploi');
  });

  it('extracts a labelled job title and company', () => {
    const text = [
      'Entreprise : Wave Mobile Money',
      'Intitulé du poste : Senior Backend Engineer',
      'Lieu : Dakar / Remote',
      'Missions : concevoir des APIs robustes.',
    ].join('\n');

    const meta = extractOfferMetadata(text);
    expect(meta.jobTitle).toBe('Senior Backend Engineer');
    expect(meta.company).toBe('Wave Mobile Money');
  });

  it('supports english labelled fields', () => {
    const text = 'Job title: Staff Distributed Systems Engineer\nCompany: Paystack\n';
    const meta = extractOfferMetadata(text);
    expect(meta.jobTitle).toBe('Staff Distributed Systems Engineer');
    expect(meta.company).toBe('Paystack');
  });

  it('uses the leading line as an implicit title', () => {
    const text = 'Principal Platform & Cloud Architect\n\nWave Mobile Money recrute à Dakar.\n';
    const meta = extractOfferMetadata(text);
    expect(meta.jobTitle).toBe('Principal Platform & Cloud Architect');
  });

  it('never returns boilerplate as the implicit title', () => {
    const meta = extractOfferMetadata(
      "Nous recherchons un ingénieur talentueux.\nVous rejoindrez une équipe dynamique.\nMissions variées."
    );
    expect(meta.jobTitle).toBeNull();
  });

  it('detects the company via « chez » and « à propos de »', () => {
    expect(
      extractOfferMetadata('Poste : DevOps\nVous rejoindrez l’équipe plateforme chez Orange Digital.').company
    ).toBe('Orange Digital');
    expect(extractOfferMetadata('À propos de Wave Mobile Money\nPoste : Tech Lead\n').company).toBe(
      'Wave Mobile Money'
    );
    // « À propos de l'offre » is not a company.
    expect(extractOfferMetadata('À propos de l’offre\nPoste : Tech Lead\n').company).toBeNull();
  });

  it('returns nulls when nothing matches', () => {
    const meta = extractOfferMetadata('Texte sans aucune métadonnée exploitable.');
    expect(meta.jobTitle).toBeNull();
    expect(meta.company).toBeNull();
  });
});