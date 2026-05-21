# OpenWrt BlockadeIP IPK

BlockadeIP 是一个 OpenWrt 早期入站封禁工具。V1 默认使用 `iptables raw PREROUTING + ipset`，目标是在 DNAT、端口转发、fw4/iptables-nft 混合环境中，尽量绕开常规 zone 链路，在数据包刚进入系统时按来源 IP 丢弃。

## 目标环境

- OpenWrt 24.10.0
- x86/64
- iptables v1.8.x nf_tables 兼容模式
- ipset v7.x
- LuCI + rpcd
- Web 根目录 `/www`

## 在线编译

仓库内置 GitHub Actions：

```text
Actions -> Build OpenWrt BlockadeIP IPK -> Run workflow
```

产物会在 workflow 运行结束后出现在 Artifacts：

```text
openwrt-blockadeip-ipk-x86_64-24.10.0
```

包含：

```text
blockadeip_1.0.0-1_all.ipk
luci-app-blockadeip_1.0.0-1_all.ipk
```

## 安装

```sh
opkg install blockadeip_1.0.0-1_all.ipk luci-app-blockadeip_1.0.0-1_all.ipk
/etc/init.d/rpcd restart
/etc/init.d/blockadeip enable
/etc/init.d/blockadeip start
```

LuCI 菜单：

```text
服务 -> SSH安全卫士
```

公开威慑页：

```text
http://路由器IP/blockadeip/
```

## 主要文件

```text
/etc/config/blockadeip              配置
/etc/blockadeip/banlist             持久封禁列表
/usr/sbin/blockadeip                核心命令
/etc/init.d/blockadeip              procd 服务
/usr/libexec/rpcd/blockadeip        LuCI RPC 后端
/www/blockadeip/index.html          公开威慑页
/www/blockadeip/data.json           自动生成的公开数据
```

## 命令行

```sh
blockadeip init
blockadeip add 8.8.8.8
blockadeip del 8.8.8.8
blockadeip flush
blockadeip status-json
blockadeip banlist-json
blockadeip logs-json 100
```

## 设计说明

V1 优先使用：

```sh
iptables -t raw -I PREROUTING 1 -m set --match-set blockadeip src -j DROP
ipset add blockadeip <IP>
```

如果 ipset 后端不可用，会自动退化为独立 raw chain：

```sh
iptables -t raw -N BLOCKADEIP
iptables -t raw -I PREROUTING 1 -j BLOCKADEIP
iptables -t raw -A BLOCKADEIP -s <IP> -j DROP
```

