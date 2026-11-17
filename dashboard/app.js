// Token Radar dashboard: renders window.RADAR (written by main.ts) with no network.
// Board, detail dialog and live-token view are all driven by the same data;
// the detail dialog recomputes the implied value from the row's own factors.
(function () {
  'use strict';
  var R = window.RADAR;
  if (!R || !Array.isArray(R.rows)) {
    document.body.innerHTML = '<p style="padding:40px">No radar data: data.js did not load.</p>';
    return;
  }

  var watchSet = {};
  R.rows.forEach(function (r) { if (r.watchlist) watchSet[r.slug] = true; });

  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(n >= 1e11 ? 1 : 2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(v) {
    if (v === null || v === undefined) return '<span class="flat">—</span>';
    var c = v > 0.05 ? 'up' : v < -0.05 ? 'down' : 'flat';
    var s = (v > 0 ? '+' : '') + v.toFixed(1) + '%';
    return '<span class="' + c + '">' + s + '</span>';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function ageLabel(d) {
    if (d === null || d === undefined) return '—';
    if (d < 30) return d + 'd';
    if (d < 365) return Math.round(d / 30) + 'mo';
    return (d / 365).toFixed(1) + 'y';
  }

  // ---- header stats -------------------------------------------------------
  var stats = document.getElementById('stats');
  var earlyCount = R.rows.filter(function (r) { return !r.watchlist; }).length;
  stats.innerHTML =
    '<div class="stat"><b>' + R.board_size + '</b><span>board rows</span></div>' +
    '<div class="stat"><b>' + R.watchlist_size + '</b><span>watchlist</span></div>' +
    '<div class="stat"><b>' + earlyCount + '</b><span>early finds</span></div>' +
    '<div class="stat"><b>' + R.live_size + '</b><span>live tokens aside</span></div>' +
    '<div class="stat"><b>' + esc(R.as_of) + '</b><span>snapshot date</span></div>';
  document.getElementById('model-version').textContent = R.model_version;
  document.getElementById('overall-multiple').textContent = '×' + R.overall_multiple.toFixed(2);
  document.getElementById('n-all').textContent = R.board_size;
  document.getElementById('n-watch').textContent = R.watchlist_size;
  document.getElementById('n-early').textContent = earlyCount;

  // ---- category multiples table -------------------------------------------
  // Sorted by multiple, so a category resting on one live peer is visible.
  var catBody = document.querySelector('#cat-table tbody');
  var catRows = R.categories.slice().sort(function (a, b) { return b.multiple - a.multiple || b.live_n - a.live_n; }).slice(0, 12);
  catBody.innerHTML = catRows.map(function (c) {
    return '<tr><td>' + esc(c.category) + '</td><td class="num">' + c.live_n + '</td><td class="num">×' + c.multiple.toFixed(2) + '</td></tr>';
  }).join('');

  // ---- controls ------------------------------------------------------------
  var searchEl = document.getElementById('search');
  var catEl = document.getElementById('category');
  var sortEl = document.getElementById('sort');
  var scope = 'all';
  var cats = [];
  R.rows.forEach(function (r) { if (r.category && cats.indexOf(r.category) === -1) cats.push(r.category); });
  cats.sort();
  cats.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    catEl.appendChild(o);
  });

  function currentRows() {
    var q = searchEl.value.trim().toLowerCase();
    var cat = catEl.value;
    var rows = R.rows.filter(function (r) {
      if (scope === 'watchlist' && !r.watchlist) return false;
      if (scope === 'early' && r.watchlist) return false;
      if (cat && r.category !== cat) return false;
      if (q && (r.name.toLowerCase().indexOf(q) === -1 && r.slug.toLowerCase().indexOf(q) === -1)) return false;
      return true;
    });
    var mode = sortEl.value;
    if (mode === 'tvl') rows = rows.slice().sort(function (a, b) { return b.tvl_usd - a.tvl_usd; });
    else if (mode === 'growth') rows = rows.slice().sort(function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); });
    else if (mode === 'age') rows = rows.slice().sort(function (a, b) { return (b.age_days || 0) - (a.age_days || 0); });
    return rows;
  }

  function renderBoard() {
    var rows = currentRows();
    var tb = document.querySelector('#board tbody');
    tb.innerHTML = rows.map(function (r) {
      var badge = r.watchlist
        ? '<span class="badge watch">WATCHLIST</span>'
        : '<span class="badge early">EARLY</span>';
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td>' + r.rank + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span>' + badge + '<br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + ageLabel(r.age_days) + '</td>' +
        '<td class="num"><strong>' + money(r.implied_value_usd) + '</strong></td>' +
        '</tr>';
    }).join('');
    document.getElementById('count').textContent =
      rows.length + ' of ' + R.board_size + ' rows shown · sorted by ' + sortEl.options[sortEl.selectedIndex].textContent.replace('Sort: ', '');
    tb.querySelectorAll('tr').forEach(function (tr) {
      tr.addEventListener('click', function () { openDetail(tr.getAttribute('data-slug')); });
    });
  }

  // ---- live tokens ----------------------------------------------------------
  var liveBody = document.querySelector('#live tbody');
  liveBody.innerHTML = R.live.map(function (p) {
    return '<tr><td><span class="name">' + esc(p.name) + '</span><br><span class="slug">' + esc(p.slug) + '</span></td>' +
      '<td>' + esc(p.category || '—') + '</td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td>' +
      '<td class="num">' + (p.mcap_usd ? money(p.mcap_usd) : '—') + '</td>' +
      '<td class="num">' + (p.mcap_tvl !== null && p.mcap_tvl !== undefined ? '×' + p.mcap_tvl.toFixed(2) : '—') + '</td>' +
      '<td class="num">' + pct(p.change_7d) + '</td></tr>';
  }).join('');
  document.getElementById('foot').textContent =
    'Snapshot: ' + R.source + ' · floor $' + R.floor_usd.toLocaleString('en-US') +
    ' · model ' + R.model_version + ' · implied values are the radar\u2019s own claim, never a promise of a token.';

  // ---- detail dialog ---------------------------------------------------------
  var dlg = document.getElementById('detail');
  var detailBody = document.getElementById('detail-body');

  function openDetail(slug) {
    var r = null;
    for (var i = 0; i < R.rows.length; i++) if (R.rows[i].slug === slug) { r = R.rows[i]; break; }
    if (!r) return;
    // Recompute the implied value from the row's own factors, in the page.
    var recomputed = Math.max(1, Math.round(r.tvl_usd * r.category_multiple * r.growth_multiplier * r.maturity_multiplier * r.breadth_multiplier));
    var match = recomputed === r.implied_value_usd ? 'matches the board' : 'differs from the board';
    var steps = r.farm_steps.map(function (s) {
      var at = s.indexOf(' Cost: ');
      var main = at === -1 ? s : s.slice(0, at);
      var tail = at === -1 ? '' : s.slice(at + 1);
      return '<li>' + esc(main) + (tail ? ' <span class="cost">' + esc(tail) + '</span>' : '') + '</li>';
    }).join('');
    detailBody.innerHTML =
      '<h2>' + esc(r.name) + '</h2>' +
      '<p class="meta">Rank #' + r.rank + ' · ' + esc(r.category || 'no category') + ' · ' + esc(r.chains.join(', ')) +
      ' · ' + (r.watchlist ? 'on the watchlist' : 'early find below the $50M floor') + '</p>' +
      '<div class="factors">' +
      '<div class="factor"><b>' + money(r.implied_value_usd) + '</b><span>Implied value</span><span class="how">recomputed in this page: ' + money(recomputed) + ' — ' + match + '</span></div>' +
      '<div class="factor"><b>×' + r.category_multiple.toFixed(2) + '</b><span>Category multiple</span><span class="how">median mcap/TVL of live ' + esc(r.category || 'uncategorised') + ' peers, shrunk to the overall median</span></div>' +
      '<div class="factor"><b>×' + r.growth_multiplier.toFixed(2) + '</b><span>Growth</span><span class="how">7-day TVL change ' + (r.change_7d === null ? 'unreported' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</span></div>' +
      '<div class="factor"><b>×' + r.maturity_multiplier.toFixed(2) + '</b><span>Maturity</span><span class="how">' + (r.age_days === null ? 'age unknown, counted as 365 days' : 'tracked for ' + r.age_days + ' days') + '</span></div>' +
      '<div class="factor"><b>×' + r.breadth_multiplier.toFixed(2) + '</b><span>Breadth</span><span class="how">' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + ' counted</span></div>' +
      '<div class="factor"><b>' + money(r.tvl_usd) + '</b><span>TVL</span><span class="how">as of ' + esc(R.as_of) + '</span></div>' +
      '</div>' +
      '<h3>How to farm it</h3><ol class="steps">' + steps + '</ol>';
    if (typeof dlg.showModal === 'function') dlg.showModal();
  }

  // ---- events -----------------------------------------------------------------
  searchEl.addEventListener('input', renderBoard);
  catEl.addEventListener('change', renderBoard);
  sortEl.addEventListener('change', renderBoard);
  document.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      scope = chip.getAttribute('data-scope');
      renderBoard();
    });
  });

  // Deep links for the screenshots: #cat=Risk%20Curators, #scope=early, #detail=<slug>, #q=<text>
  var hash = new URLSearchParams(window.location.hash.slice(1));
  if (hash.get('cat')) { catEl.value = hash.get('cat'); }
  if (hash.get('scope')) {
    scope = hash.get('scope');
    document.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('active', c.getAttribute('data-scope') === scope); });
  }
  if (hash.get('q')) { searchEl.value = hash.get('q'); }
  renderBoard();
  if (hash.get('detail')) openDetail(hash.get('detail'));
})();
