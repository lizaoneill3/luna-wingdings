# Wingdings for LUNA

A LUNA Add On that turns every name in your session into Wingdings, and back.

One click renames every track, aux bus, folder, marker and clip using the symbols the
Wingdings font draws for each character: "Vocal" becomes ✞□♍♋●, "Wingdings" becomes
🕈♓■♑♎♓■♑⬧. **Restore** turns them back into text. Each click is one undo step, so Cmd-Z works
too. The master and cue buses keep their names.

Restore needs nothing saved: every character has its own symbol, so the symbols map straight
back to the original text, even after the session is closed and reopened.

## Install

Needs LUNA 3.1.1 or later.

1. Download `wingdings.lunaaddon` from the [latest release](../../releases/latest).
2. Double-click it, or drag it onto LUNA.
3. Open a session, then choose **Add Ons > Windows > Wingdings**.

## Good to know

- A few symbols (🗏 🖮 🞐 ⮹ 🙰, mostly for digits and punctuation) may show as boxes where
  LUNA's font has no glyph for them. They still restore correctly.
- If a name already contains one of the symbols on purpose (⌘ or ●, say), Restore turns it
  into the matching letter.
- Characters Wingdings has no symbol for (accented letters, emoji, dashes) are left as they are.

## Development

Built with the LUNA Builder SDK (`@uaudio/luna-builder-sdk` 3.1.2), which `package.json`
expects at `../../.claude/plugins/cache/luna-builder-sdk/ua-luna-builder/3.1.2`; point it at
your copy of the SDK.

| File | Purpose |
|---|---|
| `manifest.json` | What LUNA reads: id, name, window size, entry page. |
| `index.html` | The page. Loads the vendored SDK bundle, then `logic.js`, then `main.js`. |
| `logic.js` | The Wingdings mapping and the rename logic, with no DOM. |
| `main.js` | Connects to LUNA, follows the focused session, renders the buttons. |
| `vendor/luna.global.js` | The SDK as a script-tag bundle. |
| `tests/` | Vitest against the SDK's mock engine; no LUNA needed. |

```sh
npm install
npm test                  # against the mock engine
npx ua-builder install    # link into LUNA's Add Ons folder
npx ua-builder pack       # build wingdings.lunaaddon
```
