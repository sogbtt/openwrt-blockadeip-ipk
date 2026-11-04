# OpenWrt-BlockadeIP

> 基于 `nftables` 独立表 + `prerouting/raw` 优先级 的 OpenWrt / ImmortalWrt 早期入站封禁 LuCI 插件。  
> 适用于 SSH 爆破、LuCI 登录爆破、WEB 后台高频异常访问、端口转发场景下的来源 IP 快速封禁与公开威慑展示。

---

## 快速判断你的系统是否适合安装

在 OpenWrt / ImmortalWrt 终端执行：

```sh
curl -fsSL https://raw.githubusercontent.com/sogbtt/openwrt-blockadeip-ipk/refs/heads/main/check-env.sh | sh
```

检测脚本只做环境兼容性检测：

- 不安装插件
- 不修改 BlockadeIP 配置
- 不持久化防火墙规则
- 仅创建临时 nft 测试表（`inet blockadeip_check_tmp`），并在结束后自动清理

---

## 适用环境说明

### 已验证环境

| 项目 | 已验证环境 |
|---|---|
| 系统 | OpenWrt 24.10.0 |
| 内核 | Linux 6.12.18 |
| 架构 | x86/64 |
| Web 服务 | nginx / luci-nginx |
| 防火墙环境 | fw4 / nftables |
| 封禁后端 | nftables（`table inet blockadeip`） |
| LuCI | LuCI 25.x / Argon 主题 |

### 推荐环境

| 项目 | 推荐要求 |
|---|---|
| 系统 | OpenWrt / ImmortalWrt 23.05+ / 24.10+ |
| 架构 | x86/64、rockchip/armv8、armsr/armv8 等 |
| 防火墙 | 支持 nftables（OpenWrt 22.03+ / 24.10 默认 fw4） |
| 高性能集合 | nftables set（`flags timeout`），无需 ipset |
| 旧系统回退 | 无 nft 时自动回退到 ipset + iptables raw |
| 日志系统 | 支持 logread / logger |
| Web 管理 | LuCI + rpcd |
| 公开页 | `/www` 目录可被 nginx / uhttpd / openresty 访问 |

### 预计可用场景

| 场景 | 预计支持情况 |
|---|---|
| 传统 iptables 防火墙 | 兼容：自动回退到 ipset + iptables raw |
| firewall4 / nftables 系统 | 推荐，原生 nft 后端 |
| OpenWrt 24.10+ | 推荐，已验证 |
| LuCI 跑在 nginx / luci-nginx | 支持，已验证 |
| LuCI 跑在 uHTTPd | 理论支持，公开页放在 `/www/blockadeip/` |
| 端口转发 / DNAT 场景 | 支持，这是本项目重点场景 |
| Docker / OpenResty / Alist / WebDAV 暴露在公网 | 可通过日志关键词扩展识别 |

### 不适用或需谨慎的环境

| 环境 | 说明 |
|---|---|
| 无 nftables | 会回退到 ipset/iptables；两者都缺则不建议使用 |
| 极简固件缺少 rpcd / LuCI | 核心脚本可能可用，但 LuCI 面板不可用 |
| 非 OpenWrt 系统 | 不保证可用 |
| 不理解公网管理口风险的环境 | 不建议暴露 LuCI / SSH 到公网 |

---

## 项目截图

### LuCI 管理面板

<img width="1503" height="686" alt="后台—概览" src="https://github.com/user-attachments/assets/1a509934-76d2-4964-864c-a3f1120197cd" />

### 已封禁列表

<img width="1493" height="510" alt="概览-封禁管理" src="https://github.com/user-attachments/assets/ef8276fd-616e-4ab4-a649-6f3b831e69d8" />

### 公开处刑页

<img width="1492" height="722" alt="公开处刑" src="https://github.com/user-attachments/assets/db3ccb79-23ec-47b1-aca7-c05736fa9aac" />

### Bark 推送配置

<img width="1486" height="596" alt="概览-bark推送" src="https://github.com/user-attachments/assets/23d493a3-7ed7-4d36-8ef2-8c7d357d67bb" />

### LuCI 登录页入口按钮

<img width="1151" height="508" alt="luci login" src="https://github.com/user-attachments/assets/235ae21f-7eef-4e9a-96a3-905a5366c7fe" />

---

---

## 项目定位

