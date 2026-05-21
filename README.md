# OpenWrt-BlockadeIP IPK

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
