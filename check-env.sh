#!/bin/sh

TMP_SET="blockadeip_check_tmp"
TEST_IP="203.0.113.254"
OK=1
WARN=0

say() { echo "$@"; }
pass() { echo "[OK] $1"; }
warn() { echo "[WARN] $1"; WARN=1; }
fail() { echo "[FAIL] $1"; OK=0; }

cleanup() {
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

command -v iptables >/dev/null 2>&1 && pass "iptables 已安装: $(iptables -V)" || fail "iptables 未安装"
iptables -t raw -S >/dev/null 2>&1 && pass "iptables raw 表可用" || fail "iptables raw 表不可用"

command -v ipset >/dev/null 2>&1 && pass "ipset 已安装: $(ipset --version 2>/dev/null | head -1)" || fail "ipset 未安装"

if command -v ipset >/dev/null 2>&1; then
    ipset create "$TMP_SET" hash:ip 2>/dev/null && pass "ipset 临时集合创建成功" || fail "ipset 临时集合创建失败"
    ipset add "$TMP_SET" "$TEST_IP" 2>/dev/null && pass "ipset 添加测试 IP 成功" || fail "ipset 添加测试 IP 失败"
fi

if iptables -t raw -I PREROUTING -m set --match-set "$TMP_SET" src -j DROP 2>/dev/null; then
    pass "raw PREROUTING + ipset 入口规则测试成功"
else
    fail "raw PREROUTING + ipset 入口规则测试失败"
fi

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
    say "结论: 基本可用。核心封禁能力满足，但部分 LuCI / 公开页功能可能需要补依赖。"
else
    say "结论: 不建议直接使用。当前系统缺少 iptables raw / ipset 等关键能力。"
fi
