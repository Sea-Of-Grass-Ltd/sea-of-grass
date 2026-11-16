// Unit tests for the shared step-by-step form engine in bunnyworld/bw.js ([data-steps] forms + form[data-demo] submit).
// Runs the real bw.js in Chrome against a tiny fixture page (tests/fixtures/steps.html). No build step.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startSite } from '../lib/site.mjs';

let site;
before(async () => { site = await startSite(); });
after(async () => { await site?.close(); });

async function fixture(w = 390) {
  const o = await site.open('/tests/fixtures/steps.html', w, { reducedMotion: 'reduce' });
  return o;
}
// state of every step: reached (shown), open (body showing), summary text
const steps = page => page.$$eval('#book .q-step', ss => ss.map(s => {
  const sum = s.querySelector('.q-sum');
  return { reached: s.classList.contains('on'), open: s.querySelector('.q-body').classList.contains('on'), sum: sum.hidden ? null : sum.querySelector('b').textContent };
}));
const nextOf = (page, i) => page.locator('#book .q-step').nth(i).locator('.q-next');
const answerToTime = async page => {
  await page.locator('#book .q-opt', { hasText: 'Exam' }).click();
  await page.fill('#note', 'Sore neck');
  await nextOf(page, 1).click();
  await page.locator('#book .slots button:not(:disabled)').first().click();
  await page.waitForFunction(() => !document.querySelector('#name').closest('[inert]'));
};

test('steps reveal one at a time, in order', async () => {
  const { ctx, page, errors } = await fixture();
  try {
    let s = await steps(page);
    assert.deepEqual(s.map(x => x.reached), [true, false, false, false], 'only the first step shows at first');
    assert.equal(s[0].open, true);
    await page.locator('#book .q-opt', { hasText: 'Adjustment' }).click();
    s = await steps(page);
    assert.deepEqual(s.map(x => x.reached), [true, true, false, false], 'answering step 1 reveals step 2 only');
    assert.equal(s[0].open, false, 'step 1 collapses');
    assert.equal(s[0].sum, 'Adjustment', 'step 1 summary shows the answer');
    await page.fill('#note', 'Low back');
    await nextOf(page, 1).click();
    s = await steps(page);
    assert.deepEqual(s.map(x => x.reached), [true, true, true, false]);
    await page.locator('#book .slots button:not(:disabled)').first().click();
    await page.waitForTimeout(50);
    s = await steps(page);
    assert.deepEqual(s.map(x => x.reached), [true, true, true, true], 'picking a time reveals the last step');
    assert.match(s[2].sum, / · \d{1,2}(:\d\d)? (am|pm)$/, 'time step summary shows day and time');
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }
});

test('going back through a summary chip keeps the later answers', async () => {
  const { ctx, page } = await fixture();
  try {
    await answerToTime(page);
    await page.locator('#book .q-step').nth(0).locator('.q-sum').click();
    let s = await steps(page);
    assert.equal(s[0].open, true, 'step 1 reopens');
    await page.locator('#book .q-opt', { hasText: 'Massage' }).click();
    s = await steps(page);
    assert.equal(s[0].sum, 'Massage', 'summary updates to the new answer');
    assert.equal(s[0].open, false, 'step 1 closes again');
    assert.equal(await page.inputValue('#note'), 'Sore neck', 'the note typed earlier is still there');
    assert.equal(s[1].sum, 'Sore neck');
    assert.ok(await page.inputValue('input[name=time]'), 'the picked time is still there');
    assert.equal(s[3].reached, true, 'the last step stays reachable');
  } finally { await ctx.close(); }
});

test('a required field blocks Next until it is filled', async () => {
  const { ctx, page } = await fixture();
  try {
    await page.locator('#book .q-opt', { hasText: 'Exam' }).click();
    await nextOf(page, 1).click();
    let s = await steps(page);
    assert.equal(s[2].reached, false, 'empty required note does not advance');
    assert.equal(await page.$eval('#note', i => i.validity.valueMissing), true);
    await page.fill('#note', 'Hip');
    await nextOf(page, 1).click();
    s = await steps(page);
    assert.equal(s[2].reached, true);
  } finally { await ctx.close(); }
});

