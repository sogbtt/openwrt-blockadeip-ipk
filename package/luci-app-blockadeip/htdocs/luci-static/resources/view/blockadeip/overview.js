'use strict';
'require view';
'require rpc';
'require ui';

var callStatus = rpc.declare({ object: 'blockadeip', method: 'status', expect: { '': {} } });
var callBanlist = rpc.declare({ object: 'blockadeip', method: 'banlist', expect: { 'items': [] } });
var callLogs = rpc.declare({ object: 'blockadeip', method: 'logs', params: [ 'limit' ], expect: { 'items': [] } });
var callConfig = rpc.declare({ object: 'blockadeip', method: 'config', expect: { '': {} } });
var callAdd = rpc.declare({ object: 'blockadeip', method: 'add', params: [ 'ip' ], expect: { '': {} } });
var callDelete = rpc.declare({ object: 'blockadeip', method: 'delete', params: [ 'ip' ], expect: { '': {} } });
var callFlush = rpc.declare({ object: 'blockadeip', method: 'flush', expect: { '': {} } });
var callReload = rpc.declare({ object: 'blockadeip', method: 'reload', expect: { '': {} } });
var callPublic = rpc.declare({ object: 'blockadeip', method: 'public', expect: { '': {} } });
var callSetEnabled = rpc.declare({ object: 'blockadeip', method: 'set_enabled', params: [ 'enabled' ], expect: { '': {} } });
var callSetAutostart = rpc.declare({ object: 'blockadeip', method: 'set_autostart', params: [ 'enabled' ], expect: { '': {} } });
var callSaveConfig = rpc.declare({ object: 'blockadeip', method: 'save_config', params: [ 'threshold', 'window', 'web_patterns', 'ssh_patterns', 'extra_patterns', 'bark_enabled', 'bark_server', 'bark_template', 'bark_custom_template' ], expect: { '': {} } });
var callSimulate = rpc.declare({ object: 'blockadeip', method: 'simulate', params: [ 'ip' ], expect: { '': {} } });
var callClearLogs = rpc.declare({ object: 'blockadeip', method: 'clear_logs', expect: { '': {} } });
var callBarkTest = rpc.declare({ object: 'blockadeip', method: 'bark_test', expect: { '': {} } });
var callLoginButton = rpc.declare({ object: 'blockadeip', method: 'login_button', params: [ 'action' ], expect: { '': {} } });

function notify(res) {
  var old = document.getElementById('bip-toast');
  if (old) old.remove();
  var msg = (res && res.message) ? res.message : '操作完成';
  var danger = !!(res && res.ok === false);
  var box = E('div', {
    id: 'bip-toast',
    style: 'position:fixed;top:18px;right:18px;z-index:99999;max-width:520px;padding:12px 18px;border-radius:8px;color:#fff;background:' + (danger ? '#d32f2f' : '#2e7d32') + ';box-shadow:0 6px 20px rgba(0,0,0,.25);font-weight:700;'
  }, msg);
  document.body.appendChild(box);
  setTimeout(function(){ var el = document.getElementById('bip-toast'); if (el) el.remove(); }, 2600);
}
function isStep10(v) { return /^\d+$/.test(String(v)) && Number(v) > 0 && Number(v) % 10 === 0; }
function cell(v, cls) { return E('td', cls ? { 'class': cls } : {}, v == null ? '' : String(v)); }
function th(v, cls) { return E('th', cls ? { 'class': cls } : {}, v); }
function statusRow(k, v) { return E('tr', {}, [ E('td', { 'class': 'bip-k' }, k), E('td', { 'class': 'bip-v' }, v) ]); }
function section(title, body) { return E('div', { 'class': 'cbi-section bip-section' }, [ E('h3', {}, title) ].concat(body)); }
function reloadHere() { var h = window.location.hash || '#tab-overview'; window.location.hash = h; window.location.reload(); }
function activateTab(id) {
  document.querySelectorAll('.bip-tab').forEach(function(x){ x.style.display = 'none'; });
  document.querySelectorAll('.bip-tab-button').forEach(function(x){ x.classList.remove('bip-active'); });
  var el = document.getElementById(id) || document.getElementById('tab-overview');
  if (el) el.style.display = 'block';
  var btn = document.querySelector('[data-bip-target="' + id + '"]');
  if (btn) btn.classList.add('bip-active');
  window.location.hash = id;
}
function tabButton(name, id) {
  return E('button', { 'class': 'btn cbi-button bip-tab-button', 'data-bip-target': id, 'click': function(){ activateTab(id); } }, name);
}
function templatePreview(tpl, custom) {
  var ip = '203.0.113.200', reason = '模拟测试封禁', count = '20', time = '2026-05-21 23:59:59';
  if (tpl === 'full') return '【BlockadeIP安全拦截】来源IP：' + ip + '；封禁原因：' + reason + '；触发次数：' + count + '；封禁时间：' + time + '；处理结果：已加入早期入站封禁列表';
  if (tpl === 'ops') return 'BlockadeIP提醒：' + ip + ' 已被封禁；原因：' + reason + '；次数：' + count + '；时间：' + time;
  if (tpl === 'custom') return (custom || '').replace(/\{ip\}/g, ip).replace(/\{reason\}/g, reason).replace(/\{count\}/g, count).replace(/\{time\}/g, time);
  return '【BlockadeIP】已封禁 ' + ip + '，原因：' + reason;
}

