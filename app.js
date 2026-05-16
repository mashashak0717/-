var S = { person: null, report: null, scene: null, texts: null };

function showView(id) {
  document.querySelectorAll('.view').forEach(function (v) { v.classList.add('hidden'); });
  var el = document.getElementById('view-' + id);
  if (el) el.classList.remove('hidden');
  window.scrollTo(0, 0);
  setTimeout(function () { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
}

var _toastTimer;
function showToast(msg, type) {
  var t = document.getElementById('toast');
  clearTimeout(_toastTimer);
  t.textContent = msg;
  t.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl shadow-lg text-sm font-medium';
  if (type === 'success') t.classList.add('bg-emerald-500', 'text-white');
  else if (type === 'error') t.classList.add('bg-red-500', 'text-white');
  else t.classList.add('bg-orange-100', 'text-orange-700');
  t.classList.remove('hidden');
  _toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 2500);
}

var _confirmResolve = null;
function showConfirm(msg) {
  return new Promise(function (resolve) {
    _confirmResolve = resolve;
    document.getElementById('confirm-msg').textContent = msg;
    document.getElementById('confirm-modal').classList.remove('hidden');
  });
}
function _hideConfirm(result) {
  document.getElementById('confirm-modal').classList.add('hidden');
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
}
document.getElementById('confirm-cancel').addEventListener('click', function () { _hideConfirm(false); });
document.getElementById('confirm-ok').addEventListener('click', function () { _hideConfirm(true); });

function loadPeople() {
  try { return JSON.parse(localStorage.getItem('social_people') || '[]'); }
  catch (e) { return []; }
}
function savePeople(people) {
  try { localStorage.setItem('social_people', JSON.stringify(people)); }
  catch (e) { showToast('保存失败，请检查存储空间', 'error'); }
}
function saveCurrentPerson() {
  if (!S.person || !S.report) return;
  var people = loadPeople();
  var idx = people.findIndex(function (p) { return p.name === S.person.name && p.gender === S.person.gender; });
  var entry = { name: S.person.name, gender: S.person.gender, zodiac: S.person.zodiac, mbti: S.person.mbti, report: S.report, savedAt: Date.now() };
  if (idx >= 0) people[idx] = entry; else people.push(entry);
  savePeople(people);
  showToast('画像已保存', 'success');
}

function buildReportPrompt(person) {
  var p = [
    '用简洁口语化风格回答，你是顶级社交行为分析师。请基于以下信息生成一份社交画像报告：',
    '昵称：ta（' + person.gender + '）',
    '星座：' + (person.zodiac || '未知'),
    'MBTI：' + (person.mbti || '未知'),
    '',
    '直接输出JSON不要markdown不要解释不要思考过程：',
    '{"modules":[',
    '  {"title":"社交风格","sections":[{"icon":"sparkles","subtitle":"第一印象","content":"70字以上"},{"icon":"message-circle","subtitle":"沟通密码","content":"70字以上"},{"icon":"users","subtitle":"群体角色","content":"70字以上"}]},',
    '  {"title":"兴趣地图","sections":[{"icon":"compass","subtitle":"天生引力","content":"70字以上"},{"icon":"lightbulb","subtitle":"隐藏热情","content":"70字以上"},{"icon":"zap","subtitle":"能量来源","content":"70字以上"}]},',
    '  {"title":"隐藏一面","sections":[{"icon":"eye","subtitle":"外壳之下","content":"70字以上"},{"icon":"heart","subtitle":"柔软地带","content":"70字以上"},{"icon":"moon","subtitle":"独处时刻","content":"70字以上"}]},',
    '  {"title":"相处建议","sections":[{"icon":"heart-handshake","subtitle":"解锁密码","content":"70字以上"},{"icon":"thumbs-up","subtitle":"加分清单","content":"70字以上"},{"icon":"shield-off","subtitle":"避雷指南","content":"70字以上"}]}',
    ']}',
    '',
    '要求：每模块150-200字，口语化简洁。结合星座和MBTI深入分析，语言活泼有趣一针见血。分析对象用"ta"代称。禁止出现MBTI类型名称和星座名称，只描述性格特征。语气轻松接地气像朋友聊天，禁止文艺腔。每段不超过3句话，用换行分段。直接输出JSON不要markdown不要解释不要思考过程。'
  ];
  return p.join('\n');
}

function buildCopyPrompt(person, scene) {
  var p = [
    '你是顶级社交文案专家。请基于以下信息生成聊天文案：',
    '昵称：ta（' + person.gender + '）',
    '星座：' + (person.zodiac || '未知'),
    'MBTI：' + (person.mbti || '未知'),
    '关系：' + scene.relationship,
    '年龄段：' + scene.age,
    '场景：' + scene.scene
  ];
  if (scene.holiday) p.push('节日：' + scene.holiday);
  if (scene.scene === '找话题') {
    p.push('', '生成6个可以直接复制发送给对方的聊天消息。前3个基于兴趣：从画像的兴趣中选一个具体的点，写出一条可以直接发出去的消息，例如\'最近刷到一个XX的视频超好笑，你看了吗哈哈哈\'这种。后3个基于热门事件：写死演唱会/市集/音乐节相关，也是可以直接发的消息，例如\'XX音乐节你看阵容了吗，要不要一起去\'。每条50-100字，口语化，像真的在微信聊天。返回JSON：[{type:\'兴趣话题\'或\'热门话题\',title:\'话题名\',content:\'可直接发送的消息\'}]');
  } else if (scene.scene === '表白' || scene.scene === '分手') {
    p.push('', '请返回JSON数组（不要markdown代码块）：', '[{"content":"100-300字文案，含\\n分段"},...共6个]');
  } else if (scene.scene === '节日祝福') {
    p.push('', '请返回JSON数组（不要markdown代码块）：', '[{"content":"50-100字文案"},...共6个]');
  }
  p.push('', '直接输出JSON不要任何多余内容，不要解释，不要markdown。直接生成，不要思考过程。要求：结合星座/MBTI/关系/年龄/场景生成差异化内容，温暖走心。对象用"ta"代称。禁止出现MBTI类型名称和星座名称，只描述性格特征。语气轻松接地气像朋友聊天，禁止文艺腔。每段不超过3句话，用换行分段。');
  return p.join('\n');
}

async function fetchAIResult(type, context) {
  var sysPrompt, prompt;
  if (type === 'report') {
    sysPrompt = '你是社交画像分析专家。直接输出JSON，不要解释，不要markdown。';
    prompt = buildReportPrompt(context);
  } else {
    sysPrompt = '你是文案生成专家。直接输出JSON，不要解释，不要markdown，直接生成不要思考过程。';
    prompt = buildCopyPrompt(context.person, context.scene);
  }
  try {
    console.log('发送prompt:', prompt.substring(0, 100));
    var res = await fetch('https://alert-harmony-production-8886.up.railway.app/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: type === 'copy' ? 1500 : 3000,
        stream: false
      })
    });
    var data = await res.json();
    var raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
      ? data.choices[0].message.content.trim()
      : '';
    console.log('API原始返回:', raw);
    raw = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    if (raw.endsWith('}') || raw.endsWith(']')) return JSON.parse(raw);
    var lastBrace = raw.lastIndexOf('}');
    if (lastBrace >= 0) {
      var head = raw.substring(0, lastBrace + 1);
      var depth = 0, inStr = false, esc = false;
      for (var i = 0; i < head.length; i++) {
        var ch = head[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{' || ch === '[') depth++;
        else if (ch === '}' || ch === ']') depth--;
      }
      for (var j = 0; j < depth; j++) head += '}';
      raw = head;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('API错误详情:', e);
    return null;
  }
}

function animateProgressTo(targetPct, duration) {
  return new Promise(function (resolve) {
    var bar = document.getElementById('v2-bar');
    var cat = document.getElementById('v2-cat');
    var pctEl = document.getElementById('v2-pct');
    var container = document.getElementById('v2-bar-wrap');
    var fromPct = parseFloat(bar.style.width) || 0;
    var range = targetPct - fromPct;
    var start = performance.now();
    function tick(now) {
      var p = Math.min((now - start) / duration, 1);
      var pct = fromPct + range * p;
      bar.style.width = pct + '%';
      pctEl.textContent = Math.round(pct) + '%';
      var maxLeft = container.offsetWidth - 32;
      cat.style.left = ((pct / 100) * maxLeft) + 'px';
      if (p < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}

function renderV0() {
  var list = document.getElementById('v0-list');
  var empty = document.getElementById('v0-empty');
  var people = loadPeople();
  if (people.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  list.innerHTML = people.map(function (p, i) {
    return '<div class="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-4 flex items-center justify-between">'
      + '<div><p class="font-bold text-gray-800">' + p.name + ' <span class="text-xs text-gray-400 ml-1">' + p.gender + '</span></p>'
      + '<p class="text-xs text-gray-400 mt-0.5">' + (p.zodiac || '-') + ' · ' + (p.mbti || '-') + '</p></div>'
      + '<div class="flex gap-2">'
      + '<button data-v0-view="' + i + '" class="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-500 text-xs font-medium hover:bg-orange-100 transition">查看社交画像</button>'
      + '<button data-v0-del="' + i + '" class="px-3 py-1.5 rounded-lg bg-red-50 text-red-400 text-xs font-medium hover:bg-red-100 transition">删除</button>'
      + '</div></div>';
  }).join('');
  list.querySelectorAll('[data-v0-view]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var p = loadPeople()[parseInt(btn.dataset.v0View)];
      if (p) viewReport(p);
    });
  });
  list.querySelectorAll('[data-v0-del]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = parseInt(btn.dataset.v0Del);
      var p = loadPeople()[idx];
      showConfirm('确定要删除「' + (p ? p.name : '该人物') + '」的画像吗？删除后不可恢复。').then(function (ok) {
        if (ok) {
          var people = loadPeople();
          people.splice(idx, 1);
          savePeople(people);
          renderV0();
          showToast('已删除', 'success');
        }
      });
    });
  });
  setTimeout(function () { lucide.createIcons(); }, 50);
}

function renderV3(report, person) {
  if (!report || !report.modules) { alert('画像生成失败，请重试'); showView('v1'); return; }
  document.getElementById('v3-title').textContent = person.name + ' 的社交画像';
  var modules = report.modules || [];
  document.getElementById('v3-modules').innerHTML = modules.map(function (mod, mi) {
    var sectionsHtml = mod.sections.map(function (sec, si) {
      return '<div class="flex gap-3 p-3' + (si > 0 ? ' border-t border-gray-100' : '') + '">'
        + '<i data-lucide="' + sec.icon + '" class="w-4 h-4 text-orange-400 mt-0.5 shrink-0"></i>'
        + '<div><p class="text-sm font-medium text-gray-700 mb-1">' + sec.subtitle + '</p>'
        + '<p class="text-sm text-gray-600 leading-relaxed">' + (sec.content || "").replace(/[^\u0000-\uFFFF]/g,"") + '</p></div>'
        + '</div>';
    }).join('');
    return '<div class="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden">'
      + '<div class="flex items-center justify-between p-4 cursor-pointer hover:bg-white/50 transition" data-toggle-module="' + mi + '">'
      + '<div class="flex items-center gap-3">'
      + '<i data-lucide="' + (mod.sections[0] ? mod.sections[0].icon : 'sparkles') + '" class="w-5 h-5 text-orange-400"></i>'
      + '<h3 class="font-bold text-lg md:text-xl bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">' + mod.title + '</h3>'
      + '</div>'
      + '<i data-lucide="chevron-down" class="w-5 h-5 text-gray-400 transition-transform duration-300" data-chevron="' + mi + '" style="transform:rotate(180deg)"></i>'
      + '</div>'
      + '<div data-module-content="' + mi + '">' + sectionsHtml + '</div>'
      + '</div>';
  }).join('');
  document.querySelectorAll('[data-toggle-module]').forEach(function (el) {
    el.addEventListener('click', function () {
      var i = el.dataset.toggleModule;
      var content = document.querySelector('[data-module-content="' + i + '"]');
      var chevron = document.querySelector('[data-chevron="' + i + '"]');
      content.classList.toggle('hidden');
      if (content.classList.contains('hidden')) chevron.style.transform = 'rotate(0deg)';
      else chevron.style.transform = 'rotate(180deg)';
    });
  });
  setTimeout(function () { lucide.createIcons(); }, 50);
}

function renderV5(texts, scene) {
  document.getElementById('v5-title').textContent = scene;
  var p = S.person;
  var sub = '推理依据：' + (p.zodiac || '?') + ' + ' + (p.mbti || '?') + ' + ' + S.scene.relationship + ' + ' + S.scene.age + ' + ' + S.scene.scene;
  if (S.scene.holiday) sub += ' · ' + S.scene.holiday;
  document.getElementById('v5-subtitle').textContent = sub;
  document.getElementById('v5-cards').innerHTML = texts.map(function (t, i) {
    var typeBadge = t.type ? '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium ' + (t.type === '兴趣话题' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600') + ' mb-2">' + t.type + '</span>' : '';
    var titleHtml = t.title ? '<p class="text-sm font-bold text-gray-800 mb-1">' + t.title + '</p>' : '';
    return '<div class="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-4 relative group">'
      + typeBadge
      + titleHtml
      + '<p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line pr-8">' + (t.content || '').replace(/[^\u0000-\uFFFF]/g,"") + '</p>'
      + '<button data-copy="' + i + '" class="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-100 hover:bg-orange-100 text-gray-400 hover:text-orange-500 transition" title="一键复制">'
      + '<i data-lucide="clipboard" class="w-4 h-4"></i>'
      + '</button>'
      + '</div>';
  }).join('');
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var txt = texts[parseInt(btn.dataset.copy)];
      var str = txt.content || '';
      navigator.clipboard.writeText(str).then(function () { showToast('已复制', 'success'); }).catch(function () { showToast('复制失败', 'error'); });
    });
  });
  setTimeout(function () { lucide.createIcons(); }, 50);
}

