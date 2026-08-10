import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FavoriteItem } from '../schemas';
import {
  buildContactMessage,
  buildSellerScopedLeadMessage,
  extractBuyerNotes,
  syncContactMessageName,
} from './contact-message';

const item = (overrides: Partial<FavoriteItem>): FavoriteItem => ({
  id: 'id-1',
  title: 'Item One',
  price: 10,
  category: 'clothing',
  sellerId: 'seller-a',
  ...overrides,
});

describe('buildSellerScopedLeadMessage', () => {
  it('lists only the given seller items', () => {
    const sellerA = item({ id: 'a1', title: 'Alpha Jacket', sellerId: 'seller-a' });
    const sellerB = item({ id: 'b1', title: 'Beta Dress', sellerId: 'seller-b' });
    const draft = buildContactMessage([sellerA, sellerB], 'Jordan');

    const scoped = buildSellerScopedLeadMessage(draft, [sellerA], 'Jordan');

    assert.match(scoped, /Alpha Jacket/);
    assert.doesNotMatch(scoped, /Beta Dress/);
    assert.match(scoped, /Kind regards,\nJordan$/);
  });

  it('does not leak other sellers titles from a multi-seller draft', () => {
    const sellerAItems = [
      item({ id: 'a1', title: 'Red Coat', sellerId: 'seller-a' }),
      item({ id: 'a2', title: 'Blue Hat', sellerId: 'seller-a' }),
    ];
    const otherTitle = 'Secret Other Seller SKU';
    const draft = [
      'Hi there,',
      '',
      "I'm interested in these items:",
      '',
      '- Red Coat',
      `- ${otherTitle}`,
      '- Blue Hat',
      '',
      'Can you do volume pricing?',
      '',
      'Kind regards,',
      'Alex',
    ].join('\n');

    const scoped = buildSellerScopedLeadMessage(draft, sellerAItems, 'Alex');

    assert.match(scoped, /- Red Coat/);
    assert.match(scoped, /- Blue Hat/);
    assert.doesNotMatch(scoped, new RegExp(otherTitle));
    assert.match(scoped, /Can you do volume pricing\?/);
  });

  it('applies signature name from the name argument', () => {
    const sellerItems = [item({ title: 'Only Mine', sellerId: 'seller-a' })];
    const draft = buildContactMessage(sellerItems, '');
    const withName = syncContactMessageName(draft, 'Sam');

    const scoped = buildSellerScopedLeadMessage(withName, sellerItems, 'Sam');

    assert.match(scoped, /Kind regards,\nSam$/);
    assert.match(scoped, /- Only Mine/);
  });
});

describe('extractBuyerNotes', () => {
  it('returns notes after the item bullet list', () => {
    const draft = [
      'Hi there,',
      '',
      "I'm interested in these items:",
      '',
      '- One',
      '- Two',
      '',
      'Need express shipping.',
      '',
      'Kind regards,',
      'Name',
    ].join('\n');

    assert.equal(extractBuyerNotes(draft), 'Need express shipping.');
  });
});
