import { invokeConversation } from './back_bedrock.mjs'
import s from './back_server.mjs'

const server = s()

server.front('./static/')

server.api('/send', async (event) => {
   const res = await invokeConversation(event.messages)

   return {
      statusCode: 200,
      body: JSON.stringify({
         result: res
      })
   }
})

server.start()