function viewReport(personData) {
  S.person = personData;
  if (personData.report) {
    S.report = personData.report;
    renderV3(personData.report, personData);
    showView('v3');
  } else {
    showView('v2');
    document.getElementById('v2-bar').style.width = '0%';
    document.getElementById('v2-pct').textContent = '0%';
    document.getElementById('v2-cat').style.left = '0px';
    document.querySelector('#view-v2 p.text-xs').textContent = '正在分析社交画像...';
    var apiCall = fetchAIResult('report', personData);
    animateProgressTo(60, 3000).then(function() { return apiCall; }).then(function(result) {
      S.report = result;
      return animateProgressTo(100, 300);
    }).then(function() {
      renderV3(S.report, personData);
      showView('v3');
    });
  }
}

document.getElementById('v1-submit').addEventListener('click', function () {
  var name = document.getElementById('v1-name').value.trim();
  if (!name) return showToast('请输入名字或昵称', 'warning');
  if (name.length > 10) return showToast('昵称不能超过10个字', 'warning');
  var gender = document.querySelector('input[name="gender"]:checked');
  if (!gender) return showToast('请选择性别', 'warning');
  var zodiac = document.getElementById('v1-zodiac').value;
  var mbti = document.getElementById('v1-mbti').value;
  if (!zodiac && !mbti) return showToast('星座和MBTI至少选一个哦～', 'warning');

  S.person = { name: name, gender: gender.value, zodiac: zodiac, mbti: mbti };
  var people = loadPeople();
  var idx = people.findIndex(function(p) { return p.name === name; });
  var entry = { name: name, gender: gender.value, zodiac: zodiac, mbti: mbti };
  if (idx >= 0) { entry.report = people[idx].report; people[idx] = entry; }
  else people.push(entry);
  savePeople(people);
  showView('v2');
  document.getElementById('v2-bar').style.width = '0%';
  document.getElementById('v2-pct').textContent = '0%';
  document.getElementById('v2-cat').style.left = '0px';
  document.querySelector('#view-v2 p.text-xs').textContent = '正在分析社交画像...';
  var apiCall = fetchAIResult('report', S.person);
  animateProgressTo(60, 3000).then(function() { return apiCall; }).then(function(result) {
    S.report = result;
    return animateProgressTo(100, 300);
  }).then(function() {
    renderV3(S.report, S.person);
    showView('v3');
  });
});