OpenWrt-BlockadeIP 不是传统意义上的 firewall4 规则管理器，也不是 banIP 的替代品。

它的定位是：

> 在数据包进入路由器的最早阶段，通过独立 nftables 表（`prerouting` / `priority raw`）对高风险来源 IP 进行快速丢弃，绕开复杂 zone / forward / DNAT 链路带来的命中不确定性。

适合这类用户：

- 有公网 IP / DDNS
- 暴露过 SSH、LuCI、ttyd、WebDAV、Alist、OpenResty、Docker 服务
- 遇到过端口转发后普通防火墙规则不生效
- 想要 LuCI 可视化管理封禁 IP
- 想要公开威慑页展示被拦截来源
- 想要 Bark / Webhook 推送封禁通知

---

## 核心功能

### 1. 早期入站封禁

默认使用：

```nft
table inet blockadeip {
        set v4 { type ipv4_addr; flags timeout; size 65536; }
        set v6 { type ipv6_addr; flags timeout; size 65536; }
        chain prerouting {
                type filter hook prerouting priority raw; policy accept;
                ip saddr @v4 drop
                ip6 saddr @v6 drop
        }
}
```

封禁 IP 时写入：

```sh
nft add element inet blockadeip v4 { 1.2.3.4 }
```

优势：

- `priority raw`（-300）比 banIP 的 -150 更早，包在 conntrack 之前就被丢弃
- 比 filter / FORWARD 更早
- 比常规 zone 链路更直接
- 适合 DNAT / 端口转发场景
- 大量 IP 时比“一 IP 一规则”更高效
- 独立表不受 `fw4` 的 `nftables.d` 加载与清理影响

---

### 2. LuCI 可视化管理

LuCI 面板支持：

- 查看服务状态
- 开启 / 停用服务
- 开启 / 停用自启动
- 查看当前封禁后端
- 查看已封禁 IP 数量
- 手动添加封禁 IP
- 手动移除封禁 IP
- 清空封禁列表
- 查看封禁时间、原因、触发次数
- 查看持久化日志
- 清空日志
- 模拟测试封禁
- 刷新公开页
- 查看版本号、GitHub 地址、更新内容

---

### 3. 自动识别爆破日志

服务通过 `logread -f` 实时监听系统日志。

支持识别：

- LuCI 登录失败
- SSH 登录失败
- dropbear / sshd 异常登录
- 自定义 WEB 爆破关键词
- 自定义 SSH 爆破关键词
- 自定义补充攻击特征

典型日志示例：

```text
luci: failed login on / for root from 203.0.113.124
Failed password for root from 203.0.113.124
bad password attempt for root from 203.0.113.124
```

当同一 IP 在配置窗口内达到阈值后，自动封禁。

---

### 4. 攻击特征关键词可配置

LuCI 中可编辑：

- WEB 爆破关键词
- SSH 爆破关键词
- 补充关键词

适合不同服务日志格式，例如：

- LuCI
- nginx
- OpenResty
- ttyd
- Alist
- WebDAV
- PHP 后台
- 自定义业务后台

---

### 5. 公开威慑页

默认公开页路径：

```text
/blockadeip/
```

实际文件位于：

```text
/www/blockadeip/
```

可被 nginx、uHTTPd、OpenResty 等 Web 服务直接访问。

公开页展示：

- 当前封禁数量
- 更新时间
- 来源 IP
- 封禁时间
- 触发次数
- 封禁原因

视觉风格采用高对比红色威慑风格，用于提醒异常访问者：高频爆破行为已被记录并拦截。

---

### 6. LuCI 登录页入口按钮

支持在 Argon 主题登录页按钮下方注入公开页入口：

```text
🛡️ 爆破拦截记录
```

注入位置：

```html
<input type="submit" value="<%:Login%>" class="cbi-button cbi-button-apply" />
```

按钮紧跟登录按钮，位于同一个 `<div>` 内。

> 注意：该功能主要适配 Argon 主题。其他主题可能需要手动适配。

---

### 7. 通知推送（Bark / Webhook）

支持 Bark 与任意自定义 Webhook 推送封禁通知。

可配置：

- 启用 / 停用通知推送
- 推送方式：Bark / Webhook
- Bark 服务器地址、内置模板、自定义模板
- Webhook URL、请求方法（GET/POST/PUT/PATCH/DELETE）、Content-Type
- Webhook Headers（每行一个，支持 `Authorization: Bearer xxx` 这类含空格的值）
- Webhook Body 模板
- 超时时间、是否跳过 HTTPS 证书校验
- 测试推送

