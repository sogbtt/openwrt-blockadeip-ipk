include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-blockadeip
PKG_VERSION:=1.1.0
PKG_RELEASE:=1
PKG_MAINTAINER:=sogbtt
PKG_LICENSE:=MIT
PKGARCH:=all

LUCI_TITLE:=LuCI support for BlockadeIP
LUCI_DEPENDS:=+blockadeip +luci-base
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
