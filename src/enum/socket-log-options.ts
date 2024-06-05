export enum ClientIdParamMode {
    Path = 'path',
    Query = 'query',
}

export const ClientIdParamModeLabel = new Map<string, string>(
    [
        [ClientIdParamMode.Path, '路径（兼容老版本）'],
        [ClientIdParamMode.Query, 'Query（新版推送服务端推荐）'],
    ]
)

export enum CompatibleTabIdMode {
    Off = 'off',
    Fake_9x6 = 'fake-9x6',
}
