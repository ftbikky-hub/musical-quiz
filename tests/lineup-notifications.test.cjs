/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync('public/downloads/lineup-monitor.gs','utf8');
function html(version='1') {
  return `<html><head><title>上演ラインアップ</title></head><body><nav>ログイン</nav><main><h1>上演ラインアップ</h1><h2>東京・舞浜・横浜</h2>
    <img src="/shared/lineup/output/images/lineup_1.png?ver=${version}">
    <p>※横浜では2027年4〜8月の上演を予定しています。</p>
    <p>※東京では2027年5月からの上演を予定しています。</p>
    <h2>名古屋・関西</h2><img data-src="https://www.shiki.jp/shared/lineup/output/images/lineup_2.png?ver=${version}">
    <p>※京都では2027年4月からの上演を予定しています。</p>
    <h2>全国各地での公演</h2><img src="//www.shiki.jp/shared/lineup/output/images/lineup_3.png?ver=${version}">
    <h2>はじめての観劇Ｑ＆Ａ</h2></main><footer>footer</footer></body></html>`;
}
function harness() {
  const properties = new Map(), mails=[], triggers=[], logs=[];
  const env = { html: html(), images: {1:'a'.repeat(200),2:'b'.repeat(200),3:'c'.repeat(200)}, quota:100, fail:null, sendFailure:false, locked:false, triggerFailure:false, email:'owner@example.test' };
  let serial=0;
  // 実際のGoogle IDと同様、同じオブジェクトのIDは変えない。
  function newTrigger(handler){const id=String(++serial);return { getHandlerFunction:()=>handler, getUniqueId:()=>id };}
  const context={console:{log:(s)=>logs.push(s)},PropertiesService:{getUserProperties:()=>({getProperty:(k)=>properties.get(k)??null,setProperty:(k,v)=>properties.set(k,v)})},
    Session:{getEffectiveUser:()=>({getEmail:()=>env.email})},
    LockService:{getUserLock:()=>({tryLock:()=>!env.locked,releaseLock:()=>{}})},
    Utilities:{newBlob:(s)=>({getBytes:()=>[...Buffer.from(s)]}),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(typeof s==='string'?s:Buffer.from(s)).digest()]},
    MailApp:{getRemainingDailyQuota:()=>env.quota,sendEmail:(mail)=>{if(env.sendFailure)throw Error('mail unavailable');mails.push(mail);}},
    ScriptApp:{getProjectTriggers:()=>[...triggers],deleteTrigger:(t)=>triggers.splice(triggers.indexOf(t),1),newTrigger:(handler)=>{const builder={timeBased:()=>builder,atHour:(n)=>{assert.equal(n,9);return builder;},everyDays:(n)=>{assert.equal(n,1);return builder;},inTimezone:(s)=>{assert.equal(s,'Asia/Tokyo');return builder;},create:()=>{if(env.triggerFailure)throw Error('trigger unavailable');const t=newTrigger(handler);triggers.push(t);return t;}};return builder;}},
    UrlFetchApp:{fetch:(url,options)=>{assert.equal(options.followRedirects,false);const id=url.match(/lineup_(\d+)/)?.[1];return {getResponseCode:()=>env.fail===id?503:200,getContentText:()=>env.html,getBlob:()=>({getContentType:()=>id?'image/png':'text/html',getBytes:()=>[...Buffer.from(env.images[id]??'')]})};}},
  };
  vm.createContext(context);vm.runInContext(source,context);
  const state=()=>JSON.parse(properties.get(context.LINEUP_CONFIG.stateKey));
  return {context,env,mails,triggers,logs,state,properties};
}