内置 Bark 模板：

- 精简模板
- 完整模板
- 运维模板
- 自定义模板

#### Webhook 占位符

| 占位符 | 说明 |
|---|---|
| `{ip}` `{reason}` `{count}` `{time}` `{title}` | 原始值（reason 已转为中文标签） |
| `{ip_json}` `{reason_json}` `{time_json}` `{title_json}` | JSON 转义后的值 |
| `{ip_url}` `{reason_url}` `{time_url}` `{title_url}` | URL 编码后的值 |
| `{json}` | 完整 JSON 对象 |

> 替换顺序上长名优先（`{ip_json}` 先于 `{ip}`），可以放心混用。

#### 默认 Body

```json
{"title":"{title}","ip":"{ip}","reason":"{reason}","count":{count},"time":"{time}"}
```

#### 文件位置

| 文件 | 作用 |
|---|---|
| `/etc/blockadeip/webhook.body` | Webhook 请求体模板（权限 600） |
| `/etc/blockadeip/webhook.headers` | Webhook 请求头，每行一个（权限 600） |

#### HTTP 客户端选择

自动探测：`uclient-fetch` → `curl` → `wget`，无需额外安装。

> `uclient-fetch` 默认不校验 HTTPS 证书（需要 `ca-bundle` 才严格校验）。如需严格校验请 `opkg install ca-bundle`；否则可开启“跳过证书校验”。

#### 配置示例（UCI）

```sh
uci set blockadeip.push.enabled='1'
uci set blockadeip.push.type='webhook'
uci set blockadeip.push.webhook_url='https://example.com/hook'
uci set blockadeip.push.webhook_method='POST'
uci set blockadeip.push.webhook_content_type='application/json'
uci commit blockadeip
/etc/init.d/blockadeip restart
```

---

### 8. 持久化封禁

核心文件：

```text
/etc/blockadeip/banlist
/etc/blockadeip/records.tsv
/etc/blockadeip/blockadeip.log
/etc/blockadeip/webhook.body
/etc/blockadeip/webhook.headers
```

说明：

| 文件 | 作用 |
|---|---|
| `/etc/blockadeip/banlist` | 当前有效封禁 IP |
| `/etc/blockadeip/records.tsv` | IP、封禁时间、次数、原因、中文标签 |
| `/etc/blockadeip/blockadeip.log` | 持久化审计日志 |

重启后会自动：

1. 读取 `/etc/blockadeip/banlist`
2. 重建 `table inet blockadeip`（若已被清理）
3. 批量恢复到 nft 集合（单进程，`nft -f -`）
4. 生成公开页数据

> 停用服务 / 关闭服务开关会移除 nft 表，即**立即解除全部拦截**；`banlist` 文件保留，重新启动后自动恢复。
> `ban_time > 0` 时，重启后封禁时长重新计时（默认 `0` 为永久封禁，不受影响）。

### 封禁后端切换

「规则配置 → 封禁后端」可切换：

| 选项 | 说明 |
|---|---|
| 自动（默认） | 优先 nftables，失败回退 ipset / iptables |
| 仅 nftables | nft 不可用时服务启动失败并报错 |
| ipset（兼容） | 传统 ipset + iptables raw，需先 `opkg install ipset iptables` |

切换时会自动清理另一套后端的残留规则，避免新旧规则同时生效导致解封失效。

### 封禁时长

「规则配置 → 封禁时长」以分钟为单位，`0` 为永久封禁。
仅对新封禁生效；到期后 nft 集合元素自动移除，同时清理封禁列表与记录，该 IP 可被重新封禁。

---

## 技术原理

### 常规防火墙为什么可能拦不住？

在 OpenWrt 中，公网流量可能经过：

```text
入口网卡
  ↓
PREROUTING
  ↓
DNAT / 端口转发
  ↓
路由判断
  ↓
FORWARD / INPUT
  ↓
目标服务
```

如果规则写在 zone、FORWARD、filter 或某些 fw4 链条里，在复杂 DNAT / Docker / 端口转发环境下，可能出现规则没有按预期命中的情况。

---

### BlockadeIP 的处理方式

BlockadeIP 直接在更早阶段处理：

