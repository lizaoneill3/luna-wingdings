// Wingdings: logic that does not touch the DOM, so tests can exercise it against Luna.MockEngine.
//
// Each printable ASCII character maps to the Unicode symbol the Wingdings font draws for it
// (A -> ✌, a -> ♋, 0 -> 📁 ...). Every symbol is outside ASCII and used once, so the mapping
// reverses exactly: Restore maps the symbols back, and nothing has to be stored.

const WINGDINGS_GLYPHS = [
  '🖉', '✂', '✁', '👓', '🕭', '🕮', '🕯', '🕿', '✆', '🖂', '🖃', '📪', '📫', '📬', '📭', // ! .. /
  '📁', '📂', '📄', '🗏', '🗐', '🗄', '⌛', '🖮', '🖰', '🖲', // 0 .. 9
  '🖳', '🖴', '🖫', '🖬', '✇', '✍', '🖎', // : .. @
  '✌', '👌', '👍', '👎', '☜', '☞', '☝', '☟', '🖐', '☺', '😐', '☹', '💣', // A .. M
  '☠', '🏳', '🏱', '✈', '☼', '💧', '❄', '🕆', '✞', '🕈', '✠', '✡', '☪', // N .. Z
  '☯', 'ॐ', '☸', '♈', '♉', '♊', // [ .. `
  '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🙰', '🙵', '●', '🔾', // a .. m
  '■', '□', '🞐', '❑', '❒', '⬧', '⧫', '◆', '❖', '⬥', '⌧', '⮹', '⌘', // n .. z
  '🏵', '🏶', '🙶', '🙷', // { .. ~
];

const TO_WINGDINGS = new Map();
const FROM_WINGDINGS = new Map();
WINGDINGS_GLYPHS.forEach((glyph, i) => {
  const ch = String.fromCharCode(0x21 + i);
  TO_WINGDINGS.set(ch, glyph);
  FROM_WINGDINGS.set(glyph, ch);
});

const AddOnLogic = {
  TO_WINGDINGS,
  FROM_WINGDINGS,

  /** Plain text to Wingdings symbols. Spaces and characters Wingdings has no symbol for stay. */
  toWingdings(text) {
    let out = '';
    for (const ch of text ?? '') out += TO_WINGDINGS.get(ch) ?? ch;
    return out;
  },

  /** Wingdings symbols back to plain text. */
  fromWingdings(text) {
    let out = '';
    for (const ch of text ?? '') out += FROM_WINGDINGS.get(ch) ?? ch;
    return out;
  },

  /** True when any character of `text` is a Wingdings symbol from this mapping. */
  hasWingdings(text) {
    for (const ch of text ?? '') if (FROM_WINGDINGS.has(ch)) return true;
    return false;
  },

  /** Load everything that has a name: tracks, buses, markers, and each take lane's clips. */
  async load(session) {
    await session.ready();
    await Promise.all(session.playlists.items.map((pl) => pl.clips.load()));
  },

  /**
   * Everything in the session whose name this Add On renames, as
   * `{ kind, name, rename(newName) }`. The master and cue buses keep their names.
   */
  namedItems(session) {
    const items = [];
    for (const t of session.visibleTracks) {
      items.push({ kind: 'track', name: t.name.value ?? '', rename: (n) => t.name.set(n) });
    }
    for (const b of session.buses.items) {
      if (b.busType.value !== 'aux') continue;
      items.push({ kind: b.isFolder ? 'folder' : 'bus', name: b.name.value ?? '', rename: (n) => b.name.set(n) });
    }
    for (const m of session.markers.items) {
      items.push({ kind: 'marker', name: m.name.value ?? '', rename: (n) => m.rename(n) });
    }
    for (const pl of session.playlists.items) {
      for (const c of pl.clips.items) {
        items.push({ kind: 'clip', name: c.name.value ?? '', rename: (n) => c.name.set(n) });
      }
    }
    return items;
  },

  /** Counts for the window: how many names there are and how many are in Wingdings now. */
  summary(session) {
    const items = AddOnLogic.namedItems(session);
    const converted = items.filter((i) => AddOnLogic.hasWingdings(i.name)).length;
    return { total: items.length, converted };
  },

  /**
   * Rename everything to Wingdings (`'to'`) or back (`'from'`), as one undo step.
   * Returns how many names changed.
   */
  async convertAll(session, direction) {
    const map = direction === 'from' ? AddOnLogic.fromWingdings : AddOnLogic.toWingdings;
    const changes = AddOnLogic.namedItems(session)
      .map((item) => ({ item, next: map(item.name) }))
      .filter(({ item, next }) => next !== item.name);
    if (changes.length === 0) return 0;
    const label = direction === 'from' ? 'Restore names from Wingdings' : 'Wingdings all names';
    await session.transaction(label, async () => {
      for (const { item, next } of changes) await item.rename(next);
    });
    return changes.length;
  },
};

globalThis.AddOnLogic = AddOnLogic;
