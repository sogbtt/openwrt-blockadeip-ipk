# OpenWrt BlockadeIP IPK

BlockadeIP is an OpenWrt/ImmortalWrt early inbound blocker. It uses `iptables -t raw PREROUTING` plus `ipset` to drop high-risk source IPs before common zone/FORWARD chains, and provides LuCI management plus a public deterrence page.

## V1.3.0 changes

- Persistent public records: fixed reboot issue where `total_banned > 0` but public list was empty.
- Added `/etc/blockadeip/records.tsv` and persistent `/etc/blockadeip/blockadeip.log`.
- LuCI shows version, GitHub URL and changelog.
- LuCI exposes editable WEB/SSH/custom log matching patterns.
- LuCI tables use fixed-height scrolling for large ban/log lists.
- Service enabled and autostart are switchable from LuCI.
- Manual add and simulation protect LAN/current interface IP ranges.
- Added simulation test button.
- Public page now uses high-contrast red deterrence styling.
- Added Bark push configuration tab.
- Added tooltips for common buttons.
- Ban list includes ban time and reason.

## Build

Use GitHub Actions:

`Actions -> Build OpenWrt BlockadeIP IPK -> Run workflow`

Target SDK currently: OpenWrt 24.10.0 x86/64.

Expected artifacts:

- `blockadeip_1.3.0-r1_all.ipk` or `blockadeip_1.3.0-r1_x86_64.ipk`
- `luci-app-blockadeip_1.3.0-r1_all.ipk`

## Install

```sh
opkg install ./blockadeip_1.3.0-r1_*.ipk
opkg install ./luci-app-blockadeip_1.3.0-r1_all.ipk
/etc/init.d/blockadeip enable
/etc/init.d/blockadeip restart
/etc/init.d/rpcd restart
/etc/init.d/nginx restart 2>/dev/null || /etc/init.d/uhttpd restart 2>/dev/null
```

LuCI path:

`Services -> SSH安全卫士 / BlockadeIP`

Public page:

`http://router-ip/blockadeip/`
