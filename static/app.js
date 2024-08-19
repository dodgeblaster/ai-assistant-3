let messages = []

function makeUserMessage(m) {
    return { role: 'user', content: [{ type: 'text', text: m }]}
  }


function makeAssistantMessage(m) {
    return { role: 'assistant', content: [{ type: 'text', text: m }]}
  }

async function callBedrock(prompt) {
    try {
        messages.push(makeUserMessage(prompt))

      
        const response = await fetch('/api/send', {
            method: 'POST',
            body: JSON.stringify({ messages }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const data2 = JSON.parse(data.body).result
  

        messages.push(makeAssistantMessage(data2))
        return data2
    } catch (error) {
        console.error('Error:', error);
        resultDiv.textContent = 'Error calling Bedrock';
    }
}


function addConversationMe(content) {
    const container = document.getElementById('conversation')
    const div = document.createElement('div')
    div.className = 'conversation-me'
    div.innerHTML = `<p>${content}</p>`
    container.appendChild(div)
}

function addInput() {
    const container = document.getElementById('conversation')
    const div = document.createElement('div')
    div.id = 'input'
    div.innerHTML = `<textarea type="text" id="promptInput" placeholder='how do i write a function in rust?'></textarea>
    <button id='send'>Send</button>`
    container.appendChild(div)


    document.getElementById('send').addEventListener('click', async () => {
        const message = document.getElementById('promptInput').value
        removeInput()
        addConversationMe(message)
        addLoading()

        const response = await callBedrock(message)
        removeLoading()
        addConversationAi(response)
        addInput()
    })
}

function removeInput() {
    const target = document.getElementById('input')
    target.remove()
}

function addLoading() {
    const container = document.getElementById('conversation')
    const div = document.createElement('div')
    div.id = 'loading'
    div.innerHTML = `Loading...`
    container.appendChild(div)
}

function removeLoading() {
    const target = document.getElementById('loading')
    target.remove()
}



/**
 * Handle response
 */


function addConversationAi(content) {
    const container = document.getElementById('conversation')
    const div = document.createElement('div')
    div.class = 'conversation-ai'
    div.innerHTML = marked.parse(content);
    container.appendChild(div)
}

document.addEventListener('DOMContentLoaded', () => {
  addInput()
});