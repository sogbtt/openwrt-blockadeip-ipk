# OpenWrt BlockadeIP IPK

OpenWrt / ImmortalWrt early inbound blocker.

V1.2 features:

- Default backend: iptables raw PREROUTING + ipset.
- LuCI management page: status, autostart status, manual ban/unban, flush, logs, editable threshold/window.
- Persistent ban list: `/etc/blockadeip/banlist`.
- Public deterrence page: `/blockadeip/` under the existing Web root, no Docker/Nginx container required.
- Public page displays full source IPs and mapped reason labels such as `尝试SSH爆破`, `尝试WEB爆破`, `管理面板手动封禁`.
- Duplicate ban operations are idempotent and will not repeatedly append ban logs.
- GitHub Actions builds OpenWrt 24.10.0 x86/64 IPK packages online.
- V1.2 additionally restarts the daemon after threshold/window changes, avoids duplicate unban log pollution, and uses a FIFO-based logread listener for cleaner process shutdown.

Build:

1. Open Actions.
2. Run `Build OpenWrt BlockadeIP IPK`.
3. Download artifact `openwrt-blockadeip-ipk-x86_64-24.10.0`.

Install:

```sh
opkg install ./blockadeip_1.2.0-r1_x86_64.ipk
opkg install ./luci-app-blockadeip_1.2.0-r1_all.ipk
/etc/init.d/rpcd restart
/etc/init.d/nginx restart 2>/dev/null || /etc/init.d/uhttpd restart 2>/dev/null
/etc/init.d/blockadeip enable
/etc/init.d/blockadeip start
```

LuCI path:

```text
服务 -> SSH安全卫士
```

Public page:

```text
http://<router-host>/blockadeip/
```
