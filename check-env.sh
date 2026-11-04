#!/bin/sh

TEST_IP="203.0.113.254"
TMP_SET="blockadeip_check_tmp"
OK=1
WARN=0

say() { echo "$@"; }
pass() { echo "[OK] $1"; }
warn() { echo "[WARN] $1"; WARN=1; }
fail() { echo "[FAIL] $1"; OK=0; }

cleanup() {
    nft delete table inet blockadeip_check_tmp 2>/dev/null
    iptables -t raw -D PREROUTING -m set --match-set "$TMP_SET" src -j DROP 2>/dev/null
    ipset destroy "$TMP_SET" 2>/dev/null
}
trap cleanup EXIT

say "===== BlockadeIP 环境适配检测 ====="

[ -f /etc/openwrt_release ] && {
    . /etc/openwrt_release
    say "系统版本: ${DISTRIB_DESCRIPTION:-unknown}"
    say "目标平台: ${DISTRIB_TARGET:-unknown}"
    say "系统架构: ${DISTRIB_ARCH:-unknown}"
} || warn "未检测到 /etc/openwrt_release，可能不是标准 OpenWrt"

say "内核版本: $(uname -r 2>/dev/null)"
say

say "----- nftables（推荐后端） -----"
if command -v nft >/dev/null 2>&1; then
    pass "nft 已安装: $(nft --version 2>/dev/null | head -1)"
    nft list ruleset >/dev/null 2>&1 && pass "nft 规则集可读（需要 CAP_NET_ADMIN）" || fail "nft 规则集不可读"
    if nft -f - >/dev/null 2>&1 <<EOF
table inet blockadeip_check_tmp {
        set v4 {
                type ipv4_addr
                flags timeout
                size 65536
        }
        chain prerouting {
                type filter hook prerouting priority raw; policy accept;
                ip saddr @v4 drop
        }
}
EOF
    then
        pass "独立 inet 表 + prerouting/raw + timeout 集合创建成功"
        nft add element inet blockadeip_check_tmp v4 "{ $TEST_IP timeout 5s }" 2>/dev/null \
            && pass "nft 集合添加测试 IP 成功" || fail "nft 集合添加测试 IP 失败"
        nft delete element inet blockadeip_check_tmp v4 "{ $TEST_IP }" 2>/dev/null \
            && pass "nft 集合删除测试 IP 成功" || warn "nft 集合删除测试 IP 失败"
    else
        fail "nft 表创建失败（内核可能缺少 kmod-nft-core / kmod-nft-set）"
    fi
    cleanup
else
    warn "nft 未安装，将回退到 ipset/iptables 后端"
fi

say
say "----- fw4（OpenWrt 24.10+ 默认防火墙） -----"
command -v fw4 >/dev/null 2>&1 && pass "fw4 存在" || warn "未检测到 fw4，可能使用旧版 fw3"

say
say "----- ipset / iptables（旧后端，可选） -----"
command -v ipset >/dev/null 2>&1 && pass "ipset 已安装: $(ipset --version 2>/dev/null | head -1)" || warn "ipset 未安装（新版本不再需要）"
command -v iptables >/dev/null 2>&1 && pass "iptables 已安装: $(iptables -V)" || warn "iptables 未安装（新版本不再需要）"

say
say "----- 通知推送 -----"
command -v uclient-fetch >/dev/null 2>&1 && pass "uclient-fetch 可用（Webhook 首选客户端）" || warn "uclient-fetch 缺失，将回退 curl/wget"
command -v curl >/dev/null 2>&1 && pass "curl 可用" || true
command -v wget >/dev/null 2>&1 && pass "wget 可用" || true
[ -f /etc/ssl/certs/ca-certificates.crt ] && pass "CA 证书存在（HTTPS 严格校验可用）" || warn "缺少 ca-bundle，HTTPS Webhook 可能需要安装 ca-bundle 或开启跳过证书校验"

say
say "----- 基础组件 -----"
command -v logread >/dev/null 2>&1 && pass "logread 可用" || fail "logread 不可用"
command -v logger >/dev/null 2>&1 && pass "logger 可用" || warn "logger 不可用，模拟测试功能可能受限"
command -v rpcd >/dev/null 2>&1 && pass "rpcd 可用" || warn "rpcd 不存在，LuCI 管理面板可能不可用"
[ -d /www ] && pass "/www Web 根目录存在" || warn "/www 不存在，公开页可能不可用"

if ps | grep -E 'nginx|uhttpd|openresty' | grep -v grep >/dev/null 2>&1; then
    say "Web 服务:"
    ps | grep -E 'nginx|uhttpd|openresty' | grep -v grep
else
    warn "未检测到 nginx/uhttpd/openresty 进程"
fi

say
say "===== 检测结论 ====="

if [ "$OK" = "1" ] && [ "$WARN" = "0" ]; then
    say "结论: 推荐使用。当前系统完全满足 BlockadeIP 的核心运行条件。"
elif [ "$OK" = "1" ]; then
    say "结论: 基本可用。核心封禁能力满足，但部分通知 / LuCI / 公开页功能可能需要补依赖。"
else
    say "结论: 不建议直接使用。当前系统缺少 nftables 等关键能力。"
fi
