import {notifications,} from "~/utils/helper";
import {saveStatusValues} from "~/stores/StatusStore";

const addPrefixAscii = 'SL-E2E_'
const addPrefixBinary = (new TextEncoder().encode(addPrefixAscii))

export
class MessageProcessor {

    #clientId: string | null = null

    #aseKey: CryptoKey | null = null

    #aseAdd?: ArrayBuffer
    #enableE2E: boolean = false
    #e2eErrorCount: number = 0

    constructor () {
    }

    async loadE2EConfig (clientId: string, config: { key: string })
    {
        this.#clientId = clientId
        this.#aseAdd = await this.#resolveAdditionalData(this.#clientId)

        if (config?.key && config.key.length >= 8) {
            const keyBinary = new TextEncoder().encode(config.key)
            const keyHash = await self.crypto.subtle.digest(
                'SHA-256',
                keyBinary.buffer
            )
            this.#aseKey = await self.crypto.subtle.importKey(
                'raw',
                keyHash,
                {
                    name: 'AES-GCM',
                },
                true,
                ['decrypt']
            )
            this.#enableE2E = true
            await saveStatusValues({
                e2eStatusMessage: '端到端已激活',
            })
            console.info('[e2e] is enable')
        } else {
            this.#aseKey = null
            this.#enableE2E = false
            await saveStatusValues({
                e2eStatusMessage: '',
            })
        }
        this.#e2eErrorCount = 0
    }

    async disableE2E ()
    {
        console.info('[e2e] is soft disable')
        this.#aseKey = null
        this.#enableE2E = false
        await saveStatusValues({
            e2eStatusMessage: '端到端已禁用',
        })
    }

    async #resolveAdditionalData(content: string|ArrayBuffer)
    {
        let addContent
        if (content instanceof ArrayBuffer) {
            const body = new Uint8Array(content)
            const prefix = addPrefixBinary
            const result = new Uint8Array(body.length + prefix.length)
            result.set(prefix, 0);
            result.set(body, prefix.length);
            addContent = result.buffer
        } else {
            addContent = new TextEncoder().encode(`${addPrefixAscii}${content}`).buffer
        }
        return  await self.crypto.subtle.digest(
            'SHA-256',
            addContent
        )
    }

    async parseBinaryMessage (binary: ArrayBuffer): Promise<string | false>
    {
        if (binary.byteLength < 2) {
            // 不可处理二进制
            return false
        }
        const dv = new DataView(binary)
        if (dv.getUint16(0) !== 0x0521) {
            // 不可处理二进制
            return false
        }
        console.debug('binary', binary)
        const flags = dv.getUint16(2)
        const isCompress = (flags & 0x0001) !== 0
        const isEncryption = (flags & 0x0002) !== 0
        const useE2EId = (flags & 0x0004) !== 0

        if (isEncryption && !this.#enableE2E) {
            return false
        }

        let e2eId: ArrayBuffer|undefined

        if (useE2EId) {
            const useE2ELen = useE2EId ? dv.getUint8(4) : 0
            e2eId = binary.slice(4 + 1, 4 + 1 + useE2ELen)
            binary = binary.slice(4 + 1 + useE2ELen)
        } else {
            binary = binary.slice(4)
        }

        console.debug({
            flags,
            isCompress,
            isEncryption,
            useE2EId,
            e2eId,
        })

        let plaintext
        if (isEncryption) {
            try {
                plaintext = await this.#decryptMessage(binary, { e2eId })
                this.#e2eErrorCount = 0
                console.debug('plaintext', plaintext)
            } catch (e) {
                this.#e2eErrorCount++
                console.warn('decryptMessage fail')
                console.dir(e)
                notifications(
                    '日志格式无法解析',
                    `加密内容解密失败 (${e})`
                )
                if (this.#e2eErrorCount >= 5) {
                    await this.disableE2E()
                    notifications(
                        '端到端加密通信已经被禁用',
                        `解密失败次数达到阈值，端到端触发禁用，重新连接或者更新密钥重新激活该功能。`
                    )
                }
                return false;
            }
        }

        if (isCompress) {
            try {
                const ds = new DecompressionStream("deflate");
                const writer = ds.writable.getWriter()
                writer.write(plaintext).catch(e => {
                    throw new Error('decompress failed, writer error: ' + e)
                })
                writer.close().catch(e => {
                    throw new Error('decompress failed, writer close error: ' + e)
                })
                plaintext = await new Response(ds.readable).arrayBuffer();
                console.debug('decompression', plaintext)
            } catch (e) {
                console.warn('decompressionMessage fail')
                console.dir(e)
                notifications(
                    '日志格式无法解析',
                    `内容无法正确解压 (${e})`
                )
                return false
            }
        }

        try {
            return new TextDecoder("utf-8", {
                fatal: true,
            }).decode(plaintext ?? undefined)
        } catch (e) {
            console.warn('decodeMessage fail')
            console.dir(e)
            notifications(
                '日志格式无法解析',
                `内容解码UTF-8失败 (${e})`
            )
            return false;
        }
    }

    async #decryptMessage (binary: ArrayBuffer, options: { e2eId?: ArrayBuffer }): Promise<ArrayBuffer | null> {
        if (this.#aseKey === null) {
            return null
        }

        const iv = binary.slice(0, 12)
        const ciphertext = binary.slice(12)

        const additionalData = options.e2eId !== undefined
            ? (await this.#resolveAdditionalData(options.e2eId))
            : this!.#aseAdd

        return await self.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv,
                additionalData,
                tagLength: 128,
            },
            this.#aseKey,
            ciphertext,
        );
    }
}
