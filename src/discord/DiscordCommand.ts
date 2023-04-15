import { Buffer, nacl, oak } from '../deps.ts';
import { DiscordInteractionCommand } from '../model/Config.ts';

export default class DiscordCommand {
    public constructor(interactionCommand: DiscordInteractionCommand) {
        if (!interactionCommand.active) return;

        this.startWebServer(interactionCommand);
    }

    private async startWebServer(interactionCommand: DiscordInteractionCommand) {
        const app = new oak.Application();
        const port = interactionCommand.applicationEndpointPort;
        const publicKey = interactionCommand.applicationPublicKey;

        app.use(async (ctx) => {
            try {
                const signature = ctx.request.headers.get('X-Signature-Ed25519') ?? '';
                const timestamp = ctx.request.headers.get('X-Signature-Timestamp') ?? '';

                const body = await ctx.request.body({ type: 'text' }).value;
                const isVerified = nacl.sign_detached_verify(Buffer.from(timestamp + body), Buffer.from(signature, 'hex'), Buffer.from(publicKey, 'hex'));

                if (!isVerified) {
                    ctx.response.status = 401;
                    ctx.response.body = 'invalid request signature';
                    return;
                }

                const jsonBody = JSON.parse(body);
                if (jsonBody.type === 1) {
                    ctx.response.status = 200;
                    ctx.response.body = {
                        type: 1,
                    };
                }
            } catch (_ignore) {
                ctx.response.status = 400;
            }
        });

        app.addEventListener('listen', () => {
            console.log(`Listening on :${port}`);
        });

        await app.listen({ port: port });
    }
}