return view.extend({
  load: function() { return Promise.all([ callStatus(), callBanlist(), callLogs(300), callConfig() ]); },
  render: function(data) {
    var status = data[0] || {}, bans = data[1] || [], logs = data[2] || [], cfg = data[3] || {};
    var publicUrl = window.location.origin + '/blockadeip/';

    var ipInput = E('input', { 'class': 'cbi-input-text', 'type': 'text', 'placeholder': '例如 8.8.8.8', 'style': 'min-width:260px;' });
    var thresholdInput = E('input', { 'class': 'cbi-input-text', 'type': 'number', 'step': '10', 'value': cfg.threshold || status.threshold || 20, 'style': 'width:110px;' });
    var windowInput = E('input', { 'class': 'cbi-input-text', 'type': 'number', 'step': '10', 'value': cfg.window || status.window || 300, 'style': 'width:110px;' });
    var webPatterns = E('textarea', { 'class': 'cbi-input-textarea', 'style': 'width:100%;min-height:70px;' }, cfg.web_patterns || '');
    var sshPatterns = E('textarea', { 'class': 'cbi-input-textarea', 'style': 'width:100%;min-height:70px;' }, cfg.ssh_patterns || '');
    var extraPatterns = E('textarea', { 'class': 'cbi-input-textarea', 'style': 'width:100%;min-height:70px;' }, cfg.extra_patterns || '');

    var barkEnabled = E('input', { type: 'checkbox' });
    barkEnabled.checked = String(cfg.bark_enabled || '0') === '1';
    var barkServer = E('input', { 'class': 'cbi-input-text', 'type': 'text', 'value': cfg.bark_server || '', 'style': 'width:100%;', 'placeholder': '例如 https://api.day.app/你的Key' });
    var barkTemplate = E('select', { 'class': 'cbi-input-select' }, [
      E('option', { value: 'simple' }, '精简模板'),
      E('option', { value: 'full' }, '完整模板'),
      E('option', { value: 'ops' }, '运维模板'),
      E('option', { value: 'custom' }, '自定义模板')
    ]);
    barkTemplate.value = cfg.bark_template || 'simple';
    var barkCustom = E('textarea', { 'class': 'cbi-input-textarea', 'style': 'width:100%;min-height:70px;' }, cfg.bark_custom_template || '【BlockadeIP】已封禁 {ip}，原因：{reason}，次数：{count}，时间：{time}');
    var barkPreview = E('pre', { 'class': 'bip-preview' }, '');
    function refreshBarkPreview(){ barkPreview.textContent = templatePreview(barkTemplate.value, barkCustom.value); }
    barkTemplate.addEventListener('change', refreshBarkPreview);
    barkCustom.addEventListener('input', refreshBarkPreview);
    setTimeout(refreshBarkPreview, 0);

    function saveAllConfig() {
      if (!isStep10(thresholdInput.value) || !isStep10(windowInput.value)) {
        ui.addNotification(null, E('p', {}, '检测窗口和触发阈值必须是 10 的整数倍'), 'warning');
        return Promise.resolve();
      }
      return callSaveConfig(String(thresholdInput.value), String(windowInput.value), webPatterns.value, sshPatterns.value, extraPatterns.value, barkEnabled.checked ? '1' : '0', barkServer.value, barkTemplate.value, barkCustom.value).then(function(res){
        notify(res);
        return res;
      });
    }

    var enableBox = E('input', { type: 'checkbox', title: '启用或停用 BlockadeIP 实时监听服务' });
    enableBox.checked = !!status.enabled;
    enableBox.addEventListener('change', function(){ callSetEnabled(enableBox.checked ? '1' : '0').then(function(res){ notify(res); reloadHere(); }); });
    var autoBox = E('input', { type: 'checkbox', title: '控制 /etc/init.d/blockadeip 是否开机自启动' });
    autoBox.checked = !!status.autostart;
    autoBox.addEventListener('change', function(){ callSetAutostart(autoBox.checked ? '1' : '0').then(function(res){ notify(res); reloadHere(); }); });

    var banRows = bans.length ? bans.map(function(x) {
      return E('tr', {}, [
        cell(x.ip, 'bip-ip'), cell(x.time || '-'), cell(x.reason || '-'),
        E('td', {}, E('button', { 'class': 'btn cbi-button cbi-button-remove', title: '从封禁列表、ipset 和持久化记录中移除此 IP', 'click': function(){ if (!confirm('确认移除 ' + x.ip + ' ?')) return; callDelete(x.ip).then(function(res){ notify(res); reloadHere(); }); } }, '移除'))
      ]);
    }) : [ E('tr', {}, E('td', { colspan: 4, 'class': 'bip-empty' }, '暂无封禁 IP')) ];

    var logRows = logs.length ? logs.slice().reverse().map(function(x) {
      return E('tr', {}, [ cell(x.time), cell(x.action), cell(x.ip, 'bip-ip'), cell(x.count), cell(x.reason) ]);
    }) : [ E('tr', {}, E('td', { colspan: 5, 'class': 'bip-empty' }, '暂无日志')) ];

    var css = E('style', {}, `
      .bip-section .table{width:100%;table-layout:fixed;border-collapse:collapse}.bip-section th,.bip-section td{vertical-align:middle;text-align:left;padding:10px 12px;word-break:break-all}.bip-table th:nth-child(1),.bip-table td:nth-child(1){width:22%}.bip-table th:nth-child(2),.bip-table td:nth-child(2){width:24%}.bip-table th:nth-child(3),.bip-table td:nth-child(3){width:34%}.bip-table th:nth-child(4),.bip-table td:nth-child(4){width:20%;text-align:center}.bip-k{width:180px;font-weight:700}.bip-v{word-break:break-all}.bip-scroll{max-height:430px;overflow-y:auto;border:1px solid #ddd;border-radius:6px}.bip-scroll table{margin:0}.bip-ip{font-family:monospace;font-weight:700}.bip-empty{text-align:center;color:#888;padding:24px}.bip-preview{background:#f5f5f5;color:#666;border:1px solid #ddd;border-radius:6px;padding:10px;white-space:pre-wrap;line-height:1.6}.bip-active{font-weight:700;box-shadow:inset 0 -2px 0 #1976d2}.bip-tab-button{margin:0 8px 8px 0}.bip-actions button{margin-right:6px;margin-bottom:6px}.bip-note{color:#666;margin:6px 0 12px 0;line-height:1.6}
    `);

    var overview = E('div', { id: 'tab-overview', 'class': 'bip-tab' }, [
      section('运行状态', [ E('table', { 'class': 'table' }, [
        statusRow('服务状态', E('label', {}, [ enableBox, ' ', status.running ? '运行中' : '未运行' ])),
        statusRow('自启动状态', E('label', {}, [ autoBox, ' ', status.autostart ? '已启用' : '未启用' ])),
        statusRow('封禁后端', status.backend || 'unknown'),
        statusRow('已封禁 IP', status.banned || 0),
        statusRow('触发阈值', (status.window || 300) + ' 秒内失败 ' + (status.threshold || 20) + ' 次'),
        statusRow('持久化文件', status.banlist_path || '/etc/blockadeip/banlist'),
        statusRow('版本号', status.version || 'unknown'),
        statusRow('GitHub', E('a', { href: status.repo_url || '#', target: '_blank' }, status.repo_url || '-')),
        statusRow('更新内容', E('div', { 'style': 'white-space:pre-wrap;line-height:1.7' }, status.changelog || '-')),
        statusRow('公开页', status.public_page ? E('a', { href: '/blockadeip/', target: '_blank' }, publicUrl) : '未启用')
      ]) ])
    ]);

    var manage = E('div', { id: 'tab-manage', 'class': 'bip-tab', style: 'display:none' }, [
      section('手动操作', [
        E('p', { 'class': 'bip-note' }, '默认使用 iptables raw PREROUTING + ipset，绕开常规 zone 链路，在入站早期丢弃来源 IP。'),
        E('div', { 'class': 'bip-actions' }, [ ipInput, ' ',
          E('button', { 'class': 'btn cbi-button cbi-button-apply', title: '输入需要封禁的公网 IP 后确认添加', 'click': function(){ var ip = ipInput.value.trim(); if(!ip) return ui.addNotification(null,E('p',{},'请输入 IP'),'warning'); callAdd(ip).then(function(res){ notify(res); reloadHere(); }); } }, '添加封禁'),
          E('button', { 'class': 'btn cbi-button cbi-button-reload', title: '重新加载 ipset/raw 规则并恢复持久化封禁列表', 'click': function(){ callReload().then(function(res){ notify(res); reloadHere(); }); } }, '重载规则'),
          E('button', { 'class': 'btn cbi-button cbi-button-neutral', title: '重新生成 /www/blockadeip/data.json 公开页数据', 'click': function(){ callPublic().then(function(res){ notify(res); reloadHere(); }); } }, '刷新公开页'),
          E('button', { 'class': 'btn cbi-button cbi-button-reset', title: '清空所有封禁列表，请谨慎操作', 'click': function(){ if(!confirm('确认清空所有封禁 IP？')) return; callFlush().then(function(res){ notify(res); reloadHere(); }); } }, '清空封禁')
        ])
      ]),
      section('已封禁列表', [ E('div', { 'class': 'bip-scroll' }, [ E('table', { 'class': 'table bip-table' }, [
        E('thead', {}, E('tr', {}, [ th('IP 地址'), th('封禁时间'), th('原因'), th('操作') ])),
        E('tbody', {}, banRows)
      ]) ]) ])
    ]);

    var rules = E('div', { id: 'tab-rules', 'class': 'bip-tab', style: 'display:none' }, [
      section('触发阈值', [ E('div', { 'class': 'bip-actions' }, [ '检测窗口：', windowInput, ' 秒　触发阈值：', thresholdInput, ' 次　',
        E('button', { 'class': 'btn cbi-button cbi-button-apply', title: '保存检测窗口和失败次数，数值必须为 10 的整数倍', 'click': function(){ saveAllConfig(); } }, '保存配置'),
        E('button', { 'class': 'btn cbi-button cbi-button-action', title: '输入模拟 IP 后，按当前触发阈值写入对应次数的失败日志，并直接执行封禁验证', 'click': function(){ var ip = prompt('请输入需要模拟测试封的公网 IP'); if(!ip) return; callSimulate(ip).then(function(res){ notify(res); setTimeout(function(){ reloadHere(); }, 1200); }); } }, '模拟测试封')
      ]) ]),
      section('攻击特征匹配关键词', [
        E('p', { 'class': 'bip-note' }, '使用 grep -E 正则。WEB、SSH、补充关键词任一命中后，会从日志中的 from x.x.x.x 提取来源 IP。'),
        E('label', {}, 'WEB 爆破关键词'), webPatterns,
        E('label', { style:'display:block;margin-top:12px;' }, 'SSH 爆破关键词'), sshPatterns,
        E('label', { style:'display:block;margin-top:12px;' }, '补充关键词'), extraPatterns
      ])
    ]);

    var bark = E('div', { id: 'tab-bark', 'class': 'bip-tab', style: 'display:none' }, [
      section('Bark 推送', [
        E('p', { 'class': 'bip-note' }, '封禁新 IP 时触发 Bark 推送。填写服务器地址后可先点击“测试推送”。'),
        E('table', { 'class': 'table' }, [
          statusRow('启用推送', E('label', {}, [ barkEnabled, ' 启用' ])),
          statusRow('服务器地址', barkServer),
          statusRow('内容模板', barkTemplate),
          statusRow('模板预览', barkPreview),
          statusRow('自定义模板', barkCustom)
        ]),
        E('div', { 'class': 'bip-actions' }, [
          E('button', { 'class': 'btn cbi-button cbi-button-apply', title: '保存 Bark 服务器、启用状态和模板设置', 'click': function(){ saveAllConfig(); } }, '保存配置'),
          E('button', { 'class': 'btn cbi-button cbi-button-action', title: '向 Bark 服务器发送一条默认测试推送', 'click': function(){ saveAllConfig().then(function(){ return callBarkTest(); }).then(function(res){ notify(res); }); } }, '测试推送')
        ])
      ])
    ]);

    var publicTab = E('div', { id: 'tab-public', 'class': 'bip-tab', style: 'display:none' }, [
      section('公开页设置', [
        E('p', { 'class': 'bip-note' }, '公开处刑页用于威慑高风险来源。当前访问地址：'),
        E('p', {}, E('a', { href: '/blockadeip/', target: '_blank' }, publicUrl)),
        E('div', { 'class': 'bip-actions' }, [
          E('button', { 'class': 'btn cbi-button cbi-button-apply', title: '在 LuCI 登录页登录按钮下方注入公开处刑入口按钮', 'click': function(){ callLoginButton('install').then(function(res){ notify(res); }); } }, '安装登录页入口'),
          E('button', { 'class': 'btn cbi-button cbi-button-remove', title: '从 LuCI 登录页移除公开处刑入口按钮', 'click': function(){ callLoginButton('remove').then(function(res){ notify(res); }); } }, '移除登录页入口'),
          E('button', { 'class': 'btn cbi-button cbi-button-neutral', title: '重新生成公开页数据文件', 'click': function(){ callPublic().then(function(res){ notify(res); }); } }, '刷新公开页')
        ])
      ])
    ]);

    var logtab = E('div', { id: 'tab-logs', 'class': 'bip-tab', style: 'display:none' }, [
      section('日志记录', [
        E('div', { 'class': 'bip-actions' }, [ E('button', { 'class': 'btn cbi-button cbi-button-reset', title: '清空持久化审计日志，不会清空当前封禁列表', 'click': function(){ if(!confirm('确认清空日志记录？不会清空已封禁 IP。')) return; callClearLogs().then(function(res){ notify(res); reloadHere(); }); } }, '清空日志') ]),
        E('div', { 'class': 'bip-scroll' }, [ E('table', { 'class': 'table bip-table' }, [
          E('thead', {}, E('tr', {}, [ th('时间'), th('动作'), th('IP 地址'), th('次数'), th('原因') ])),
          E('tbody', {}, logRows)
        ]) ])
      ])
    ]);

    var root = E('div', { 'class': 'cbi-map' }, [
      css,
      E('h2', {}, 'SSH安全卫士 / BlockadeIP'),
      E('div', { style: 'margin:12px 0 18px 0;' }, [ tabButton('概览', 'tab-overview'), tabButton('封禁管理', 'tab-manage'), tabButton('规则配置', 'tab-rules'), tabButton('Bark推送', 'tab-bark'), tabButton('公开页设置', 'tab-public'), tabButton('日志记录', 'tab-logs') ]),
      overview, manage, rules, bark, publicTab, logtab
    ]);
    setTimeout(function(){ activateTab((window.location.hash || '#tab-overview').replace('#','')); }, 0);
    return root;
  },
  handleSaveApply: null,
  handleSave: null,
  handleReset: null
});
