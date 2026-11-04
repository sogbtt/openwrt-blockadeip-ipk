include $(TOPDIR)/rules.mk

PKG_NAME:=blockadeip
PKG_VERSION:=1.6.0
PKG_RELEASE:=1
PKG_LICENSE:=MIT
PKG_MAINTAINER:=sogbtt

include $(INCLUDE_DIR)/package.mk

define Package/blockadeip
  SECTION:=net
  CATEGORY:=Network
  TITLE:=BlockadeIP early inbound blocker
  PKGARCH:=all
  DEPENDS:=+nftables-json +kmod-nft-core +jsonfilter +rpcd +logd
endef

define Package/blockadeip/description
BlockadeIP uses nftables (independent inet table with a prerouting/raw priority chain) to block high-risk source IPs early, with persistent records, public deterrence page and LuCI RPC backend. ipset/iptables fallback is kept for legacy systems.
endef

define Build/Compile
endef

define Package/blockadeip/conffiles
/etc/config/blockadeip
/etc/blockadeip/banlist
/etc/blockadeip/records.tsv
/etc/blockadeip/blockadeip.log
/etc/blockadeip/webhook.body
/etc/blockadeip/webhook.headers
endef

define Package/blockadeip/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/blockadeip $(1)/etc/config/blockadeip
	$(INSTALL_DIR) $(1)/etc/blockadeip
	$(INSTALL_DATA) ./files/etc/blockadeip/banlist $(1)/etc/blockadeip/banlist
	$(INSTALL_DATA) ./files/etc/blockadeip/records.tsv $(1)/etc/blockadeip/records.tsv
	$(INSTALL_DATA) ./files/etc/blockadeip/blockadeip.log $(1)/etc/blockadeip/blockadeip.log
	$(INSTALL_CONF) ./files/etc/blockadeip/webhook.body $(1)/etc/blockadeip/webhook.body
	$(INSTALL_CONF) ./files/etc/blockadeip/webhook.headers $(1)/etc/blockadeip/webhook.headers
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/blockadeip $(1)/etc/init.d/blockadeip
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
