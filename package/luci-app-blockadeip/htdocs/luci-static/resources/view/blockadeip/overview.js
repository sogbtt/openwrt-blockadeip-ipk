'use strict';
'require view';
'require rpc';
'require ui';

var callStatus = rpc.declare({ object: 'blockadeip', method: 'status', expect: { '': {} } });
var callBanlist = rpc.declare({ object: 'blockadeip', method: 'banlist', expect: { 'items': [] } });
var callLogs = rpc.declare({ object: 'blockadeip', method: 'logs', params: [ 'limit' ], expect: { 'items': [] } });
var callAdd = rpc.declare({ object: 'blockadeip', method: 'add', params: [ 'ip' ], expect: { '': {} } });
var callDelete = rpc.declare({ object: 'blockadeip', method: 'delete', params: [ 'ip' ], expect: { '': {} } });
var callFlush = rpc.declare({ object: 'blockadeip', method: 'flush', expect: { '': {} } });
var callReload = rpc.declare({ object: 'blockadeip', method: 'reload', expect: { '': {} } });
var callPublic = rpc.declare({ object: 'blockadeip', method: 'public', expect: { '': {} } });
var callConfig = rpc.declare({ object: 'blockadeip', method: 'config', params: [ 'threshold', 'window' ], expect: { '': {} } });
var callAutostart = rpc.declare({ object: 'blockadeip', method: 'autostart', params: [ 'enabled' ], expect: { '': {} } });

function td(v, style) {
	return E('td', { 'style': style || 'text-align:left;vertical-align:middle;' }, v == null ? '' : String(v));
}

function th(v, style) {
	return E('th', { 'style': style || 'text-align:left;vertical-align:middle;' }, v);
}

function statusRow(k, v) {
	return E('tr', {}, [
		E('td', { 'style': 'width:180px;text-align:left;font-weight:bold;vertical-align:middle;' }, k),
		E('td', { 'style': 'text-align:left;vertical-align:middle;' }, v)
	]);
}

function validStep10(v) {
	var n = parseInt(v, 10);
	return String(n) === String(v).trim() && n >= 10 && n % 10 === 0;
}