```text
外部数据包进入路由器
  ↓
prerouting hook（priority raw，-300）
  ↓
匹配 nft set v4 / v6
  ↓
DROP
```

也就是：

```nft
table inet blockadeip {
        chain prerouting {
                type filter hook prerouting priority raw; policy accept;
                ip saddr @v4 drop
                ip6 saddr @v6 drop
        }
}
```

这意味着：

- 不等 DNAT
- 不依赖 zone 判断
- 不依赖具体服务端口
- 不依赖 Docker 网络路径
- 只要来源 IP 命中黑名单，直接在最早阶段丢弃

---

### 为什么使用 nft set？

如果每个 IP 都写一条规则：

```nft
ip saddr 1.2.3.4 drop
ip saddr 5.6.7.8 drop
```

IP 多了以后规则会膨胀，性能和维护性都会下降。

BlockadeIP 使用：

```nft
add element inet blockadeip v4 { 1.2.3.4 }
```

然后只保留两条总入口规则（v4 / v6 各一条）。

这样更适合 100 / 500 / 更多 IP 的封禁场景，且 `flags timeout` 天然支持封禁到期自动解封。

> 旧系统（无 nft）会自动回退到 ipset + iptables raw 方案，行为一致。

---

## 安装方式

### 下载安装包

从 Releases 下载：

```text
blockadeip_x.x.x-r1_all.ipk
luci-app-blockadeip_x.x.x-r1_all.ipk
```

### 安装

```sh
opkg install ./blockadeip_x.x.x-r1_all.ipk
opkg install ./luci-app-blockadeip_x.x.x-r1_all.ipk
```

### 启动服务

```sh
/etc/init.d/blockadeip enable
/etc/init.d/blockadeip start
/etc/init.d/rpcd restart
/etc/init.d/nginx restart 2>/dev/null || /etc/init.d/uhttpd restart 2>/dev/null
```

---

## 使用方式

进入 LuCI：

```text
服务 → SSH安全卫士 / BlockadeIP
```

常用操作：

- 开启服务
- 开启自启动
- 设置检测窗口
- 设置触发阈值
- 添加手动封禁 IP
- 查看已封禁列表
- 查看日志
- 配置 Bark / Webhook 通知推送
- 安装登录页公开入口
- 打开 `/blockadeip/` 查看公开威慑页

---

## 常用命令

### 查看状态

```sh
ubus call blockadeip status
```

### 查看封禁列表

```sh
ubus call blockadeip banlist
```

### 手动封禁 IP

```sh
/usr/sbin/blockadeip add 203.0.113.10 0 manual
```

### 手动解封 IP

```sh
/usr/sbin/blockadeip del 203.0.113.10
```

### 刷新公开页

```sh
/usr/sbin/blockadeip public
```

### 查看 nft 表

```sh
nft list table inet blockadeip
```

### 查看封禁集合

```sh
nft list set inet blockadeip v4
```

### 手动测试通知推送

```sh
/usr/sbin/blockadeip notify-test
```

---

## 注意事项

### 1. 不要封禁自己的管理 IP

插件会尽量保护常见 LAN 网段和当前管理地址，但仍建议谨慎操作。

特别注意：

```text
192.168.1.1
192.168.0.1
10.0.0.1
172.16.0.1
```

### 2. 公开页会暴露封禁记录

公开页用于威慑，但也可能暴露你的安全策略。

如果你不希望公开展示，请在 LuCI 中关闭公开页或限制 Web 访问范围。

### 3. 登录页按钮主要适配 Argon

自动注入登录页按钮主要针对：

```text
/usr/lib/lua/luci/view/themes/argon/sysauth.htm
```

其他主题可能不兼容。

### 4. 本项目不是万能 WAF

BlockadeIP 只负责基于日志识别高频失败行为，并封禁来源 IP。

它不是：

- WAF
- IDS
- 流量审计系统
- 漏洞防护系统
- 替代 firewall4 的完整防火墙

---

## 更新日志

### V1.6.2

- 修复「规则配置」页排版：按钮组、检测窗口/触发阈值/封禁时长行、关键词输入区统一 `padding-left: 20px` 缩进。
- 修复日志记录表格「原因」列过窄：日志表改用独立列宽（20/10/22/10/38），中文按词换行。
- 修复通知页 Headers / Body 输入框与标签对齐。

### V1.6.1

