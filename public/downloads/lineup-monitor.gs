/**
 * THEATRE NOTES — 劇団四季の公式ラインアップ変更通知
 * 1. Google Apps Scriptの新規プロジェクトにこのファイルを貼り付ける。
 * 2. setupLineupNotifications を実行し、Googleの権限画面で許可する。
 * 初回は現在の公式情報を基準として保存し、設定確認メールを自分に送信する。
 * 以後は毎日9〜10時頃（日本時間）、画像の内容・注記が変わったときだけ通知。
 * 公演データの自動書き換えや、画像のOCR/AI解釈は行わない。
 * Gmailの受信箱を読む権限・外部サービスのAPIキー・DBは不要。
 */
var LINEUP_CONFIG = Object.freeze({
  source: 'https://www.shiki.jp/special/lineup/',
  stateKey: 'THEATRE_NOTES_LINEUP_MONITOR_V1',
  handler: 'checkLineupNotifications',
  timezone: 'Asia/Tokyo',
  hour: 9
});

/** 初回設定 / 再開。初回のテストメールと定期実行の登録まで行う。 */
function setupLineupNotifications() {
  return withLineupLock_(function () {
    var props = PropertiesService.getUserProperties();
    var previous = readLineupState_(props);
    var recipient = lineupRecipient_();
    var current = fetchLineupSnapshot_();
    var now = new Date().toISOString();
    if (!previous) {
      sendLineupMail_(recipient, '【THEATRE NOTES】上演予定お知らせの送信テスト',
        '初回の送信テストです。このメールだけでは定期実行の設定完了ではありません。\n' +
        'Apps Scriptの実行ログにも「設定完了」が出たことをご確認ください。\n\n現在の公式ページを基準として保存します。\n' +
        '毎日9〜10時頃（日本時間）に公式の表画像と注記を確認し、変更時だけこのアドレスへお知らせします。\n' +
        '初回は変更前の比較対象がないため、公演内容の変更通知ではありません。\n\n' +
        '公演データの自動更新・画像のAI読み取りは行いません。\n公式：' + LINEUP_CONFIG.source);
      previous = { version: 1, enabled: false, snapshot: current, lastNotified: null, lastSuccess: now };
      saveLineupState_(props, previous);
    } else if (previous.snapshot.fingerprint !== current.fingerprint) {
      notifyLineupChange_(recipient, previous.snapshot, current);
      previous.snapshot = current;
      previous.lastNotified = now;
      saveLineupState_(props, previous);
    }
    // 新しいトリガーを作れてから、この利用者の旧トリガーだけを消す。
    var created = ScriptApp.newTrigger(LINEUP_CONFIG.handler).timeBased()
      .atHour(LINEUP_CONFIG.hour).everyDays(1).inTimezone(LINEUP_CONFIG.timezone).create();
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (trigger.getHandlerFunction() === LINEUP_CONFIG.handler && trigger.getUniqueId() !== created.getUniqueId()) {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    previous.enabled = true;
    previous.lastAttempt = now;
    previous.lastSuccess = now;
    previous.lastError = null;
    previous.errorNotified = null;
    saveLineupState_(props, previous);
    console.log('設定完了：毎日9〜10時頃（日本時間）。初回の設定確認メールをご確認ください。');
    return '設定完了';
  });
}

/** 定期実行用。エディタで選んで実行すると、今すぐ確認できる。 */
function checkLineupNotifications() {
  return withLineupLock_(function () {
    var props = PropertiesService.getUserProperties();
    var state = readLineupState_(props);
    if (!state) throw new Error('先にsetupLineupNotificationsを実行してください。');
    if (!state.enabled) { console.log('通知は停止中です。'); return '停止中'; }
    var now = new Date().toISOString();
    state.lastAttempt = now;
    var current;
    try {
      current = fetchLineupSnapshot_();
    } catch (error) {
      var message = String(error && error.message || error).slice(0, 240);
      state.lastError = { at: now, message: message };
      // 同じ取得エラーは復旧まで一度だけ通知。比較基準は変更しない。
      if (state.errorNotified !== message) {
        try {
          sendLineupMail_(lineupRecipient_(), '【THEATRE NOTES】上演予定を確認できませんでした',
            '公式情報の取得・形式確認に失敗しました。上演予定の変更を確認できたという意味ではありません。\n' +
            '前回の比較基準とサイトの公演データは保持しています。次回も再試行します。\n\n' +
            '理由：' + message + '\n公式：' + LINEUP_CONFIG.source);
          state.errorNotified = message;
        } catch (mailError) {
          saveLineupState_(props, state);
          throw mailError;
        }
      }
      saveLineupState_(props, state);
      console.log('取得失敗。前回の情報を維持しました。');
      return '取得失敗';
    }
    state.lastSuccess = now;
    state.lastError = null;
    state.errorNotified = null;
    if (state.snapshot.fingerprint === current.fingerprint) {
      saveLineupState_(props, state);
      console.log('変更なし：通知メールは送信しません。');
      return '変更なし';
    }
    // 送信成功後にだけ比較基準を進める。失敗なら次回も同じ変更を再試行。
    try {
      notifyLineupChange_(lineupRecipient_(), state.snapshot, current);
    } catch (error) {
      state.lastError = { at: now, message: '変更通知メールの送信に失敗しました。比較基準は維持しています。' };
      saveLineupState_(props, state);
      throw error;
    }
    state.snapshot = current;
    state.lastNotified = now;
    saveLineupState_(props, state);
    console.log('公式の変更を通知しました。');
    return '変更を通知';
  });
}

/** 通知だけを止める。保存した比較基準は残す。再開はsetupを実行。 */
function stopLineupNotifications() {
  return withLineupLock_(function () {
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (trigger.getHandlerFunction() === LINEUP_CONFIG.handler) ScriptApp.deleteTrigger(trigger);
    });
    var props = PropertiesService.getUserProperties();
    var state = readLineupState_(props);
    if (state) { state.enabled = false; saveLineupState_(props, state); }
    console.log('通知を停止しました。');
    return '停止しました';
  });
}