test('spaces only count as empty', async () => {
  const { ctx, page } = await fixture();
  try {
    await page.locator('#book .q-opt', { hasText: 'Exam' }).click();
    await page.fill('#note', '    ');
    await nextOf(page, 1).click();
    const s = await steps(page);
    assert.equal(s[2].reached, false, 'a note of only spaces does not advance');
  } finally { await ctx.close(); }
});

test('submitting without a time shows the message and does not book', async () => {
  const { ctx, page } = await fixture();
  try {
    await page.locator('#book .q-opt', { hasText: 'Exam' }).click();
    await page.fill('#note', 'Neck'); await nextOf(page, 1).click();
    // reach the last step from code, the way a hand-off does, without a time
    await page.evaluate(() => document.querySelector('#book').bwSteps.done(2));
    await page.fill('#name', 'Pat');
    await page.locator('#book [type=submit]').click();
    assert.equal(await page.textContent('#book .err'), 'Pick a day and a time first.');
    assert.equal(await page.$eval('#book .done', d => d.classList.contains('on')), false);
  } finally { await ctx.close(); }
});

test('answers handed in from code show in the summaries and the confirmation', async () => {
  const { ctx, page } = await fixture();
  try {
    await page.evaluate(() => { document.querySelector('#visit').value = 'massage'; document.querySelector('#about').value = 'Mid-back, months'; const f = document.querySelector('#book'); f.bwSteps.done(0); });
    let s = await steps(page);
    assert.equal(s[0].sum, 'Massage', 'a pre-filled choice shows as answered');
    assert.equal(s[1].open, true, 'the next unanswered step is open');
    await page.fill('#note', 'From the hook');
    await nextOf(page, 1).click();
    await page.locator('#book .slots button:not(:disabled)').first().click();
    await page.waitForFunction(() => !document.querySelector('#name').closest('[inert]'));
    await page.fill('#name', 'Pat');
    await page.locator('#book [type=submit]').click();
    const done = await page.textContent('#book .done');
    assert.match(done, /Booked\./);
    assert.match(done, /Visit: Massage/);
    assert.match(done, /About: Mid-back, months/, 'hidden carried answers reach the confirmation');
  } finally { await ctx.close(); }
});

test('very long input stays inside the form', async () => {
  const { ctx, page } = await fixture(360);
  try {
    await page.locator('#book .q-opt', { hasText: 'Exam' }).click();
    await page.fill('#note', 'pain '.repeat(200));
    await nextOf(page, 1).click();
    const r = await page.evaluate(() => { const b = document.querySelector('#book .q-step:nth-child(2) .q-sum'); const f = document.querySelector('#book'); return { sum: b.getBoundingClientRect().right, form: f.getBoundingClientRect().right, over: document.documentElement.scrollWidth - innerWidth }; });
    assert.ok(r.sum <= r.form + 1, 'summary chip fits the form');
    assert.ok(r.over <= 0, 'no sideways scroll');
  } finally { await ctx.close(); }
});

test('double-tapping does not skip a step or book twice', async () => {
  const { ctx, page } = await fixture();
  try {
    await page.locator('#book .q-opt', { hasText: 'Exam' }).dblclick();
    let s = await steps(page);
    assert.deepEqual(s.map(x => x.reached), [true, true, false, false], 'double-tap on a choice answers one step');
    assert.equal(s[1].open, true);
    await page.fill('#note', 'Neck');
    await nextOf(page, 1).dblclick();
    s = await steps(page);
    assert.equal(s[2].open, true, 'double-tap on Next lands on the time step');
    assert.equal(s[3].reached, false, 'and does not skip past it');
    await page.locator('#book .slots button:not(:disabled)').first().click();
    await page.waitForFunction(() => !document.querySelector('#name').closest('[inert]'));
    await page.fill('#name', 'Pat');
    // count every confirmation the form writes, not just the last one left on screen
    await page.evaluate(() => { window.__refs = new Set(); new MutationObserver(() => { const m = document.querySelector('#book .done').textContent.match(/Reference T-\d+/); if (m) window.__refs.add(m[0]); }).observe(document.querySelector('#book .done'), { childList: true, subtree: true, characterData: true }); });
    await page.locator('#book [type=submit]').dblclick();
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.__refs.size), 1, 'a double-tap books once (one reference)');
  } finally { await ctx.close(); }
});
