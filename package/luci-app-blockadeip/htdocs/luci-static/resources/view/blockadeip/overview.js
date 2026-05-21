'use strict';
'require view';
'require rpc';
'require ui';
'require poll';

var callStatus = rpc.declare({ object: 'blockadeip', method: 'status', expect: { '': {} } });
var callBanlist = rpc.declare({ object: 'blockadeip', method: 'banlist', expect: { 'items': [] } });
var callLogs = rpc.declare({ object: 'blockadeip', method: 'logs', params: [ 'limit' ], expect: { 'items': [] } });
var callAdd = rpc.declare({ object: 'blockadeip', method: 'add', params: [ 'ip' ], expect: { '': {} } });
var callDelete = rpc.declare({ object: 'blockadeip', method: 'delete', params: [ 'ip' ], expect: { '': {} } });
var callFlush = rpc.declare({ object: 'blockadeip', method: 'flush', expect: { '': {} } });
var callReload = rpc.declare({ object: 'blockadeip', method: 'reload', expect: { '': {} } });
var callPublic = rpc.declare({ object: 'blockadeip', method: 'public', expect: { '': {} } });

function td(text) {
	return E('td', {}, text == null ? '' : String(text));
}

return view.extend({
	load: function() {
		return Promise.all([ callStatus(), callBanlist(), callLogs(120) ]);
	},

	render: function(data) {
		var status = data[0] || {}, bans = data[1] || [], logs = data[2] || [];
		var ipInput = E('input', { 'class': 'cbi-input-text', 'type': 'text', 'placeholder': '例如 8.8.8.8' });
		var statusBox = E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, _('运行状态')),
			E('div', { 'class': 'table' }, [
				E('div', { 'class': 'tr' }, [ E('div', { 'class': 'td left' }, _('服务状态')), E('div', { 'class': 'td left' }, status.running ? _('运行中') : _('未运行')) ]),
				E('div', { 'class': 'tr' }, [ E('div', { 'class': 'td left' }, _('封禁后端')), E('div', { 'class': 'td left' }, status.backend || 'unknown') ]),
				E('div', { 'class': 'tr' }, [ E('div', { 'class': 'td left' }, _('已封禁 IP')), E('div', { 'class': 'td left' }, String(status.banned || 0)) ]),
				E('div', { 'class': 'tr' }, [ E('div', { 'class': 'td left' }, _('触发阈值')), E('div', { 'class': 'td left' }, (status.window || 300) + ' 秒内失败 ' + (status.threshold || 20) + ' 次') ]),
				E('div', { 'class': 'tr' }, [ E('div', { 'class': 'td left' }, _('公开页')), E('div', { 'class': 'td left' }, status.public_page ? '/blockadeip/' : _('未启用')) ])
			])
		]);

		var actions = E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, _('手动操作')),
			E('p', {}, _('默认使用 iptables raw PREROUTING + ipset，绕开常规 zone 链路，在入站早期丢弃来源 IP。')),
			E('div', {}, [
				ipInput,
				' ',
				E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, function() {
					var ip = ipInput.value.trim();
					if (!ip) return ui.addNotification(null, E('p', {}, _('请输入 IP')), 'warning');
					return callAdd(ip).then(function(res) {
						ui.addNotification(null, E('p', {}, res.ok === false ? (res.message || _('添加失败')) : _('添加成功')));
						window.location.reload();
					});
				}) }, _('添加封禁')),
				' ',
				E('button', { 'class': 'btn cbi-button cbi-button-reload', 'click': ui.createHandlerFn(this, function() {
					return callReload().then(function() { ui.addNotification(null, E('p', {}, _('已重载'))); });
				}) }, _('重载规则')),
				' ',
				E('button', { 'class': 'btn cbi-button cbi-button-neutral', 'click': ui.createHandlerFn(this, function() {
					return callPublic().then(function() { ui.addNotification(null, E('p', {}, _('已刷新公开页数据'))); });
				}) }, _('刷新公开页')),
				' ',
				E('button', { 'class': 'btn cbi-button cbi-button-reset', 'click': ui.createHandlerFn(this, function() {
					if (!confirm(_('确认清空所有封禁 IP？'))) return;
					return callFlush().then(function() { window.location.reload(); });
				}) }, _('清空封禁'))
			])
		]);

		var banRows = bans.length ? bans.map(function(x) {
			return E('tr', {}, [
				td(x.ip),
				E('td', {}, E('button', { 'class': 'btn cbi-button cbi-button-remove', 'click': function() {
					if (!confirm(_('确认移除 ') + x.ip + ' ?')) return;
					callDelete(x.ip).then(function() { window.location.reload(); });
				} }, _('移除')))
			]);
		}) : [ E('tr', {}, E('td', { 'colspan': 2 }, _('暂无封禁 IP'))) ];

		var logRows = logs.length ? logs.slice().reverse().map(function(x) {
			return E('tr', {}, [ td(x.time), td(x.action), td(x.ip), td(x.count), td(x.reason) ]);
		}) : [ E('tr', {}, E('td', { 'colspan': 5 }, _('暂无日志'))) ];

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('SSH安全卫士 / BlockadeIP')),
			statusBox,
			actions,
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('已封禁列表')),
				E('table', { 'class': 'table cbi-section-table' }, [ E('tr', { 'class': 'tr table-titles' }, [ E('th', {}, _('IP')), E('th', {}, _('操作')) ]), banRows ])
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('日志记录')),
				E('table', { 'class': 'table cbi-section-table' }, [ E('tr', { 'class': 'tr table-titles' }, [ E('th', {}, _('时间')), E('th', {}, _('动作')), E('th', {}, _('IP')), E('th', {}, _('次数')), E('th', {}, _('原因')) ]), logRows ])
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