test('initial setup sends one self-addressed test and installs one daily JST trigger; repeated setup is idempotent',()=>{
  const h=harness();h.context.setupLineupNotifications();
  assert.equal(h.mails.length,1);assert.equal(h.mails[0].to,'owner@example.test');assert.match(h.mails[0].subject,/送信テスト/);
  assert.equal(h.triggers.length,1);assert.equal(h.state().enabled,true);
  h.context.setupLineupNotifications();assert.equal(h.mails.length,1);assert.equal(h.triggers.length,1);
});
test('identical content ignores URL version, whitespace and unrelated footer changes; actual image changes notify once',()=>{
  const h=harness();h.context.setupLineupNotifications();const before=h.state().snapshot.fingerprint;
  h.env.html=html('new').replace('<p>※','<p>\n  ※').replace('footer','unrelated footer changed');
  assert.equal(h.context.checkLineupNotifications(),'変更なし');assert.equal(h.mails.length,1);assert.equal(h.state().snapshot.fingerprint,before);
  h.env.images[1]='changed'.repeat(100);assert.equal(h.context.checkLineupNotifications(),'変更を通知');assert.equal(h.mails.length,2);
  assert.match(h.mails[1].body,/東京・舞浜・横浜の予定表画像が変更/);assert.match(h.mails[1].body,/サイトの公演データはまだ更新していません/);
  assert.equal(h.context.checkLineupNotifications(),'変更なし');assert.equal(h.mails.length,2);
});
test('text note changes are included without inventing dates from images',()=>{
  const h=harness();h.context.setupLineupNotifications();h.env.html=html().replace('2027年4〜8月','2027年4月17日〜8月8日');
  h.context.checkLineupNotifications();assert.match(h.mails[1].body,/追加・変更された注記/);assert.match(h.mails[1].body,/削除・変更前の注記/);
  assert.match(h.mails[1].body,/2027年4月17日〜8月8日/);assert.match(h.mails[1].body,/画像の具体的な変更内容は自動で読み取っていません/);
});
test('partial image failure keeps baseline, alerts once and retries the change after recovery',()=>{
  const h=harness();h.context.setupLineupNotifications();const baseline=h.state().snapshot.fingerprint;
  h.env.images[1]='changed'.repeat(100);h.env.fail='2';assert.equal(h.context.checkLineupNotifications(),'取得失敗');
  assert.equal(h.state().snapshot.fingerprint,baseline);assert.equal(h.mails.length,2);assert.match(h.mails[1].subject,/確認できません/);
  h.context.checkLineupNotifications();assert.equal(h.mails.length,2);
  h.env.fail=null;h.context.checkLineupNotifications();assert.equal(h.mails.length,3);assert.notEqual(h.state().snapshot.fingerprint,baseline);
});
test('failed delivery or exhausted quota does not acknowledge a change or create an initial trigger',()=>{
  const h=harness();h.context.setupLineupNotifications();const baseline=h.state().snapshot.fingerprint;
  h.env.images[1]='changed'.repeat(100);h.env.sendFailure=true;
  assert.throws(()=>h.context.checkLineupNotifications(),/mail unavailable/);assert.equal(h.state().snapshot.fingerprint,baseline);
  h.env.sendFailure=false;h.context.checkLineupNotifications();assert.equal(h.mails.length,2);
  const fresh=harness();fresh.env.quota=0;assert.throws(()=>fresh.context.setupLineupNotifications(),/送信枠/);assert.equal(fresh.properties.size,0);assert.equal(fresh.triggers.length,0);
});
test('stopping removes only this monitor and preserves the snapshot; stopped checks send nothing',()=>{
  const h=harness();h.context.setupLineupNotifications();const unrelated={getHandlerFunction:()=> 'anotherTask',getUniqueId:()=> 'other'};h.triggers.push(unrelated);
  const baseline=h.state().snapshot.fingerprint;h.context.stopLineupNotifications();assert.equal(h.state().enabled,false);assert.equal(h.state().snapshot.fingerprint,baseline);
  assert.deepEqual(h.triggers,[unrelated]);assert.equal(h.context.checkLineupNotifications(),'停止中');assert.equal(h.mails.length,1);
  h.context.setupLineupNotifications();assert.equal(h.state().enabled,true);assert.equal(h.triggers.length,2);
});
test('unexpected source shape, third-party images, missing notes and damaged state fail closed',()=>{
  const h=harness();h.context.setupLineupNotifications();const baseline=h.state().snapshot.fingerprint;
  h.env.html='<h1>Login</h1>';assert.equal(h.context.checkLineupNotifications(),'取得失敗');assert.equal(h.state().snapshot.fingerprint,baseline);
  assert.throws(()=>h.context.parseLineupPage_(html().replace('https://www.shiki.jp/shared','https://evil.test/shared')),/3地域/);
  assert.throws(()=>h.context.parseLineupPage_(html().replace(/※/g,'')),/注記/);
  h.properties.set(h.context.LINEUP_CONFIG.stateKey,'broken');assert.throws(()=>h.context.checkLineupNotifications(),/保存状態/);
});
test('missing account or concurrent execution sends no email; setup confirmation is not a false activation claim',()=>{
  const h=harness();h.env.email='';assert.throws(()=>h.context.setupLineupNotifications(),/アドレス/);assert.equal(h.mails.length,0);
  const locked=harness();locked.env.locked=true;locked.context.setupLineupNotifications();assert.equal(locked.mails.length,0);
  const failed=harness();failed.env.triggerFailure=true;assert.throws(()=>failed.context.setupLineupNotifications(),/trigger unavailable/);
  assert.equal(failed.state().enabled,false);assert.match(failed.mails[0].body,/設定完了ではありません/);
});
