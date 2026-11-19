// Wingdings: DOM wiring. Connects to LUNA, follows the focused session, and shows two big
// buttons: turn every name into Wingdings, or restore them. Listeners are kept so they can
// be released when the session or its contents change.

const $ = (id) => document.getElementById(id);
let luna;
let session;
let busy = false;
let sessionReleases = [];
let nameReleases = [];
const releaseAll = (list) => {
  for (const u of list) u();
  list.length = 0;
};

function paint() {
  const has = !!session;
  const s = has ? AddOnLogic.summary(session) : { total: 0, converted: 0 };
  $('to').disabled = !has || busy || s.converted === s.total;
  $('from').disabled = !has || busy || s.converted === 0;
  $('count').textContent = has ? `${s.converted} of ${s.total} names in ${AddOnLogic.toWingdings('Wingdings')}` : '';
}

// Watch every name so the counts follow edits made in LUNA too.
function watchNames() {
  releaseAll(nameReleases);
  if (!session) return;
  const props = [
    ...session.visibleTracks.map((t) => t.name),
    ...session.buses.items.map((b) => b.name),
    ...session.markers.items.map((m) => m.name),
    ...session.playlists.items.flatMap((pl) => pl.clips.items.map((c) => c.name)),
  ];
  for (const p of props) nameReleases.push(p.onChange(paint));
  paint();
}

async function run(direction) {
  if (!session || busy) return;
  busy = true;
  paint();
  try {
    const n = await AddOnLogic.convertAll(session, direction);
    $('status').textContent = n ? `${direction === 'from' ? 'Restored' : 'Converted'} ${n} name${n === 1 ? '' : 's'}` : 'Nothing to change';
  } catch (e) {
    $('status').textContent = e.message;
  } finally {
    busy = false;
    paint();
  }
}

async function bindSession() {
  releaseAll(sessionReleases);
  releaseAll(nameReleases);
  session = luna.sessions.current();
  if (!session) {
    $('status').textContent = 'no session open';
    paint();
    return;
  }
  $('status').textContent = 'loading...';
  await AddOnLogic.load(session);
  $('status').textContent = session.name.value ?? session.uid;
  const reload = async () => {
    await Promise.all(session.playlists.items.map((pl) => pl.clips.load()));
    watchNames();
  };
  sessionReleases.push(session.tracks.onChange(watchNames));
  sessionReleases.push(session.buses.onChange(watchNames));
  sessionReleases.push(session.markers.onChange(watchNames));
  sessionReleases.push(session.playlists.onChange(reload));
  for (const pl of session.playlists.items) sessionReleases.push(pl.clips.onChange(watchNames));
  watchNames();
}

async function connect() {
  $('to').onclick = () => run('to');
  $('from').onclick = () => run('from');
  for (;;) {
    try {
      luna = await Luna.connect();
      break;
    } catch (e) {
      $('status').textContent = e instanceof Luna.NotRunning ? 'waiting for LUNA...' : e.message;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  Luna.bindShortcuts(luna);
  await luna.sessions.ready();
  luna.sessions.focused.onChange(bindSession);
  luna.sessions.items.onChange(bindSession);
  luna.status.onChange(() => {
    if (luna.status.value === 'disconnected') $('status').textContent = 'reconnecting...';
  });
  await bindSession();
}

connect();
