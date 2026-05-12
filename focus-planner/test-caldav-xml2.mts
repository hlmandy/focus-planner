const config = {
  serverUrl: 'https://caldav.icloud.com',
  username: '277206840@qq.com',
  password: 'qbvf-ypyb-eifo-mgbl',
  calendarUrl: 'https://p142-caldav.icloud.com:443/22634315249/calendars/0DDD1B1C-F4A1-4D69-92D5-D24128E69E0F/'
}

const token = Buffer.from(`${config.username}:${config.password}`).toString('base64')
const resp = await fetch(config.calendarUrl, {
  method: 'PROPFIND',
  headers: {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/xml; charset=utf-8',
    Depth: '1',
  },
  body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
</d:propfind>`,
})

const text = await resp.text()
// Print the 2nd and 3rd response elements
const responseRegex = /<(?:\w+:)?response\b[\s\S]*?<\/(?:\w+:)?response>/gi
let match
let i = 0
while ((match = responseRegex.exec(text)) !== null) {
  i++
  if (i >= 2 && i <= 3) {
    console.log(`--- Response ${i} ---`)
    console.log(match[0].slice(0, 2000))
    console.log()
  }
}
