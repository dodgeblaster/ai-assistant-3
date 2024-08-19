import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const sonnet = "anthropic.claude-3-5-sonnet-20240620-v1:0"
const haiku = 'anthropic.claude-3-haiku-20240307-v1:0'
const MODEL = haiku
const MAX_TOKENS = 1000
const TEMPERATURE = 0.1

export const invokeConversation = async (
    messages,
    temperature = TEMPERATURE,
    start = '',
    end = '') => {
  
    const client = new BedrockRuntimeClient({ region: "us-east-1" });
    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: MAX_TOKENS,
        messages: messages,
        temperature
    };

    if (end) {
        payload.inferenceConfig = {
            stopSequences: [end]
        }
    }

    if (start) {
        payload.messages.push({
            role: 'assistant',
            content: [{ type: 'text', text: start}]
        })
    }
 
    const command = new InvokeModelCommand({
        contentType: "application/json",
        body: JSON.stringify(payload),
        modelId: MODEL
    });
    const apiResponse = await client.send(command);
    const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
    const responseBody = JSON.parse(decodedResponseBody);
    return responseBody.content[0].text;
}