return view.extend({
	load: function() {
		return Promise.all([
			callStatus(),
			callBanlist(),
			callLogs(120)
		]);
	},

	render: function(data) {
		var status = data[0] || {};
		var bans = data[1] || [];
		var logs = data[2] || [];
		var ipInput = E('input', {
			'class': 'cbi-input-text',
			'type': 'text',
			'placeholder': '例如 8.8.8.8',
			'style': 'min-width:260px;'
		});
		var thresholdInput = E('input', {
			'class': 'cbi-input-text',
			'type': 'number',
			'min': '10',
			'step': '10',
			'value': status.threshold || 20,
			'style': 'width:90px;'
		});
		var windowInput = E('input', {
			'class': 'cbi-input-text',
			'type': 'number',
			'min': '10',
			'step': '10',
			'value': status.window || 300,
			'style': 'width:110px;'
		});
		var publicUrl = window.location.origin + '/blockadeip/';
		var autostartText = status.autostart ? '已启用' : '未启用';

		var banRows = bans.length ? bans.map(function(x) {
			return E('tr', {}, [
				td(x.ip, 'text-align:left;vertical-align:middle;font-family:monospace;'),
				E('td', { 'style': 'width:160px;text-align:left;vertical-align:middle;' }, E('button', {
					'class': 'btn cbi-button cbi-button-remove',
					'click': function() {
						if (!confirm('确认移除 ' + x.ip + ' ?')) return;
						return callDelete(x.ip).then(function() {
							window.location.reload();
						});
					}
				}, '移除'))
			]);
		}) : [
			E('tr', {}, E('td', { 'colspan': 2, 'style': 'text-align:left;' }, '暂无封禁 IP'))
		];

		var logRows = logs.length ? logs.slice().reverse().map(function(x) {
			return E('tr', {}, [
				td(x.time, 'width:180px;text-align:left;vertical-align:middle;'),
				td(x.action, 'width:90px;text-align:left;vertical-align:middle;'),
				td(x.ip, 'width:180px;text-align:left;vertical-align:middle;font-family:monospace;'),
				td(x.count, 'width:80px;text-align:left;vertical-align:middle;'),
				td(x.reason, 'text-align:left;vertical-align:middle;')
			]);
		}) : [
			E('tr', {}, E('td', { 'colspan': 5, 'style': 'text-align:left;' }, '暂无日志'))
		];

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, 'SSH安全卫士 / BlockadeIP'),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, '运行状态'),
				E('table', { 'class': 'table', 'style': 'width:100%;table-layout:fixed;' }, [
					statusRow('服务状态', status.running ? '运行中' : '未运行'),
					statusRow('自启动状态', autostartText),
					statusRow('封禁后端', status.backend || 'unknown'),
					statusRow('已封禁 IP', status.banned || 0),
					statusRow('触发阈值', E('span', {}, [
						windowInput, ' 秒内失败 ', thresholdInput, ' 次 ',
						E('button', {
							'class': 'btn cbi-button cbi-button-apply',
							'click': ui.createHandlerFn(this, function() {
								var threshold = thresholdInput.value.trim();
								var win = windowInput.value.trim();
								if (!validStep10(threshold) || !validStep10(win)) {
									ui.addNotification(null, E('p', {}, '时间窗口和失败次数必须为 10 的整数倍，且不小于 10'), 'warning');
									return;
								}
								return callConfig(parseInt(threshold, 10), parseInt(win, 10)).then(function(res) {
									ui.addNotification(null, E('p', {}, res.ok === false ? (res.message || '保存失败') : '配置已保存并重载'));
									window.location.reload();
								});
							})
						}, '保存')
					])),
					statusRow('持久化文件', status.banlist_path || '/etc/blockadeip/banlist'),
					statusRow('公开页', status.public_page ? E('a', { 'href': '/blockadeip/', 'target': '_blank' }, publicUrl) : '未启用')
				])
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, '手动操作'),
				E('p', {}, '默认使用 iptables raw PREROUTING + ipset，绕开常规 zone 链路，在入站早期丢弃来源 IP。'),
				E('div', {}, [
					ipInput,
					' ',
					E('button', {
						'class': 'btn cbi-button cbi-button-apply',
						'click': ui.createHandlerFn(this, function() {
							var ip = ipInput.value.trim();
							if (!ip) {
								ui.addNotification(null, E('p', {}, '请输入 IP'), 'warning');
								return;
							}
							return callAdd(ip).then(function(res) {
								ui.addNotification(null, E('p', {}, res.message || '操作完成'));
								window.location.reload();
							});
						})
					}, '添加封禁'),
					' ',
					E('button', {
						'class': 'btn cbi-button cbi-button-reload',
						'click': ui.createHandlerFn(this, function() {
							return callReload().then(function() {
								ui.addNotification(null, E('p', {}, '已重载规则'));
								window.location.reload();
							});
						})
					}, '重载规则'),
					' ',
					E('button', {
						'class': 'btn cbi-button cbi-button-neutral',
						'click': ui.createHandlerFn(this, function() {
							return callPublic().then(function() {
								ui.addNotification(null, E('p', {}, '已刷新公开页'));
								window.location.reload();
							});
						})
					}, '刷新公开页'),
					' ',
					E('button', {
						'class': 'btn cbi-button cbi-button-action',
						'click': ui.createHandlerFn(this, function() {
							return callAutostart(status.autostart ? 0 : 1).then(function() {
								ui.addNotification(null, E('p', {}, status.autostart ? '已关闭自启动' : '已启用自启动'));
								window.location.reload();
							});
						})
					}, status.autostart ? '关闭自启动' : '启用自启动'),
					' ',
					E('button', {
						'class': 'btn cbi-button cbi-button-reset',
						'click': ui.createHandlerFn(this, function() {
							if (!confirm('确认清空所有封禁 IP？')) return;
							return callFlush().then(function() {
								window.location.reload();
							});
						})
					}, '清空封禁')
				])
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, '已封禁列表'),
				E('table', { 'class': 'table cbi-section-table', 'style': 'width:100%;table-layout:fixed;border-collapse:collapse;' }, [
					E('tr', { 'class': 'tr table-titles' }, [
						th('IP 地址', 'text-align:left;width:auto;'),
						th('操作', 'text-align:left;width:160px;')
					])
				].concat(banRows))
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, '日志记录'),
				E('table', { 'class': 'table cbi-section-table', 'style': 'width:100%;table-layout:fixed;border-collapse:collapse;' }, [
					E('tr', { 'class': 'tr table-titles' }, [
						th('时间', 'text-align:left;width:180px;'),
						th('动作', 'text-align:left;width:90px;'),
						th('IP 地址', 'text-align:left;width:180px;'),
						th('次数', 'text-align:left;width:80px;'),
						th('原因', 'text-align:left;')
					])
				].concat(logRows))
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
