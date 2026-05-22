# OpenWrt-BlockadeIP

> 基于 `iptables raw PREROUTING + ipset` 的 OpenWrt / ImmortalWrt 早期入站封禁 LuCI 插件。  
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
- 仅创建临时 ipset / 临时 raw 测试规则，并在结束后自动清理

---

## 适用环境说明

### 已验证环境

| 项目 | 已验证环境 |
|---|---|
| 系统 | OpenWrt 24.10.0 |
| 内核 | Linux 6.12.18 |
| 架构 | x86/64 |
| Web 服务 | nginx / luci-nginx |
| 防火墙环境 | iptables v1.8.10 `(nf_tables)` 兼容模式 |
| 封禁后端 | iptables raw + ipset |
| LuCI | LuCI 25.x / Argon 主题 |

### 推荐环境

| 项目 | 推荐要求 |
|---|---|
| 系统 | OpenWrt / ImmortalWrt 23.05+ / 24.10+ |
| 架构 | x86/64、rockchip/armv8、armsr/armv8 等 |
| 防火墙 | 支持 iptables raw 表 |
| 高性能集合 | 支持 ipset |
| 日志系统 | 支持 logread / logger |
| Web 管理 | LuCI + rpcd |
| 公开页 | `/www` 目录可被 nginx / uhttpd / openresty 访问 |

### 预计可用场景

| 场景 | 预计支持情况 |
|---|---|
| 传统 iptables 防火墙 | 支持，前提是 raw 表和 ipset 可用 |
| firewall4 / nftables 系统 | 支持，前提是 iptables-nft 兼容层可正常使用 raw + ipset |
| iptables v1.8.x `(nf_tables)` | 推荐，已验证 |
| LuCI 跑在 nginx / luci-nginx | 支持，已验证 |
| LuCI 跑在 uHTTPd | 理论支持，公开页放在 `/www/blockadeip/` |
| 端口转发 / DNAT 场景 | 支持，这是本项目重点场景 |
| Docker / OpenResty / Alist / WebDAV 暴露在公网 | 可通过日志关键词扩展识别 |

### 不适用或需谨慎的环境

| 环境 | 说明 |
|---|---|
| 无 iptables raw 表 | 不建议使用，核心早期封禁能力不可用 |
| 无 ipset | 不建议使用，会失去高性能集合封禁能力 |
| 极简固件缺少 rpcd / LuCI | 核心脚本可能可用，但 LuCI 面板不可用 |
| 非 OpenWrt 系统 | 不保证可用 |
| 纯 nftables 且完全无 iptables 兼容层 | 暂不作为主要支持目标 |
| 不理解公网管理口风险的环境 | 不建议暴露 LuCI / SSH 到公网 |

---

## 项目截图

> 请将截图上传到仓库 `docs/images/` 目录，然后替换下面图片路径。

### LuCI 管理面板

![LuCI 管理面板](docs/images/luci-overview.png)

### 已封禁列表

![已封禁列表](docs/images/banlist.png)

### 公开处刑页

![公开处刑页](docs/images/public-page.png)

### Bark 推送配置

![Bark 推送配置](docs/images/bark-config.png)

### LuCI 登录页入口按钮

![LuCI 登录页入口按钮](docs/images/login-button.png)

---

## 项目定位

OpenWrt-BlockadeIP 不是传统意义上的 firewall4 规则管理器，也不是 banIP 的替代品。

它的定位是：

> 在数据包进入路由器的最早阶段，通过 `raw PREROUTING` 对高风险来源 IP 进行快速丢弃，绕开复杂 zone / forward / DNAT 链路带来的命中不确定性。

适合这类用户：

- 有公网 IP / DDNS
- 暴露过 SSH、LuCI、ttyd、WebDAV、Alist、OpenResty、Docker 服务
- 遇到过端口转发后普通防火墙规则不生效
- 想要 LuCI 可视化管理封禁 IP
- 想要公开威慑页展示被拦截来源
- 想要 Bark 推送封禁通知

---

## 核心功能

### 1. 早期入站封禁

默认使用：

```sh
iptables -t raw -I PREROUTING -m set --match-set blockadeip src -j DROP
```

封禁 IP 时写入：

```sh
ipset add blockadeip <IP>
```

优势：

- 比 filter / FORWARD 更早
- 比常规 zone 链路更直接
- 适合 DNAT / 端口转发场景
- 大量 IP 时比“一 IP 一规则”更高效

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

### 7. Bark 推送

支持 Bark 推送封禁通知。

可配置：

- 启用 / 停用 Bark 推送
- Bark 服务器地址
- 推送模板
- 测试推送
- 自定义模板

内置模板：

- 精简模板
- 完整模板
- 运维模板
- 自定义模板

---

### 8. 持久化封禁

核心文件：

```text
/etc/blockadeip/banlist
/etc/blockadeip/records.tsv
/etc/blockadeip/blockadeip.log
```

说明：

| 文件 | 作用 |
|---|---|
| `/etc/blockadeip/banlist` | 当前有效封禁 IP |
| `/etc/blockadeip/records.tsv` | IP、封禁时间、次数、原因、中文标签 |
| `/etc/blockadeip/blockadeip.log` | 持久化审计日志 |

重启后会自动：

1. 读取 `/etc/blockadeip/banlist`
2. 恢复到 ipset
3. 恢复 raw PREROUTING 总入口规则
4. 生成公开页数据

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
raw PREROUTING
  ↓
匹配 ipset 黑名单
  ↓
DROP
```

也就是：

```sh
iptables -t raw -I PREROUTING -m set --match-set blockadeip src -j DROP
```

这意味着：

- 不等 DNAT
- 不依赖 zone 判断
- 不依赖具体服务端口
- 不依赖 Docker 网络路径
- 只要来源 IP 命中黑名单，直接在早期丢弃

---

### 为什么使用 ipset？

如果每个 IP 都写一条规则：

```sh
iptables -t raw -A PREROUTING -s 1.2.3.4 -j DROP
iptables -t raw -A PREROUTING -s 5.6.7.8 -j DROP
```

IP 多了以后规则会膨胀，性能和维护性都会下降。

BlockadeIP 使用：

```sh
ipset create blockadeip hash:ip
ipset add blockadeip 1.2.3.4
```

然后只保留一条总入口规则：

```sh
iptables -t raw -I PREROUTING -m set --match-set blockadeip src -j DROP
```

这样更适合 100 / 500 / 更多 IP 的封禁场景。

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
- 配置 Bark 推送
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

### 查看 raw 入口规则

```sh
iptables -t raw -S PREROUTING | grep blockadeip
```

### 查看 ipset

```sh
ipset list blockadeip
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
