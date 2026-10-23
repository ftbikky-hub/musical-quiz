/** THEATRE NOTES: Googleカレンダー → 私の予定
 * サイトで発行したコードを、新しいApps Scriptプロジェクトのコード.gsへ貼る。
 * appsscript.jsonも案内どおり設定し、setupPersonalCalendarSyncを実行する。
 * Googleの予定は読み取りのみ。メール送信・Google側の予定の変更は行わない。
 */
var PLAN_CALENDAR_SYNC = /* THEATRE_NOTES_CONFIG */ null;
var PLAN_SYNC_HANDLER = 'syncPersonalCalendar';
var PLAN_SYNC_ENABLED = 'THEATRE_NOTES_PERSONAL_CALENDAR_ENABLED';

function setupPersonalCalendarSync() {
  return planSyncLock_(function () {
    planSyncValidate_();
    var result = planSyncRun_();
    var created = ScriptApp.newTrigger(PLAN_SYNC_HANDLER).timeBased().everyMinutes(15).create();
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (trigger.getHandlerFunction() === PLAN_SYNC_HANDLER && trigger.getUniqueId() !== created.getUniqueId()) ScriptApp.deleteTrigger(trigger);
    });
    PropertiesService.getUserProperties().setProperty(PLAN_SYNC_ENABLED, 'true');
    console.log('設定完了：初回同期が成功しました。今後は15分ごとを目安に自動更新します。');
    return result;
  });
}
function syncPersonalCalendar() {
  return planSyncLock_(function () {
    if (PropertiesService.getUserProperties().getProperty(PLAN_SYNC_ENABLED) !== 'true') throw new Error('先にsetupPersonalCalendarSyncを実行してください。');
    planSyncValidate_(); return planSyncRun_();
  });
}
function stopPersonalCalendarSync() { planSyncStop_(); console.log('このプロジェクトの観劇予定の自動更新を停止しました。'); }
function showPersonalCalendars() {
  CalendarApp.getAllCalendars().forEach(function (calendar) { console.log(calendar.getName() + ' : ' + calendar.getId()); });
}
function planSyncStop_() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) { if (trigger.getHandlerFunction() === PLAN_SYNC_HANDLER) ScriptApp.deleteTrigger(trigger); });
  PropertiesService.getUserProperties().setProperty(PLAN_SYNC_ENABLED, 'false');
}
function planSyncValidate_() {
  if (!PLAN_CALENDAR_SYNC || !/^[A-Za-z0-9_-]{43}$/.test(PLAN_CALENDAR_SYNC.token) || !/^https:\/\/[^/?#]+\/api\/plans\/calendar\/sync$/.test(PLAN_CALENDAR_SYNC.endpoint)) throw new Error('サイトの「自動更新を設定する」で発行したコードを貼り付けてください。');
  if (Session.getScriptTimeZone() !== 'Asia/Tokyo') throw new Error('appsscript.jsonを案内どおり設定し、タイムゾーンをAsia/Tokyoにしてください。');
}
function planSyncKind_(title) {
  if (/当落|抽選結果|結果発表/.test(title)) return 'result';
  if (/締め切り|締切|申込期限|申し込み期限/.test(title)) return 'deadline';
  if (/コンサート|concert|billboard|リサイタル|演奏会|ライブ|オーケストラ|交響楽|フィルハーモニー/i.test(title)) return 'concert';
  if (/観劇|劇団四季|ミュージカル|舞台|四季劇場|ノートルダム|ウィキッド|ライオンキング|アナと雪|アラジン|キャッツ|オペラ座|バック・トゥ・ザ/.test(title)) return 'theatre';
  return null;
}
function planSyncRun_() {
  var started = new Date(), today = Utilities.formatDate(started, 'Asia/Tokyo', 'yyyy-MM-dd');
  var fromDate = new Date(new Date(today + 'T00:00:00+09:00').getTime() - 86400000);
  var endDate = new Date(fromDate.getTime() + 731 * 86400000);
  var from = Utilities.formatDate(fromDate, 'Asia/Tokyo', 'yyyy-MM-dd');
  var through = Utilities.formatDate(new Date(endDate.getTime() - 86400000), 'Asia/Tokyo', 'yyyy-MM-dd');
  var calendar = PLAN_CALENDAR_SYNC.calendarId === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(PLAN_CALENDAR_SYNC.calendarId);
  if (!calendar) throw new Error('カレンダーを読み取れません。GoogleカレンダーのIDとアクセス権を確認してください。');
  var all = calendar.getEvents(fromDate, endDate);
  if (all.length > 2000) throw new Error('予定が2,000件を超えています。観劇専用のカレンダーを指定してください。今回の同期は行いません。');
  var events = [], recurring = 0, seen = {};
  all.forEach(function (event) {
    if (event.isRecurringEvent()) { recurring++; return; }
    var title = event.getTitle(), venue = event.getLocation() || '', kind = planSyncKind_(title + ' ' + venue);
    if (PLAN_CALENDAR_SYNC.mode === 'keywords' && !kind) return;
    var allDay = event.isAllDayEvent();
    var start = allDay ? event.getAllDayStartDate() : event.getStartTime();
    var end = allDay ? event.getAllDayEndDate() : event.getEndTime();
    var date = Utilities.formatDate(start, 'Asia/Tokyo', 'yyyy-MM-dd');
    if (date < from || date > through) return;
    var uid = 'ical:' + event.getId();
    if (seen[uid]) throw new Error('同じ予定IDが複数あります。今回の同期は行いません。');
    seen[uid] = true;
    var time = allDay ? null : Utilities.formatDate(start, 'Asia/Tokyo', 'HH:mm');
    var finalDay = allDay ? new Date(end.getTime() - 86400000) : end;
    var endDay = Utilities.formatDate(finalDay, 'Asia/Tokyo', 'yyyy-MM-dd');
    var endTime = allDay ? null : Utilities.formatDate(end, 'Asia/Tokyo', 'HH:mm');
    if (!allDay && date === endDay && time === endTime) { endDay = null; endTime = null; }
    events.push({ title: title, venue: venue, date: date, time: time, end_date: endDay, end_time: endTime, memo: event.getDescription() || '', url: '', source_uid: uid });
  });
  if (events.length > 500) throw new Error('対象の予定が500件を超えています。今回の同期は行いません。');
  var response = UrlFetchApp.fetch(PLAN_CALENDAR_SYNC.endpoint, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, followRedirects: false,
    headers: { Authorization: 'Bearer ' + PLAN_CALENDAR_SYNC.token },
    payload: JSON.stringify({ version: 1, calendarId: PLAN_CALENDAR_SYNC.calendarId, startedAt: started.toISOString(), from: from, through: through, complete: true, events: events })
  });
  var code = response.getResponseCode();
  if (code === 401) { planSyncStop_(); throw new Error('接続が停止中、または期限切れです。サイトでコードを作り直してください。定期実行を停止しました。'); }
  if (code !== 200) throw new Error('サイトへの同期に失敗しました（HTTP ' + code + '）。今回の変更は反映されていません。実行ログとサイトの接続設定を確認してください。');
  var result = JSON.parse(response.getContentText());
  console.log('同期完了：追加 ' + (result.added || 0) + '件、更新 ' + (result.updated || 0) + '件、対象外・削除 ' + (result.cancelled || 0) + '件。繰り返し予定は対象外 ' + recurring + '件。');
  return result;
}
function planSyncLock_(fn) {
  var lock = LockService.getUserLock(); if (!lock.tryLock(10000)) throw new Error('別の自動更新が実行中です。少し待って再実行してください。');
  try { return fn(); } finally { lock.releaseLock(); }
}
