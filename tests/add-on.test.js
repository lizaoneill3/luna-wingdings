// Runs against Luna.MockEngine: no LUNA needed. `npm test`.
import { describe, expect, it } from 'vitest';
import { Luna } from '@uaudio/luna-builder-sdk';

globalThis.Luna = Luna; // logic.js is a classic script that reads the Luna global
await import('../logic.js');
const logic = globalThis.AddOnLogic;

async function connected() {
  const engine = new Luna.MockEngine();
  engine.addSession('abc', { name: 'Demo', tracks: ['Vocal', 'Bass'] });
  engine.addBus('abc', 'fx', { name: 'Reverb 2', busType: 'aux' });
  engine.addMidiClip('abc', 'Bass', { name: 'Riff A', startTick: 0, stopTick: Luna.WHOLE_NOTE });
  await engine.settled();
  const luna = await Luna.connect({ port_: engine.port() });
  const session = await luna.session();
  await session.addMarker(Luna.WHOLE_NOTE * 4, 'Chorus!');
  await engine.settled();
  await logic.load(session);
  return { engine, luna, session };
}

const names = (session) => Object.fromEntries(logic.namedItems(session).map((i) => [i.kind + ':' + logic.fromWingdings(i.name), i.name]));

describe('Wingdings mapping', () => {
  it('maps the 94 printable ASCII characters to 94 distinct non-ASCII symbols', () => {
    expect(logic.TO_WINGDINGS.size).toBe(94);
    expect(logic.FROM_WINGDINGS.size).toBe(94);
    for (const g of logic.FROM_WINGDINGS.keys()) expect([...g].length).toBe(1);
    for (const g of logic.FROM_WINGDINGS.keys()) expect(g.codePointAt(0)).toBeGreaterThan(0x7e);
  });

  it('uses the Wingdings symbols', () => {
    expect(logic.toWingdings('ABC abc 0!')).toBe('✌👌👍 ♋♌♍ 📁🖉');
    expect(logic.toWingdings('Wingdings')).toBe('🕈♓■♑♎♓■♑⬧');
  });

  it('round-trips any text and leaves what it cannot map', () => {
    const text = 'Lead Vox (take 3) — Ünïcode ~{|}';
    expect(logic.fromWingdings(logic.toWingdings(text))).toBe(text);
    expect(logic.toWingdings('é — ')).toBe('é — ');
  });

  it('is idempotent both ways', () => {
    const w = logic.toWingdings('Drums 1');
    expect(logic.toWingdings(w)).toBe(w);
    expect(logic.fromWingdings('Drums 1')).toBe('Drums 1');
  });
});

describe('Wingdings Add On', () => {
  it('finds tracks, aux buses, markers and clips, not the master bus', async () => {
    const { session } = await connected();
    const kinds = logic.namedItems(session).map((i) => `${i.kind}:${i.name}`);
    expect(kinds).toEqual(expect.arrayContaining(['track:Vocal', 'track:Bass', 'bus:Reverb 2', 'marker:Chorus!', 'clip:Riff A']));
    expect(kinds.some((k) => /master/i.test(k))).toBe(false);
    expect(logic.summary(session)).toEqual({ total: kinds.length, converted: 0 });
  });

  it('converts every name in one undo step, then restores them in another', async () => {
    const { engine, session } = await connected();
    const before = logic.namedItems(session).map((i) => i.name);

    const n = await logic.convertAll(session, 'to');
    await engine.settled();
    expect(n).toBe(before.length);
    expect(logic.namedItems(session).map((i) => i.name)).toEqual(before.map(logic.toWingdings));
    expect(session.visibleTracks[0].name.value).toBe('✞□♍♋●'); // Vocal
    expect(logic.summary(session).converted).toBe(before.length);
    expect(engine.transactions).toEqual(['begin', 'commit']);

    expect(await logic.convertAll(session, 'to')).toBe(0); // already converted: no edit, no undo step

    await logic.convertAll(session, 'from');
    await engine.settled();
    expect(logic.namedItems(session).map((i) => i.name)).toEqual(before);
    expect(engine.transactions).toEqual(['begin', 'commit', 'begin', 'commit']);
    expect(Object.keys(names(session))).toContain('marker:Chorus!');
  });
});
