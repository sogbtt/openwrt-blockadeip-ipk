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

function cell(v) { return E('td', {}, v == null ? '' : String(v)); }
function statusRow(k, v) { return E('tr', {}, [ E('td', { 'style': 'width:180px;font-weight:bold;' }, k), E('td', {}, v) ]); }
function section(title, body) { return E('div', { 'class': 'cbi-section' }, [ E('h3', {}, title) ].concat(body)); }
function notify(res) { ui.addNotification(null, E('p', {}, (res && res.message) ? res.message : '操作完成'), (res && res.ok === false) ? 'danger' : 'info'); }
function isStep10(v) { return /^\d+$/.test(String(v)) && Number(v) > 0 && Number(v) % 10 === 0; }
function makeTabButton(name, target) { return E('button', { 'class': 'btn cbi-button', 'style': 'margin-right:8px', 'click': function(){ document.querySelectorAll('.bip-tab').forEach(function(x){x.style.display='none'}); document.getElementById(target).style.display='block'; } }, name); }

return view.extend({
  load: function() { return Promise.all([ callStatus(), callBanlist(), callLogs(200), callConfig() ]); },
  render: function(data) {
    var status = data[0] || {}, bans = data[1] || [], logs = data[2] || [], cfg = data[3] || {};
    var publicUrl = window.location.origin + '/blockadeip/';
    var ipInput = E('input', { 'class': 'cbi-input-text', 'type': 'text', 'placeholder': '例如 8.8.8.8', 'style': 'min-width:260px;' });
    var thresholdInput = E('input', { 'class': 'cbi-input-text', 'type': 'number', 'step': '10', 'value': cfg.threshold || status.threshold || 20, 'style': 'width:110px;' });
    var windowInput = E('input', { 'class': 'cbi-input-text', 'type': 'number', 'step': '10', 'value': cfg.window || status.window || 300, 'style': 'width:110px;' });
    var webPatterns = E('textarea', { 'class': 'cbi-input-textarea', 'style': 'width:100%;min-height:70px;' }, cfg.web_patterns || '');
    var sshPatterns = E('textarea', { 'class': 'cbi-input-textarea', 'style': 'width:100%;min-height:70px;' }, cfg.ssh_patterns || '');
    var extraPatterns = E('textarea', { 'class': 'cbi-input-textarea', 'style': 'width:100%;min-height:70px;' }, cfg.extra_patterns || '');
    var barkEnabled = E('input', { type: 'checkbox' }); barkEnabled.checked = String(cfg.bark_enabled || '0') === '1';
    var barkServer = E('input', { 'class': 'cbi-input-text', 'type': 'text', 'value': cfg.bark_server || '', 'style': 'width:100%;', 'placeholder': '例如 https://api.day.app/你的Key' });
    var barkTemplate = E('select', { 'class': 'cbi-input-select' }, [
      E('option', { value: 'simple' }, '精简'), E('option', { value: 'full' }, '完整'), E('option', { value: 'custom' }, '自定义')
    ]); barkTemplate.value = cfg.bark_template || 'simple';
    var barkCustom = E('textarea', { 'class': 'cbi-input-textarea', 'style': 'width:100%;min-height:70px;' }, cfg.bark_custom_template || 'BlockadeIP: {ip} was blocked, reason={reason}, count={count}, time={time}');

    var enableBox = E('input', { type: 'checkbox', title: '启用或停用 BlockadeIP 实时监听服务' }); enableBox.checked = !!status.enabled;
    enableBox.addEventListener('change', function(){ callSetEnabled(enableBox.checked ? '1' : '0').then(function(res){ notify(res); window.location.reload(); }); });
    var autoBox = E('input', { type: 'checkbox', title: '控制 /etc/init.d/blockadeip 是否开机自启动' }); autoBox.checked = !!status.autostart;
    autoBox.addEventListener('change', function(){ callSetAutostart(autoBox.checked ? '1' : '0').then(function(res){ notify(res); window.location.reload(); }); });

    var banRows = bans.length ? bans.map(function(x) {
      return E('tr', {}, [
        cell(x.ip), cell(x.time || '-'), cell(x.reason || '-'),
        E('td', {}, E('button', { 'class': 'btn cbi-button cbi-button-remove', title: '从封禁列表、ipset 和持久化记录中移除此 IP', 'click': function(){ if (!confirm('确认移除 ' + x.ip + ' ?')) return; callDelete(x.ip).then(function(res){ notify(res); window.location.reload(); }); } }, '移除'))
      ]);
    }) : [ E('tr', {}, E('td', { colspan: 4 }, '暂无封禁 IP')) ];

    var logRows = logs.length ? logs.slice().reverse().map(function(x) {
      return E('tr', {}, [ cell(x.time), cell(x.action), cell(x.ip), cell(x.count), cell(x.reason) ]);
    }) : [ E('tr', {}, E('td', { colspan: 5 }, '暂无日志')) ];

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
        statusRow('更新内容', status.changelog || '-'),
        statusRow('公开页', status.public_page ? E('a', { href: '/blockadeip/', target: '_blank' }, publicUrl) : '未启用')
      ]) ])
    ]);

    var manage = E('div', { id: 'tab-manage', 'class': 'bip-tab', style: 'display:none' }, [
      section('手动操作', [
        E('p', {}, '默认使用 iptables raw PREROUTING + ipset，绕开常规 zone 链路，在入站早期丢弃来源 IP。'),
        E('div', {}, [ ipInput, ' ',
          E('button', { 'class': 'btn cbi-button cbi-button-apply', title: '输入需要封禁的公网 IP 后确认添加', 'click': function(){ var ip = ipInput.value.trim(); if(!ip) return ui.addNotification(null,E('p',{},'请输入 IP'),'warning'); callAdd(ip).then(function(res){ notify(res); window.location.reload(); }); } }, '添加封禁'), ' ',
          E('button', { 'class': 'btn cbi-button cbi-button-reload', title: '重新加载 ipset/raw 规则并恢复持久化封禁列表', 'click': function(){ callReload().then(function(res){ notify(res); window.location.reload(); }); } }, '重载规则'), ' ',
          E('button', { 'class': 'btn cbi-button cbi-button-neutral', title: '重新生成 /www/blockadeip/data.json 公开页数据', 'click': function(){ callPublic().then(function(res){ notify(res); window.location.reload(); }); } }, '刷新公开页'), ' ',
          E('button', { 'class': 'btn cbi-button cbi-button-reset', title: '清空所有封禁列表，请谨慎操作', 'click': function(){ if(!confirm('确认清空所有封禁 IP？')) return; callFlush().then(function(res){ notify(res); window.location.reload(); }); } }, '清空封禁')
        ])
      ]),
      section('已封禁列表', [ E('div', { style: 'max-height:430px;overflow:auto;border:1px solid #ddd;' }, [ E('table', { 'class': 'table cbi-section-table' }, [ E('tr', { 'class': 'tr table-titles' }, [ E('th', {}, 'IP 地址'), E('th', {}, '封禁时间'), E('th', {}, '原因'), E('th', {}, '操作') ]) ].concat(banRows)) ]) ])
    ]);

    var rules = E('div', { id: 'tab-rules', 'class': 'bip-tab', style: 'display:none' }, [
      section('触发阈值', [ E('div', {}, [ '检测窗口：', windowInput, ' 秒　触发阈值：', thresholdInput, ' 次　',
        E('button', { 'class': 'btn cbi-button cbi-button-apply', title: '保存检测窗口和失败次数，数值必须为 10 的整数倍', 'click': function(){
          if(!isStep10(thresholdInput.value) || !isStep10(windowInput.value)) return ui.addNotification(null,E('p',{},'检测窗口和触发阈值必须是 10 的整数倍'),'warning');
          callSaveConfig(String(thresholdInput.value), String(windowInput.value), webPatterns.value, sshPatterns.value, extraPatterns.value, barkEnabled.checked ? '1' : '0', barkServer.value, barkTemplate.value, barkCustom.value).then(function(res){ notify(res); window.location.reload(); });
        } }, '保存配置'), ' ',
        E('button', { 'class': 'btn cbi-button cbi-button-action', title: '输入模拟 IP 后，按当前触发阈值写入对应次数的失败日志，用于验证自动封禁', 'click': function(){ var ip = prompt('请输入需要模拟测试封的公网 IP'); if(!ip) return; callSimulate(ip).then(function(res){ notify(res); setTimeout(function(){window.location.reload()}, 2500); }); } }, '模拟测试封')
      ]) ]),
      section('攻击特征匹配关键词', [
        E('p', {}, '使用 grep -E 正则。WEB、SSH、补充关键词任一命中后，会从日志中的 from x.x.x.x 提取来源 IP。'),
        E('label', {}, 'WEB 爆破关键词'), webPatterns,
        E('label', { style:'display:block;margin-top:12px;' }, 'SSH 爆破关键词'), sshPatterns,
        E('label', { style:'display:block;margin-top:12px;' }, '补充关键词'), extraPatterns
      ])
    ]);

    var bark = E('div', { id: 'tab-bark', 'class': 'bip-tab', style: 'display:none' }, [
      section('Bark 推送', [
        E('p', {}, '封禁新 IP 时触发 Bark 推送。未配置服务器地址时不会推送。'),
        E('table', { 'class': 'table' }, [
          statusRow('启用推送', E('label', {}, [ barkEnabled, ' 启用' ])),
          statusRow('服务器地址', barkServer),
          statusRow('内容模板', barkTemplate),
          statusRow('自定义模板', barkCustom)
        ]),
        E('button', { 'class': 'btn cbi-button cbi-button-apply', title: '保存 Bark 和关键词等配置', 'click': function(){ callSaveConfig(String(thresholdInput.value), String(windowInput.value), webPatterns.value, sshPatterns.value, extraPatterns.value, barkEnabled.checked ? '1' : '0', barkServer.value, barkTemplate.value, barkCustom.value).then(function(res){ notify(res); window.location.reload(); }); } }, '保存配置')
      ])
    ]);

    var logtab = E('div', { id: 'tab-logs', 'class': 'bip-tab', style: 'display:none' }, [
      section('日志记录', [ E('div', { style: 'max-height:430px;overflow:auto;border:1px solid #ddd;' }, [ E('table', { 'class': 'table cbi-section-table' }, [ E('tr', { 'class': 'tr table-titles' }, [ E('th', {}, '时间'), E('th', {}, '动作'), E('th', {}, 'IP 地址'), E('th', {}, '次数'), E('th', {}, '原因') ]) ].concat(logRows)) ]) ])
    ]);

    return E('div', { 'class': 'cbi-map' }, [
      E('h2', {}, 'SSH安全卫士 / BlockadeIP'),
      E('div', { style: 'margin:12px 0 18px 0;' }, [ makeTabButton('概览', 'tab-overview'), makeTabButton('封禁管理', 'tab-manage'), makeTabButton('规则配置', 'tab-rules'), makeTabButton('Bark推送', 'tab-bark'), makeTabButton('日志记录', 'tab-logs') ]),
      overview, manage, rules, bark, logtab
    ]);
  },
  handleSaveApply: null,
  handleSave: null,
  handleReset: null
});
