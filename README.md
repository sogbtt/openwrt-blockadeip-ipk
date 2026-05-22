# OpenWrt-BlockadeIP

## 快速判断是否适合安装

在 OpenWrt/ImmortalWrt 设备 SSH 中执行：

```sh
curl -fsSL https://raw.githubusercontent.com/sogbtt/openwrt-blockadeip-ipk/refs/heads/main/check-env.sh | sh
```

该检测脚本只做环境兼容性检查，不安装插件，不修改 BlockadeIP 配置，不持久化防火墙规则。

## 适用环境说明

推荐环境：OpenWrt / ImmortalWrt 24.10.x，已验证 OpenWrt 24.10.0、Kernel 6.12.18、x86/64。项目主体为 Shell + LuCI JS + HTML，IPK 为架构无关包，预计可用于 rockchip/armv8、armsr/armv8 等平台。

核心依赖：iptables raw 表、ipset、logread/logger、rpcd、luci-base、jsonfilter。对于 firewall4/nftables 系统，只要 `iptables v1.8.x (nf_tables)` 兼容层下 raw PREROUTING + ipset 可用，本插件预计可用。

不适用或需谨慎：无 iptables raw 表、无 ipset/kmod-ipt-ipset、极简固件缺少 rpcd/LuCI/logread、非 OpenWrt 系统、仅 nftables 且完全不提供 iptables 兼容命令的环境。

> BlockadeIP 不是 firewall4/banIP 的替代品，而是面向端口转发、混合防火墙环境的 raw PREROUTING 早期入站拦截插件。


BlockadeIP 是一个面向 OpenWrt / ImmortalWrt 的早期入站封禁插件。它的核心目标不是替代 firewall4 / banIP，而是在复杂的 iptables-nft / nftables / fw4 混合环境下，继续保留经过实测有效的 **iptables raw PREROUTING + ipset** 拦截链路。

## 核心原理

插件默认创建一个 ipset：

```sh
ipset create blockadeip hash:ip family inet maxelem 65536 -exist
```

并在 raw PREROUTING 阶段插入总入口规则：

```sh
iptables -t raw -I PREROUTING -m set --match-set blockadeip src -j DROP
```

封禁 IP 时只向 ipset 写入元素，不再一 IP 一规则，兼顾早期丢包能力和高并发场景下的规则效率。

## V1.4.3 更新内容

- 固化已在设备上验证成功的 rpcd 层 `banlist_json` 修复：LuCI 已封禁列表不再依赖 `/usr/sbin/blockadeip banlist-json`，由 `/usr/libexec/rpcd/blockadeip` 直接读取 `/etc/blockadeip/banlist` 并结合 `/etc/blockadeip/records.tsv` 输出纯 JSON。
- 清理 rpcd 备份对象风险，避免 `/usr/libexec/rpcd/blockadeip.bak` 这类可执行备份文件被 rpcd 注册成额外 ubus 对象。
- 固化 Argon 登录页公开入口按钮的实测兼容方案：插入到登录按钮同一个 `div` 内，完整沿用已验证 CSS，仅使用 `/blockadeip/` 和“🛡️ 爆破拦截记录”文案。

## V1.4.2 更新内容

- 修复 `banlist-json` 输出异常导致已封禁列表无法正常渲染的问题。
- 已封禁列表“原因”列改为优先显示中文 label，例如“尝试WEB爆破 / 当前封禁中”。
- LuCI 登录页公开入口按钮按实测兼容结构注入：插入到登录按钮同一个 div 内，CSS 样式完整沿用，仅替换 href 与文案。

## V1.4.1 更新内容

- 修复 Bark 保存/测试提示堆叠问题。
- Bark 推送模板去掉 `\n` 字符串，改为一整串中文内容。
- 修复已封禁列表为空的展示问题。

## V1.4 更新内容

- 修复 Bark 推送配置保存后不生效的问题。
- 新增 Bark 测试推送按钮。
- Bark 推送模板改为中文模板，并在 LuCI 面板提供灰色预览。
- 新增 LuCI 登录页公开处刑入口按钮，可安装/移除，默认尝试注入 Argon/常见主题登录页。
- 完善 LuCI 概览页版本号、GitHub 地址和完整更新内容。
- 修复已封禁列表、日志记录表格错位问题。
- 已封禁列表按最新封禁时间倒序显示。
- 公开处刑页采用震慑红 + 强对比风格，表格区域固定高度滚动查看更多。
- 模拟测试封不再只写日志，会直接按当前阈值执行封禁验证。
- 日志记录页新增清空日志按钮，清空审计日志但不清空封禁列表。
- TAB 页面保存配置后保留在当前 TAB，不再跳回概览。
- README 改为中文说明。
- 修复包版本号由 `rr1` 改回标准 `r1`。

## V1.3 更新内容

- 公开页记录持久化，不再只依赖 `/tmp` 日志。
- 新增 `/etc/blockadeip/records.tsv` 记录 IP、封禁时间、次数、原因。
- LuCI 面板新增规则配置、封禁管理、日志记录、Bark 推送等 TAB。
- 日志匹配关键词开放配置，支持 WEB、SSH、补充关键词。
- 已封禁列表新增封禁时间和原因。
- 服务状态、自启动状态改为可操作开关。
- 手动封禁增加局域网 / 当前接口 IP / 当前网段保护。

## V1.2 更新内容

- 验证 LuCI/Web 登录失败日志可触发自动封禁。
- 修复重复封禁导致重复写日志的问题。
- 支持重启后从 `/etc/blockadeip/banlist` 恢复 ipset 和 raw 入口规则。

## 安装后路径

```text
/etc/config/blockadeip                  配置文件
/etc/blockadeip/banlist                 当前封禁 IP 列表
/etc/blockadeip/records.tsv             当前封禁记录
/etc/blockadeip/blockadeip.log          持久化审计日志
/usr/sbin/blockadeip                    核心命令
/usr/libexec/rpcd/blockadeip            LuCI RPC 后端
/www/blockadeip/                        公开处刑页
```

## LuCI 入口

安装 `luci-app-blockadeip` 后，在 LuCI 中进入：

```text
服务 → SSH安全卫士 / BlockadeIP
```

## GitHub Actions 在线编译

仓库已内置工作流：

```text
Actions → Build OpenWrt BlockadeIP IPK → Run workflow
```

默认编译目标为 OpenWrt 24.10.0 x86/64。

## 注意事项

- 公开页会展示完整 IP，请确认暴露范围符合你的运维策略。
- 登录页按钮注入属于主题文件兼容性增强功能，会自动备份原文件为 `.blockadeip.bak`。
- 手动封禁会拦截来源 IP，请不要尝试封禁当前管理网段或路由器自身 IP。