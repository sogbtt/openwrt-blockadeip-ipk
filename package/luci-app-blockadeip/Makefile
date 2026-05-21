include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-blockadeip
PKG_VERSION:=1.4.2
PKG_RELEASE:=1
PKG_LICENSE:=MIT
PKG_MAINTAINER:=sogbtt

LUCI_TITLE:=LuCI support for BlockadeIP
LUCI_DEPENDS:=+blockadeip +luci-base +rpcd +rpcd-mod-ucode
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
