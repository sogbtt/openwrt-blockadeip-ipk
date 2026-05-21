include $(TOPDIR)/rules.mk

PKG_NAME:=blockadeip
PKG_VERSION:=1.2.0
PKG_RELEASE:=1
PKG_MAINTAINER:=sogbtt
PKG_LICENSE:=MIT
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/blockadeip
  SECTION:=net
  CATEGORY:=Network
  TITLE:=BlockadeIP early inbound blocker
  DEPENDS:=+iptables +ipset +jsonfilter +logd +rpcd
endef

define Package/blockadeip/description
BlockadeIP is an OpenWrt early inbound blocking helper. It uses iptables raw PREROUTING with ipset by default, provides a procd service, rpcd backend, persistent ban list, audit log and a static public deterrence page under /www/blockadeip/.
endef

define Build/Compile
endef

define Package/blockadeip/conffiles
/etc/config/blockadeip
/etc/blockadeip/banlist
endef

define Package/blockadeip/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/blockadeip $(1)/etc/config/blockadeip
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/blockadeip $(1)/etc/init.d/blockadeip
	$(INSTALL_DIR) $(1)/etc/blockadeip
	$(INSTALL_DATA) ./files/etc/blockadeip/banlist $(1)/etc/blockadeip/banlist
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./files/usr/sbin/blockadeip $(1)/usr/sbin/blockadeip
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./files/usr/libexec/rpcd/blockadeip $(1)/usr/libexec/rpcd/blockadeip
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./files/usr/share/rpcd/acl.d/blockadeip.json $(1)/usr/share/rpcd/acl.d/blockadeip.json
	$(INSTALL_DIR) $(1)/www/blockadeip
	$(INSTALL_DATA) ./files/www/blockadeip/index.html $(1)/www/blockadeip/index.html
endef

$(eval $(call BuildPackage,blockadeip))
