import {ClientIdParamMode, CompatibleTabIdMode} from "~/enum/socket-log-options";

interface SocketAddress {
    host: string,
    path: string,
    port: number,
    tls: boolean,
}

type SocketClientId = string

type SocketEnableListen = boolean

type SocketEnableClientHeartbeat = boolean

type literalTrueOrFalse = 'on' | 'off'

interface ClientEndToEndConfig {
    key: string,
}

interface SocketLogOptions {
    defaultTabIdMode: CompatibleTabIdMode,
    defaultE2EConfig: ClientEndToEndConfig,
}

interface SocketServerItem {
    id: string,
    name: string,
    url: string,
    clientId: string,
    socketHeartbeat: SocketEnableClientHeartbeat,
    clientIdParamMode: ClientIdParamMode,
}
