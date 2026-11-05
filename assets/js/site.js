/* Save Life Talent — site behaviour (no dependencies) */
(function () {
  'use strict';
  var SLT = window.SLT || { links: {}, phone: '', email: '' };
  var L = SLT.links;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---- Header: active link + mobile menu ---- */
  var page = document.body.getAttribute('data-page');
  $$('.nav a[data-nav]').forEach(function (a) { if (a.getAttribute('data-nav') === page) a.setAttribute('aria-current', 'page'); });
  var header = $('.site-header'), menuBtn = $('.menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', function () {
    var open = header.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ---- Hero match console (demo with sample profiles) ---- */
  var con = $('#match-console');
  if (con) {
    var form = $('form', con), log = $('.scan-log', con), out = $('.matches', con);
    var pool = {
      'RN — ICU': [['J.M.', 'RN, CCRN', '7 yrs ICU, nights'], ['A.K.', 'RN, BSN', '5 yrs CVICU'], ['D.R.', 'RN, TNCC', '4 yrs ICU / step-down']],
      'RN — Emergency': [['S.P.', 'RN, CEN', '6 yrs Level I trauma'], ['L.T.', 'RN, TNCC', '4 yrs ED, peds-capable'], ['M.O.', 'RN, BSN', '3 yrs ED + urgent care']],
      'CNA / PCT': [['R.G.', 'CNA', '5 yrs long-term care'], ['T.B.', 'PCT', '3 yrs med-surg'], ['K.W.', 'CNA', '2 yrs rehab + memory care']],
      'LPN / LVN': [['P.N.', 'LPN', '6 yrs skilled nursing'], ['E.V.', 'LVN', '4 yrs rehab'], ['C.H.', 'LPN', '3 yrs home health']],
      'Respiratory Therapist': [['B.F.', 'RRT', '8 yrs adult ICU vents'], ['Y.S.', 'RRT-NPS', '5 yrs NICU / peds'], ['G.L.', 'CRT', '3 yrs acute care']],
      'Behavioral Health': [['N.A.', 'Psych RN', '5 yrs inpatient psych'], ['H.D.', 'MHT', '4 yrs crisis unit'], ['F.Q.', 'LCSW', '6 yrs outpatient']]
    };
    var steps = ['Reading role, unit and shift requirements', 'Checking active licenses and certifications', 'Ranking by unit experience, availability and distance', 'Recruiter review queue ready'];
    function run() {
      var role = form.role.value, shift = form.shift.value;
      con.classList.add('scanning'); log.innerHTML = ''; out.innerHTML = '';
      var btn = $('button', form); btn.disabled = true;
      var i = 0, delay = reduce ? 0 : 520;
      (function next() {
        if (i < steps.length) {
          var li = document.createElement('li'); li.textContent = steps[i];
          log.innerHTML = ''; log.appendChild(li);
          setTimeout(function () { li.className = 'done'; i++; next(); }, delay);
          return;
        }
        con.classList.remove('scanning'); btn.disabled = false;
        log.innerHTML = '<li class="done">3 sample matches for ' + esc(role) + ', ' + esc(shift.toLowerCase()) + '</li>';
        var base = [96, 92, 88];
        (pool[role] || pool['RN — ICU']).forEach(function (p, k) {
          var d = document.createElement('div'); d.className = 'match';
          d.innerHTML = '<div class="avatar" aria-hidden="true">' + p[0].replace(/\./g, '') + '</div><div><b>' + p[0] + ' ' + p[1] + '</b><span>' + p[2] + ', available ' + esc(shift.toLowerCase()) + '</span></div><div class="score">' + (base[k] - Math.floor(Math.random() * 3)) + '%<small>fit</small></div>';
          out.appendChild(d);
          setTimeout(function () { d.classList.add('show'); }, reduce ? 0 : 120 * (k + 1));
        });
      })();
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    run();
  }

  /* ---- Jobs: filters + natural-language search ---- */
  var jobList = $('.job-list');
  if (jobList) {
    var jobs = $$('.job', jobList), count = $('#count'), empty = $('.empty'), q = $('#job-q'), parsed = $('.parsed');
    var state = { type: 'All', terms: [], shift: null };
    var TYPES = { 'per diem': 'Per Diem', 'perdiem': 'Per Diem', 'prn': 'Per Diem', 'contract': 'Contract', 'travel': 'Travel', 'traveler': 'Travel', 'permanent': 'Permanent', 'perm': 'Permanent', 'full-time': 'Permanent', 'full time': 'Permanent' };
    var SHIFTS = { 'night': 'Nights', 'nights': 'Nights', 'day': 'Days', 'days': 'Days', 'evening': 'Evenings', 'evenings': 'Evenings', 'flexible': 'Flexible' };
    var STOP = ['a', 'an', 'the', 'in', 'job', 'jobs', 'role', 'roles', 'for', 'near', 'me', 'shift', 'shifts', 'looking', 'i', 'am', 'want', 'with', 'and', 'or', 'nurse', 'position', 'positions', 'work', 'hr', 'hour'];
    var ALIAS = { er: 'emergency', ed: 'emergency', icu: 'icu', rt: 'respiratory', psych: 'psychiatric', 'mental': 'psychiatric', cna: 'nursing assistant', lpn: 'practical', lvn: 'practical', hha: 'home health', 'surg': 'surgical', 'or': 'surgical' };
    function apply() {
      var n = 0;
      jobs.forEach(function (j) {
        var text = j.textContent.toLowerCase();
        var ok = (state.type === 'All' || j.getAttribute('data-type') === state.type) &&
          (!state.shift || text.indexOf(state.shift.toLowerCase()) > -1 || j.getAttribute('data-shift') === state.shift) &&
          state.terms.every(function (t) { return text.indexOf(t) > -1; });
        j.hidden = !ok; j.classList.toggle('ranked', ok && (state.terms.length > 0 || !!state.shift)); if (ok) n++;
      });
      $$('.flt').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === state.type ? 'true' : 'false'); });
      count.textContent = n + (n === 1 ? ' open role' : ' open roles');
      empty.style.display = n ? 'none' : 'block';
    }
    function parse(raw) {
      var s = ' ' + raw.toLowerCase().replace(/[^\w\s-]/g, ' ') + ' ', chips = [];
      state.type = 'All'; state.shift = null; state.terms = [];
      Object.keys(TYPES).forEach(function (k) { if (s.indexOf(' ' + k + ' ') > -1) { state.type = TYPES[k]; s = s.replace(' ' + k + ' ', ' '); } });
      Object.keys(SHIFTS).forEach(function (k) { if (s.indexOf(' ' + k + ' ') > -1) { state.shift = SHIFTS[k]; s = s.replace(' ' + k + ' ', ' '); } });
      s.split(/\s+/).forEach(function (w) {
        if (!w || STOP.indexOf(w) > -1) return;
        if (/^(rn|registered)$/.test(w)) { state.terms.push('registered nurse'); return; }
        state.terms.push(ALIAS[w] || w);
      });
      if (state.type !== 'All') chips.push('Type: ' + state.type);
      if (state.shift) chips.push('Shift: ' + state.shift);
      state.terms.forEach(function (t) { chips.push('“' + t + '”'); });
      parsed.innerHTML = chips.length ? 'Understood as: ' + chips.map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join('') : '';
      apply();
    }
    $$('.flt').forEach(function (b) { b.addEventListener('click', function () { state.type = b.getAttribute('data-f'); apply(); }); });
    $('#job-search').addEventListener('submit', function (e) { e.preventDefault(); parse(q.value); });
    $$('.try button').forEach(function (b) { b.addEventListener('click', function () { q.value = b.textContent; parse(q.value); }); });
    var pre = new URLSearchParams(location.search).get('q'); if (pre) { q.value = pre; parse(pre); } else apply();
  }

  /* ---- Contact tabs ---- */
  var tabs = $$('.tab');
  if (tabs.length) {
    var show = function (k) {
      tabs.forEach(function (t) { t.setAttribute('aria-pressed', t.getAttribute('data-t') === k ? 'true' : 'false'); });
      $('#p-facility').hidden = k !== 'facility'; $('#p-clinician').hidden = k !== 'clinician';
    };
    tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.getAttribute('data-t')); }); });
    if (location.hash === '#apply') show('clinician');
    var role = new URLSearchParams(location.search).get('role');
    if (role && $('#c-spec')) { show('clinician'); $('#c-spec').value = role; }
    /* Write-assist: turns quick picks into a clear shift request */
    var wa = $('#write-assist');
    if (wa) wa.addEventListener('click', function () {
      var f = wa.form, role = f.role_needed.value, type = f.staffing_type.value.toLowerCase(), box = f.details;
      var draft = 'We need ' + role + ' coverage (' + type + ').\nUnit / department: \nShift(s) and hours: \nStart date: \nNumber of clinicians: \nRequired certifications (e.g. BLS, ACLS): \nEMR system: \nParking / check-in notes: ';
      box.value = box.value ? box.value + '\n\n' + draft : draft; box.focus();
    });
  }

  /* ---- Assistant (automated FAQ helper) ---- */
  var fab = $('.assist-fab'), panel = $('.assist');
  if (fab && panel) {
    var logEl = $('.assist-log', panel), input = $('input', panel);
    var tel = SLT.phoneTel ? '<a href="tel:' + SLT.phoneTel + '">' + esc(SLT.phone) + '</a>' : 'our 24/7 staffing desk';
    var KB = [
      { k: ['urgent', 'tonight', 'today', 'asap', 'call off', 'call-off', 'short', 'emergency', 'now'], a: 'For a shift in the next 24 hours, call ' + tel + ' — the desk is staffed 24/7 and can confirm clinicians by phone. You can also <a href="' + L.contact + '">send a staffing request</a>.' },
      { k: ['request', 'need staff', 'hire', 'facility', 'hospital', 'coverage', 'fill'], a: 'Facilities can <a href="' + L.contact + '">request staff online</a> with the role, unit, shift and start date. An account manager confirms availability and sends profiles for your approval. More on <a href="' + L.facilities + '">how we work with facilities</a>.' },
      { k: ['rate', 'cost', 'price', 'bill', 'pricing', 'fee'], a: 'Bill rates depend on role, shift, location and assignment length. We quote transparently, with no long-term commitment. <a href="' + L.contact + '">Request a quote</a>.' },
      { k: ['job', 'work', 'apply', 'position', 'opening', 'career', 'resume'], a: 'You can <a href="' + L.jobs + '">search open roles</a> in plain language — try "night ICU per diem". Or <a href="' + L.contact + '#apply">send your resume</a> and a specialty recruiter follows up within one business day.' },
      { k: ['pay', 'salary', 'weekly', 'benefit', 'bonus', 'referral', 'paid'], a: 'Clinicians are paid weekly as W-2 employees. Pay depends on specialty, shift and location; each listing shows the rate, and your recruiter can walk you through benefits and the referral bonus. See <a href="' + L.clinicians + '">working with us</a>.' },
      { k: ['travel', 'housing', 'stipend', 'assignment', '13 week', '13-week'], a: 'Travel and local contracts typically run 8 to 26 weeks. Your recruiter covers housing options, stipends and extensions. <a href="' + L.jobs + '?q=travel">See travel roles</a>.' },
      { k: ['credential', 'license', 'compliance', 'background', 'drug', 'verify', 'immuniz', 'tb'], a: 'Every clinician is verified before a first shift: primary-source license checks, background and drug screening, immunizations and TB, skills checklists, competency testing and references. Expirations are tracked automatically. <a href="' + L.ai + '">How our credential tracking works</a>.' },
      { k: ['ai', 'match', 'algorithm', 'technology', 'automat', 'artificial'], a: 'Our matching tools rank clinicians by license, unit experience, availability and distance, then a recruiter reviews every match before it reaches you. <a href="' + L.ai + '">Read how it works</a>.' },
      { k: ['specialt', 'icu', 'er ', 'rn', 'lpn', 'cna', 'allied', 'therap', 'psych', 'behavioral', 'np', 'pa'], a: 'We staff RNs (ICU, ER, Med-Surg, Tele, OR, L&D, NICU and more), LPN/LVNs, CNAs and PCTs, allied health, therapy, behavioral health, advanced practice and pharmacy. <a href="' + L.home + '#specialties">See all specialties</a>.' },
      { k: ['vms', 'msp', 'vendor', 'supplier'], a: 'Yes, we participate as a supplier in MSP and VMS programs and provide clean compliance reporting. <a href="' + L.facilities + '">Facility details</a>.' },
      { k: ['contact', 'email', 'phone', 'address', 'office', 'talk', 'human', 'person', 'recruiter'], a: 'Call ' + tel + ' any time, or email <a href="mailto:' + SLT.email + '">' + esc(SLT.email) + '</a>. You can also use the <a href="' + L.contact + '">contact page</a>.' }
    ];
    function say(html, who) {
      var m = document.createElement('div'); m.className = 'msg ' + who; m.innerHTML = html;
      logEl.appendChild(m); logEl.scrollTop = logEl.scrollHeight; return m;
    }
    function answer(text) {
      var t = ' ' + text.toLowerCase() + ' ', best = null, hits = 0;
      KB.forEach(function (e) { var h = e.k.filter(function (k) { return t.indexOf(k) > -1; }).length; if (h > hits) { hits = h; best = e; } });
      var typing = say('Thinking…', 'bot typing');
      setTimeout(function () {
        typing.classList.remove('typing');
        typing.innerHTML = best ? best.a : 'I can help with staffing requests, open jobs, pay, credentialing and travel assignments. For anything else, a person can help at ' + tel + ' or on the <a href="' + L.contact + '">contact page</a>.';
        logEl.scrollTop = logEl.scrollHeight;
      }, reduce ? 0 : 650);
    }
    function ask(text) { if (!text.trim()) return; say(esc(text), 'me'); answer(text); }
    fab.addEventListener('click', function () {
      var open = panel.classList.toggle('open'); fab.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && !logEl.children.length) say('Hi, I’m the Save Life Talent assistant. Ask about staffing a shift, open jobs, pay or credentialing.', 'bot');
      if (open) input.focus();
    });
    $('.assist-head button', panel).addEventListener('click', function () { panel.classList.remove('open'); fab.setAttribute('aria-expanded', 'false'); fab.focus(); });
    $('form', panel).addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); input.value = ''; });
    $$('.quick button', panel).forEach(function (b) { b.addEventListener('click', function () { ask(b.textContent); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) { panel.classList.remove('open'); fab.focus(); } });
  }
})();
