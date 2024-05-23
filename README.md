# API远程日志实时打印扩展

### 支持特性

- [x] 支持传输日志压缩（改进传输效率，尤其在日志体积较大时）
- [x] 端到端日志加密传输（避免在未使用`https`或使用第三方服务端中转时泄漏敏感日志的风险）
- [x] 支持域名监听名单（避免监听无关传输，防止 ClientID 泄漏）
- [x] 遵循`Manifest V3`规范（兼容最新的浏览器扩展规范）

### 配套服务端

[socket-log-server](https://github.com/NHZEX/socket-log-server)

> 各个新特性均不支持 [nodejs 版本的服务端](https://github.com/luofei614/SocketLog/tree/master/server)

### 配套框架驱动

composer require [zxin/socket-log-thinkphp](https://github.com/NHZEX/socket-log-thinkphp)

> 各个新特性均不支持`thinkphp`原版驱动

### 资料

Fork [luofei614/SocketLog](https://github.com/luofei614/SocketLog)
