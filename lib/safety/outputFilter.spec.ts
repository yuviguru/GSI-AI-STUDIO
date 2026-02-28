import { describe, it, expect } from 'vitest';
import { filterOutput } from './inputFilter';

describe('filterOutput — comprehensive PII redaction', () => {
  // ─── Clean text passthrough ────────────────────────────────
  describe('clean text passes through unchanged', () => {
    it('passes a plain story paragraph', () => {
      const text = 'Once upon a time in a magical kingdom far away, there lived a brave princess.';
      expect(filterOutput(text)).toBe(text);
    });

    it('passes text with normal small numbers', () => {
      expect(filterOutput('There are 42 cats and 7 dogs in the park')).toBe(
        'There are 42 cats and 7 dogs in the park'
      );
    });

    it('passes text with Indian names and places', () => {
      const text = 'Priya visited the Taj Mahal in Agra with her friend Arjun.';
      expect(filterOutput(text)).toBe(text);
    });

    it('returns empty string unchanged', () => {
      expect(filterOutput('')).toBe('');
    });
  });

  // ─── Phone number redaction (10-digit Indian mobile) ───────
  describe('phone number redaction', () => {
    it('redacts a 10-digit number', () => {
      expect(filterOutput('Call me at 9876543210 for details')).toBe(
        'Call me at [REDACTED] for details'
      );
    });

    it('redacts phone at start of text', () => {
      expect(filterOutput('9123456789 is my number')).toBe(
        '[REDACTED] is my number'
      );
    });

    it('redacts phone at end of text', () => {
      expect(filterOutput('My number is 9876543210')).toBe(
        'My number is [REDACTED]'
      );
    });

    it('does NOT redact 9-digit numbers', () => {
      expect(filterOutput('Code is 123456789 ok')).toBe('Code is 123456789 ok');
    });

    it('does NOT redact numbers shorter than 10 digits', () => {
      expect(filterOutput('There are 12345 items')).toBe('There are 12345 items');
    });
  });

  // ─── Email redaction ───────────────────────────────────────
  describe('email redaction', () => {
    it('redacts a standard email', () => {
      expect(filterOutput('Email test@example.com please')).toBe(
        'Email [REDACTED] please'
      );
    });

    it('redacts email with dots in local part', () => {
      expect(filterOutput('Contact priya.sharma@gmail.com now')).toBe(
        'Contact [REDACTED] now'
      );
    });

    it('redacts email with subdomain', () => {
      expect(filterOutput('Write to admin@mail.school.edu.in today')).toBe(
        'Write to [REDACTED] today'
      );
    });

    it('does NOT redact standalone @ symbol', () => {
      expect(filterOutput('Sold @ auction for 500')).toBe(
        'Sold @ auction for 500'
      );
    });

    it('does NOT redact incomplete email without domain', () => {
      expect(filterOutput('My handle is @username')).toBe(
        'My handle is @username'
      );
    });
  });

  // ─── Street address redaction ──────────────────────────────
  describe('street address redaction', () => {
    it('redacts "123 Main Street"', () => {
      expect(filterOutput('I live at 123 Main Street in the city')).toBe(
        'I live at [REDACTED] in the city'
      );
    });

    it('redacts "45 Oak Avenue"', () => {
      expect(filterOutput('Visit 45 Oak Avenue for the event')).toBe(
        'Visit [REDACTED] for the event'
      );
    });

    it('redacts "7 Park Road"', () => {
      expect(filterOutput('Near 7 Park Road is a temple')).toBe(
        'Near [REDACTED] is a temple'
      );
    });

    it('redacts "100 Elm Drive"', () => {
      expect(filterOutput('Go to 100 Elm Drive please')).toBe(
        'Go to [REDACTED] please'
      );
    });

    it('redacts abbreviations like "12 MG Rd"', () => {
      expect(filterOutput('Find us at 12 MG Rd in Bangalore')).toBe(
        'Find us at [REDACTED] in Bangalore'
      );
    });

    it('does NOT redact "100 meters away"', () => {
      expect(filterOutput('The park is 100 meters away')).toBe(
        'The park is 100 meters away'
      );
    });

    it('does NOT redact "Road to success"', () => {
      expect(filterOutput('The road to success is long')).toBe(
        'The road to success is long'
      );
    });
  });

  // ─── Aadhaar number redaction (12-digit, India-specific) ───
  describe('Aadhaar number redaction', () => {
    it('redacts continuous 12-digit number', () => {
      expect(filterOutput('Aadhaar is 234567890123 here')).toBe(
        'Aadhaar is [REDACTED] here'
      );
    });

    it('redacts spaced Aadhaar (1234 5678 9012)', () => {
      expect(filterOutput('My Aadhaar: 2345 6789 0123')).toBe(
        'My Aadhaar: [REDACTED]'
      );
    });

    it('redacts Aadhaar at start of text', () => {
      expect(filterOutput('234567890123 is my Aadhaar')).toBe(
        '[REDACTED] is my Aadhaar'
      );
    });

    it('does NOT redact 11-digit numbers', () => {
      expect(filterOutput('Number 12345678901 here')).toBe(
        'Number 12345678901 here'
      );
    });
  });

  // ─── Multiple PII types ────────────────────────────────────
  describe('multiple PII types in same text', () => {
    it('redacts both phone and email', () => {
      const result = filterOutput('Call 9876543210 or email test@example.com');
      expect(result).not.toContain('9876543210');
      expect(result).not.toContain('test@example.com');
      expect(result).toContain('[REDACTED]');
    });

    it('redacts phone, email, and address', () => {
      const result = filterOutput(
        'Call 9876543210 or email me@test.com at 10 Park Road'
      );
      expect(result).not.toContain('9876543210');
      expect(result).not.toContain('me@test.com');
      expect(result).toContain('[REDACTED]');
    });
  });

  // ─── Known limitations (documented) ────────────────────────
  describe('known limitations', () => {
    it.todo(
      'only first occurrence per PII pattern is redacted (replace without g flag) — future fix'
    );
  });
});
