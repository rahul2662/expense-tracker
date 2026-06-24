#!/usr/bin/env node
// One-time backfill: reads every expense row and registers any missing
// categories/merchants into the Categories and Merchants tabs.
// Safe to run multiple times — addCategory/addMerchant are no-ops on duplicates.
//
// Usage (from backend/):
//   node scripts/sync-lookups.js

require('dotenv').config();
const { getExpenses, getCategories, getMerchants, addCategory, addMerchant } = require('../services/SheetsClient');

async function main() {
  console.log('Fetching all expenses…');
  const expenses = await getExpenses();

  const [existingCats, existingMerchants] = await Promise.all([
    getCategories(),
    getMerchants(),
  ]);

  const catSet = new Set(existingCats.map((c) => c.toLowerCase()));
  const merchantSet = new Set(existingMerchants.map((m) => m.toLowerCase()));

  const missingCats = new Set();
  const missingMerchants = new Set();

  for (const e of expenses) {
    const cats = (e.category || '').split(',').map((c) => c.trim()).filter(Boolean);
    for (const cat of cats) {
      if (!catSet.has(cat.toLowerCase())) missingCats.add(cat);
    }
    if (e.merchant && !merchantSet.has(e.merchant.toLowerCase())) {
      missingMerchants.add(e.merchant);
    }
  }

  console.log(`\nExpenses scanned : ${expenses.length}`);
  console.log(`Missing categories: ${missingCats.size}`);
  console.log(`Missing merchants : ${missingMerchants.size}`);

  if (missingCats.size === 0 && missingMerchants.size === 0) {
    console.log('\nEverything is already in sync.');
    return;
  }

  if (missingCats.size > 0) {
    console.log('\nAdding categories:');
    for (const cat of missingCats) {
      await addCategory(cat);
      console.log(`  + ${cat}`);
    }
  }

  if (missingMerchants.size > 0) {
    console.log('\nAdding merchants:');
    for (const merchant of missingMerchants) {
      await addMerchant(merchant);
      console.log(`  + ${merchant}`);
    }
  }

  console.log('\nSync complete.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