- 「规则配置」新增封禁后端下拉：自动 / 仅 nftables / ipset（兼容）。
- 切换后端时自动清理旧后端残留规则（nft 表、ipset 集合、iptables 跳转）。
- 选择 ipset 但缺少依赖时直接拒绝保存，并提示 `opkg install ipset iptables`。
- 「规则配置」新增封禁时长配置（分钟，`0` 表示永久）。
- 概览页展示当前封禁后端（中文标签）与配置值、封禁时长。
- 新增过期封禁自动清理：`ban_time > 0` 时，到期 IP 会从封禁列表与记录中移除，可被重新封禁。
- 概览「已封禁 IP」在 nft + 时长模式下以集合元素为准，不再虚高。
- 修复「规则配置」关键词标签与输入框之间缺少间距的问题。

### V1.6.0

- 封禁后端迁移到原生 nftables：独立 `table inet blockadeip`，`prerouting` / `priority raw`。
- 支持 `flags timeout` 封禁超时（`ban_time`）。
- 重启自动重建表并批量恢复封禁列表（单进程 `nft -f -`，显著降低小内存设备开销）。
- 停用服务 / 关闭开关会移除 nft 表，立即解除全部拦截。
- 保留 ipset / iptables 回退，旧系统行为不变。
- 依赖改为 `nftables-json + kmod-nft-core`，不再强制 iptables / ipset。
- `check-env.sh` 改为检测 nft / fw4。

### V1.5.0

- 通知层抽象，新增通用 Webhook 推送。
- Webhook 支持自定义 URL、请求方法、Content-Type、Headers、Body。
- 支持占位符 `{ip}` `{reason}` `{count}` `{time}` `{title}` 及 `{*_json}` `{*_url}` `{json}`。
- Bark 配置保持向后兼容（section 仍为 `push`）。
- 通知发送移出封禁锁，HTTP 超时不再阻塞封禁。
- HTTP 客户端自动选择 `uclient-fetch` / `curl` / `wget`。
- 新增 `save_notify` / `test_notify` RPC，`bark_test` 保留为别名。
- LuCI 将「Bark推送」页改为「通知推送」。

### V1.4.3

- 修复 LuCI 已封禁列表为空问题。
- 修复 `banlist-json` 输出异常导致 ubus 返回 `Invalid argument` 的问题。
- 将 banlist 数据生成逻辑固化到 rpcd 层，确保 `ubus call blockadeip banlist` 始终输出纯 JSON。
- 清理 rpcd 可执行备份文件，避免出现 `blockadeip.bak` 对象。
- 登录页入口按钮严格按实测兼容样式注入。
- 已封禁列表原因列优先显示中文 label。

### V1.4.2

- 修复已封禁列表原因列显示英文的问题。
- 修复 banlist-json JSON 输出异常。
- 登录页按钮按实测样式注入。

### V1.4.1

- 修复 Bark 提示堆叠。
- 修复 Bark 推送内容中 `\n` 被当作字符串显示的问题。
- 修复已封禁列表为空问题。
- 优化表格排版细节。

### V1.4

- 新增 Bark 推送配置。
- 新增 Bark 测试推送。
- 新增 LuCI 登录页公开入口。
- 完善中文 Changelog。
- 修复表格错位和排序。
- 模拟测试封直接触发封禁。
- 新增清空日志。
- TAB 保存后保留当前页。

### V1.3

- 新增持久化封禁记录。
- 新增匹配关键词配置。
- 新增服务开关和自启动开关。
- 新增局域网保护。
- 新增 Bark 配置框架。
- 新增已封禁列表封禁时间。

### V1.2

- 支持重启后恢复封禁。
- 支持自动识别 WEB 爆破。
- 修复公开页记录持久化问题。

### V1.1

- 新增 LuCI 基础管理面板。
- 新增公开页。
- 支持手动添加 / 删除封禁 IP。

---

## 项目地址

```text
https://github.com/sogbtt/openwrt-blockadeip-ipk
```

---

## 免责声明

本项目用于 OpenWrt / ImmortalWrt 环境下的安全防护与运维辅助。

使用前请确认：

- 你了解当前设备网络结构
- 你了解公网暴露服务的风险
- 你不会误封自己的管理地址
- 你已确认公开页暴露范围符合自己的运维策略

因误配置、误封禁、公开页暴露、第三方服务推送等造成的问题，请自行承担风险。