document.getElementById('v1-to-v0').addEventListener('click', function () { renderV0(); showView('v0'); });
document.getElementById('v0-back').addEventListener('click', function () { showView('v1'); });
document.getElementById('v3-to-v4').addEventListener('click', function () { showView('v4'); });
document.getElementById('v3-save').addEventListener('click', function () { saveCurrentPerson(); });
document.getElementById('v3-back-home').addEventListener('click', function () { showView('v1'); });
document.getElementById('v3-home').addEventListener('click', function () { showView('v1'); });

document.querySelectorAll('input[name="scene"]').forEach(function (r) {
  r.addEventListener('change', function () {
    var hg = document.getElementById('v4-holiday-group');
    if (r.value === '节日祝福') hg.classList.remove('hidden');
    else hg.classList.add('hidden');
  });
});

document.getElementById('v4-submit').addEventListener('click', function () {
  var rel = document.querySelector('input[name="relation"]:checked');
  if (!rel) return showToast('请选择关系', 'warning');
  var age = document.getElementById('v4-age').value;
  if (!age) return showToast('请选择年龄段', 'warning');
  var scene = document.querySelector('input[name="scene"]:checked');
  if (!scene) return showToast('请选择场景', 'warning');
  var holiday = null;
  if (scene.value === '节日祝福') {
    var h = document.querySelector('input[name="holiday"]:checked');
    if (!h) return showToast('请选择节日', 'warning');
    holiday = h.value;
  }
  S.scene = { relationship: rel.value, age: age, scene: scene.value, holiday: holiday };
  showView('v2');
  document.getElementById('v2-bar').style.width = '0%';
  document.getElementById('v2-pct').textContent = '0%';
  document.getElementById('v2-cat').style.left = '0px';
  document.querySelector('#view-v2 p.text-xs').textContent = '正在生成趣聊文案...';
  var apiCall = fetchAIResult('copy', { person: S.person, scene: S.scene });
  animateProgressTo(50, 2000).then(function() { return apiCall; }).then(function(texts) {
    S.texts = texts;
    return animateProgressTo(100, 300);
  }).then(function() {
    renderV5(S.texts, S.scene.scene);
    showView('v5');
  });
});

document.getElementById('v5-back').addEventListener('click', function () { showView('v4'); });
document.getElementById('v5-home').addEventListener('click', function () { showView('v1'); });
document.getElementById('v5-save').addEventListener('click', function () {
  try { localStorage.setItem('social_copy_texts', JSON.stringify({ texts: S.texts, scene: S.scene, person: S.person })); showToast('已保存', 'success'); }
  catch (e) { showToast('保存失败', 'error'); }
});
document.getElementById('v5-switch').addEventListener('click', function () { renderV0(); showView('v0'); });
lucide.createIcons();
