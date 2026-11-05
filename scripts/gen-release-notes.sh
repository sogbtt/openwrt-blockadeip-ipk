#!/bin/sh
# 生成 GitHub / Gitea Release 说明
#
# 用法：
#   scripts/gen-release-notes.sh <tag> [版本号] [发布号]
#
# 逻辑：
#   1. docs/releasenotes/<tag>.md 存在 -> 用它作为正文
#   2. 否则 -> 从上一个 tag 到当前 tag 的提交按 feat/fix/... 分类生成
#   3. 追加「安装」区块与 Full Changelog 链接
#
# 依赖：git（getopt 不依赖，BusyBox 可运行）

set -eu

TAG="${1:-}"
VERSION="${2:-}"
PKG_RELEASE="${3:-1}"

if [ -z "$TAG" ]; then
        echo "usage: $0 <tag> [version] [release]" >&2
        exit 1
fi

# 未显式传入版本号时，从 tag 去掉前缀 v 推断
[ -n "$VERSION" ] || VERSION="$(printf '%s' "$TAG" | sed 's/^v//')"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NOTES_FILE="$REPO_ROOT/docs/releasenotes/$TAG.md"

# 服务地址：Gitea 与 GitHub 都会注入 GITHUB_SERVER_URL
SERVER_URL="${GITHUB_SERVER_URL:-https://github.com}"
REPO_PATH="${GITHUB_REPOSITORY:-}"

print_install_block() {
        cat <<EOF
## 安装

适用系统：OpenWrt / ImmortalWrt 24.10+（架构 \`all\`，x86_64 / ARM 通用）

\`\`\`sh
opkg install blockadeip_${VERSION}-r${PKG_RELEASE}_all.ipk
opkg install luci-app-blockadeip_${VERSION}-r${PKG_RELEASE}_all.ipk
/etc/init.d/blockadeip enable
/etc/init.d/blockadeip start
/etc/init.d/rpcd restart
\`\`\`
EOF
}

print_auto_changelog() {
        # 上一个 tag（当前 tag 的父提交方向上最近的一个）
        prev="$(git describe --tags --abbrev=0 "${TAG}^" 2>/dev/null || true)"
        if [ -n "$prev" ]; then
                range="${prev}..${TAG}"
                echo "## 变更内容"
                echo
                echo "自 \`${prev}\` 以来的改动："
                echo
        else
                range="$TAG"
                echo "## 变更内容"
                echo
        fi

        subjects="$(git log "$range" --no-merges --pretty=format:'%s' 2>/dev/null || true)"
        if [ -z "$subjects" ]; then
                echo "- 本次发布无可用的提交信息。"
                echo
                return 0
        fi

        known='^(feat|fix|perf|refactor|docs|test|build|ci|chore)(\([^)]*\))?: '

        for spec in \
                'feat|新功能' \
                'fix|问题修复' \
                'perf|性能优化' \
                'refactor|代码重构' \
                'docs|文档' \
                'build|构建' \
                'ci|持续集成'
        do
                prefix="${spec%%|*}"
                title="${spec#*|}"
                lines="$(printf '%s\n' "$subjects" | grep -E "^${prefix}(\([^)]*\))?: " || true)"
                [ -n "$lines" ] || continue
                {
                        echo "### ${title}"
                        printf '%s\n' "$lines" | sed -E "s/^${prefix}(\(([^)]*)\))?: /- /"
                        echo
                }
        done

        other="$(printf '%s\n' "$subjects" | grep -vE "$known" || true)"
        if [ -n "$other" ]; then
                {
                        echo "### 其他"
                        printf '%s\n' "$other" | sed -E 's/^([a-z]+)(\([^)]*\))?: /- /'
                        echo
                }
        fi
}

print_compare_link() {
        [ -n "$REPO_PATH" ] || return 0
        prev="$(git describe --tags --abbrev=0 "${TAG}^" 2>/dev/null || true)"
        [ -n "$prev" ] || return 0
        printf '**完整对比**：[%s...%s](%s/%s/compare/%s...%s)\n\n' \
                "$prev" "$TAG" "$SERVER_URL" "$REPO_PATH" "$prev" "$TAG"
}

if [ -f "$NOTES_FILE" ]; then
        cat "$NOTES_FILE"
        echo
else
        echo "## BlockadeIP $TAG"
        echo
        print_auto_changelog
fi

print_install_block
echo
print_compare_link