/** エディタの実行ログに稼働状況を表示（メールアドレスは出力しない）。 */
function showLineupNotificationStatus() {
  var state = readLineupState_(PropertiesService.getUserProperties());
  var result = state ? {
    enabled: !!state.enabled, lastAttempt: state.lastAttempt || null,
    lastSuccess: state.lastSuccess || null, lastNotified: state.lastNotified || null,
    lastError: state.lastError || null
  } : { enabled: false, message: '未設定です。setupLineupNotificationsを実行してください。' };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function withLineupLock_(callback) {
  var lock = LockService.getUserLock();
  if (!lock.tryLock(10000)) return '別の確認処理が実行中です';
  try { return callback(); } finally { lock.releaseLock(); }
}
function lineupRecipient_() {
  var email = Session.getEffectiveUser().getEmail();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('実行者のメールアドレスを取得できません。自分のGoogleアカウントで実行してください。');
  }
  return email;
}
function readLineupState_(props) {
  var raw = props.getProperty(LINEUP_CONFIG.stateKey);
  if (!raw) return null;
  var state;
  try { state = JSON.parse(raw); } catch (_) { throw new Error('保存状態が壊れています。基準は自動リセットしません。'); }
  if (state.version !== 1 || !state.snapshot || !state.snapshot.fingerprint) throw new Error('保存状態の形式が不正です。');
  return state;
}
function saveLineupState_(props, state) {
  var raw = JSON.stringify(state);
  if (Utilities.newBlob(raw).getBytes().length > 8000) throw new Error('保存内容が上限を超えました。前回の基準を維持します。');
  props.setProperty(LINEUP_CONFIG.stateKey, raw);
}
function sendLineupMail_(recipient, subject, body) {
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('本日のメール送信枠がありません。次回に再試行します。');
  MailApp.sendEmail({ to: recipient, subject: subject, body: body, name: 'THEATRE NOTES' });
}
function fetchLineupSnapshot_() {
  var response = lineupFetch_(LINEUP_CONFIG.source);
  var html = response.getContentText('UTF-8');
  if (!/上演ラインアップ/.test(html)) throw new Error('公式ページの見出しを確認できません。');
  var parsed = parseLineupPage_(html);
  var images = parsed.images.map(function (image) {
    var imageResponse = lineupFetch_(image.url);
    var blob = imageResponse.getBlob();
    if (!/^image\/(png|jpeg|webp|gif)(?:;|$)/i.test(blob.getContentType()) || blob.getBytes().length < 100) {
      throw new Error('予定表' + image.id + 'を画像として取得できません。');
    }
    return { id: image.id, hash: lineupHash_(blob.getBytes()) };
  });
  var snapshot = { images: images, notes: parsed.notes, fingerprint: lineupHash_(JSON.stringify({ images: images, notes: parsed.notes })) };
  if (Utilities.newBlob(JSON.stringify(snapshot)).getBytes().length > 6500) throw new Error('公式情報が大きく変わったため、自動確認を保留しました。');
  return snapshot;
}
function lineupFetch_(url) {
  if (!/^https:\/\/www\.shiki\.jp\/(?:special\/lineup\/$|shared\/lineup\/output\/images\/lineup_\d+\.(?:png|jpe?g|webp|gif)(?:\?[^#]*)?$)/i.test(url)) {
    throw new Error('取得対象外のURLです。');
  }
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: false });
  if (response.getResponseCode() !== 200) throw new Error('公式情報の取得に失敗しました（HTTP ' + response.getResponseCode() + '）。');
  return response;
}
function lineupHash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value)
    .map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
