import http from 'http'
import fs from 'fs'
import url from 'url'

function getFileContent(path, isBinary = false) {
    if (isBinary) {
        return fs.readFileSync(path);
    }
    return fs.readFileSync(path, { encoding: 'utf-8' });
}

export default function create() {
    let staticPath = 'public/'
    let routes = []
    return {
        front: (path) => {
            staticPath = path
        },
        api: (path, fn) => {
            routes.push({
                path,
                method: 'POST',
                fn
            })
        },
        start: (port = 3000) => {
            const server = http.createServer(async (req, res) => {
                const parsedUrl = url.parse(req.url, true)
                if (req.method === 'GET') {
                    const pathRaw = parsedUrl.pathname
                    if (pathRaw === '/') {
                        res.writeHead(200, {
                            'Content-Type': 'text/html'
                        })
                        const content = getFileContent(
                            staticPath + 'index.html'
                        )
                        res.end(content)
                        return
                    }
                    let path = staticPath + pathRaw
                    const type = pathRaw.split('.')[1]

                    if (type === 'ttf') {
                       path = staticPath + pathRaw.slice(1)
                    }
                    
                    let content = getFileContent(path, type === 'ttf')

                    let contentType = 'text/plain'
                    if (type === 'html') {
                        contentType = 'text/html'
                    }

                    if (type === 'css') {
                        contentType = 'text/css'
                    }

                    if (type === 'ttf') {
                        contentType ='font/ttf'
                    }

                    if (type === 'js') {
                        contentType = 'application/javascript'
                    }

                    if (type === 'png') {
                        contentType = 'image/png'
                    }
                    if (type === 'jpeg') {
                        contentType = 'image/jpeg'
                    }
                 

                    res.writeHead(200, {
                        'Content-Type': contentType,
                        'Access-Control-Allow-Origin': '*',
                    })
                    res.end(content)
                    return
                }

                for (const route of routes) {
                    if (
                        req.method === route.method &&
                        req.method === 'POST' &&
                        parsedUrl.pathname === '/api' + route.path
                    ) {
                        try {
                            let body = ''

                            req.on('data', (chunk) => {
                                body += chunk.toString()
                            })

                            req.on('end', async () => {
                                const jsonData = JSON.parse(body)

                                const x = await route.fn(jsonData)

                                res.writeHead(200, {
                                    'Content-Type': 'application/json',
                                    'Access-Control-Allow-Origin':
                                        'http://localhost:3000'
                                })
                                res.end(JSON.stringify(x))
                            })
                        } catch (error) {
                            console.error('Error parsing JSON:', error)

                            const errorResponse = {
                                status: 'error',
                                message: error.message
                            }
                            res.writeHead(400, {
                                'Content-Type': 'application/json'
                            })
                            res.end(JSON.stringify(errorResponse))
                        }
                    }
                }
            })

            server.listen(port, () => {
                console.log(`Server is running at http://localhost:${port}/`)
            })
        }
    }
}