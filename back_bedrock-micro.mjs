import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const sonnet = 'anthropic.claude-3-5-sonnet-20240620-v1:0';
const haiku = 'anthropic.claude-3-haiku-20240307-v1:0';
const micro = 'amazon.nova-micro-v1:0';
const pro = 'amazon.nova-pro-v1:0';
const MODEL = pro;
const MAX_TOKENS = 1000;
const TEMPERATURE = 0.1;

export const invokeConversation = async (
    messages,
    temperature = TEMPERATURE,
    start = '',
    end = ''
) => {
    const client = new BedrockRuntimeClient({ region: 'us-east-1' });

    const payload = {
        messages: messages.map((x) => ({
            role: x.role,
            content: x.content.map((xx) => ({
                text: xx.text,
            })),
        })),

        inferenceConfig: {
            maxTokens: MAX_TOKENS,
            temperature,
        },
    };

    if (end) {
        payload.inferenceConfig.stopSequences = [end];
    }

    if (start) {
        payload.messages.push({
            role: 'assistant',
            content: [
                {
                    text: start,
                },
            ],
        });
    }

    const command = new InvokeModelCommand({
        contentType: 'application/json',
        body: JSON.stringify(payload),
        modelId: MODEL,
    });
    const apiResponse = await client.send(command);
    const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
    const responseBody = JSON.parse(decodedResponseBody);
    console.log(responseBody.output.message.content[0].text);
    return responseBody.output.message.content[0].text;
};