function decodeLineupText_(value) {
  return value.replace(/&#(x[0-9a-f]+|\d+);/gi, function (_, n) {
    var code = n.charAt(0).toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }).replace(/&(amp|quot|apos|nbsp|lt|gt);/g, function (_, name) {
    return { amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>' }[name];
  });
}
/** 画像URLは発見用。比較はURLのver値ではなく、取得した画像バイトのハッシュで行う。 */
function parseLineupPage_(html) {
  var clean = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  var images = {};
  (clean.match(/<img\b[^>]*>/gi) || []).forEach(function (tag) {
    var attributes = tag.match(/(?:\bsrc|\bdata-src)\s*=\s*["'][^"']+["']/gi) || [];
    attributes.forEach(function (attribute) {
      var src = decodeLineupText_(attribute.replace(/^[^=]+=[\s]*["']|["']$/g, ''));
      if (src.indexOf('//') === 0) src = 'https:' + src;
      if (src.charAt(0) === '/') src = 'https://www.shiki.jp' + src;
      var match = src.match(/^https:\/\/www\.shiki\.jp\/shared\/lineup\/output\/images\/lineup_(\d+)\.(?:png|jpe?g|webp|gif)(?:\?[^#]*)?$/i);
      if (match && !images[match[1]]) images[match[1]] = { id: match[1], url: src };
    });
  });
  if (!images['1'] || !images['2'] || !images['3']) throw new Error('3地域の予定表画像を確認できません。公式ページの構成が変わった可能性があります。');
  var text = decodeLineupText_(clean.replace(/<br\b[^>]*>|<\/(?:p|li|div|section|h[1-6])\s*>/gi, '\n').replace(/<[^>]*>/g, ''));
  var first = text.indexOf('東京・舞浜・横浜'), last = text.indexOf('はじめての観劇', first);
  if (first < 0 || last < first) throw new Error('公式のラインアップ本文の範囲を確認できません。');
  var notes = text.slice(first, last).split(/\n/).map(function (line) { return line.replace(/\s+/g, ' ').trim(); })
    .filter(function (line) { return line.charAt(0) === '※'; });
  notes = Array.from(new Set(notes)).sort();
  if (notes.length < 3) throw new Error('公式の注記を十分に確認できません。前回の情報を維持します。');
  return { images: Object.keys(images).sort(function (a, b) { return Number(a) - Number(b); }).map(function (id) { return images[id]; }), notes: notes };
}
function notifyLineupChange_(recipient, before, current) {
  var labels = { '1': '東京・舞浜・横浜', '2': '名古屋・関西', '3': '全国各地' };
  var changes = [];
  current.images.forEach(function (image) {
    var old = before.images.find(function (item) { return item.id === image.id; });
    if (!old || old.hash !== image.hash) changes.push('・' + (labels[image.id] || '表' + image.id) + 'の予定表画像が変更されました。');
  });
  before.images.forEach(function (image) {
    if (!current.images.some(function (item) { return item.id === image.id; })) changes.push('・表' + image.id + 'が見つからなくなりました。公式でご確認ください。');
  });
  var added = current.notes.filter(function (note) { return before.notes.indexOf(note) < 0; });
  var removed = before.notes.filter(function (note) { return current.notes.indexOf(note) < 0; });
  if (added.length) changes.push('\n追加・変更された注記：\n' + added.join('\n'));
  if (removed.length) changes.push('\n削除・変更前の注記：\n' + removed.join('\n'));
  sendLineupMail_(recipient, '【THEATRE NOTES】公式の上演予定に変更がありました',
    '公式ラインアップの前回確認時からの変化を検知しました。\n\n' + changes.join('\n') +
    '\n\n画像の具体的な変更内容は自動で読み取っていません。日付確定や公演追加を断定するものではありません。\n' +
    'サイトの公演データはまだ更新していません。次の公式ページで内容をご確認ください。\n\n' + LINEUP_CONFIG.source);
}
