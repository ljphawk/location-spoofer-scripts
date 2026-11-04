# WLOC v2 scripts and modules

公开提供 Shadowrocket 等第三方代理客户端需要下载的脚本和模块。App 项目独立保存在私有仓库，本文库不包含 App 源码或设备日志。

## 小火箭订阅

[直连模块订阅](https://raw.githubusercontent.com/ljphawk/location-spoofer-scripts/main/ThirdParty/WlocScripts/modules/direct/wloc.module?v=1.0.9-control1)

[镜像模块订阅](https://gh-proxy.org/https://raw.githubusercontent.com/ljphawk/location-spoofer-scripts/main/Resources/ThirdPartyProxyModules/wloc.module?v=1.0.9-control1)

打开小火箭「配置 → 模块」，停用旧 WLOC 模块，通过右上角「＋」粘贴以上地址下载并启用新版。确保当前配置开启 HTTPS 解密并信任小火箭证书，随后重新连接小火箭，在 App 内检测连接。

v2 清除操作会持久保存明确的禁用状态、核验存储写入，不再回退到模块参数中的坐标。需要同时更新设置和响应脚本；以上模块会引用配套脚本。

## 构建和验证

```sh
cd ThirdParty/WlocScripts
npm run build
npm test
node build.js --check
```

[模块与接口说明](docs/THIRD_PARTY_MODULES.md) · [源码来源](ThirdParty/WlocScripts/UPSTREAM.md) · [第三方声明](ThirdParty/WlocScripts/THIRD_PARTY_NOTICES.md)

基于 xweiba/location-spoofer 及其保留的 Yu9191 WLOC 脚本；原作者署名、上游固定版本和 AGPL-3.0 许可证均保留。
