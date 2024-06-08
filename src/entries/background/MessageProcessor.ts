import {
    notifications,
    set_e2e_state
} from "~/utils/helper";

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
        const addContent = new TextEncoder().encode(`SL-E2E_${this.#clientId}`)
        this.#aseAdd = await self.crypto.subtle.digest(
            'SHA-256',
            addContent.buffer
        )

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
            await set_e2e_state('端到端活动中')
            console.info('[e2e] is enable')
        } else {
            this.#aseKey = null
            this.#enableE2E = false
            await set_e2e_state('')
        }
        this.#e2eErrorCount = 0
    }

    async disableE2E ()
    {
        console.info('[e2e] is soft disable')
        this.#aseKey = null
        this.#enableE2E = false
        await set_e2e_state('端到端已禁用')
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
        console.debug(binary)
        const flags = dv.getUint16(2)
        const isCompress = (flags & 0x0001) !== 0
        const isEncryption = (flags & 0x0002) !== 0
        console.debug({
            flags,
            isCompress,
            isEncryption,
        })

        if (isEncryption && !this.#enableE2E) {
            return false
        }

        let plaintext
        if (isEncryption) {
            try {
                plaintext = await this.decryptMessage(binary.slice(4))
                this.#e2eErrorCount = 0
                console.debug(plaintext)
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
                console.debug(plaintext)
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

    async decryptMessage (binary: ArrayBuffer): Promise<ArrayBuffer | null> {
        if (this.#aseKey === null) {
            return null
        }

        const iv = binary.slice(0, 12)
        const ciphertext = binary.slice(12)

        return await self.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv,
                additionalData: this!.#aseAdd,
                tagLength: 128,
            },
            this.#aseKey,
            ciphertext,
        );
    }
}
