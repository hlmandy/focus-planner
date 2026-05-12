export interface CalDAVConfig {
  serverUrl: string
  username: string
  password: string
  calendarUrl: string
}

function authHeader(config: CalDAVConfig): string {
  const token = Buffer.from(`${config.username}:${config.password}`).toString('base64')
  return `Basic ${token}`
}

function escapeIcs(text: string): string {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`
}

function dateCompact(date: string): string {
  return date.replace(/-/g, '')
}

function nowStamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

export function buildIcs(params: {
  uid: string
  summary: string
  date: string
  startMin: number
  endMin: number
  location?: string
  description?: string
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FocusPlanner//CalDAV Sync//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${params.uid}`,
    `DTSTAMP:${nowStamp()}`,
    `SUMMARY:${escapeIcs(params.summary)}`,
  ]

  const isAllDay = params.startMin === 0 && params.endMin === 0
  if (isAllDay) {
    lines.push(`DTSTART;VALUE=DATE:${dateCompact(params.date)}`)
    const [y, m, d] = params.date.split('-').map(Number)
    const next = new Date(y, m - 1, d + 1)
    const nextStr = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`
    lines.push(`DTEND;VALUE=DATE:${nextStr}`)
  } else {
    lines.push(`DTSTART:${dateCompact(params.date)}T${minutesToTimeStr(params.startMin)}`)
    lines.push(`DTEND:${dateCompact(params.date)}T${minutesToTimeStr(params.endMin)}`)
  }

  if (params.location) {
    lines.push(`LOCATION:${escapeIcs(params.location)}`)
  }
  if (params.description) {
    lines.push(`DESCRIPTION:${escapeIcs(params.description)}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR', '')
  return lines.join('\r\n')
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

interface MultistatusItem {
  href: string
  etag: string
  icalendar: string
}

export function parseMultistatusXml(xml: string): MultistatusItem[] {
  const results: MultistatusItem[] = []
  const responseRegex = /<(?:\w+:)?response\b[\s\S]*?<\/(?:\w+:)?response>/gi
  let match: RegExpExecArray | null

  while ((match = responseRegex.exec(xml)) !== null) {
    const block = match[0]
    const href = decodeXmlEntities(
      block.match(/<(?:\w+:)?href\b[^>]*>([\s\S]*?)<\/(?:\w+:)?href>/i)?.[1] || '',
    ).trim()
    const etag = decodeXmlEntities(
      block.match(/<(?:\w+:)?getetag\b[^>]*>([\s\S]*?)<\/(?:\w+:)?getetag>/i)?.[1] || '',
    ).trim()
    const calData = decodeXmlEntities(
      block.match(/<(?:\w+:)?calendar-data\b[^>]*>([\s\S]*?)<\/(?:\w+:)?calendar-data>/i)?.[1] ||
        '',
    )
    if (href) {
      results.push({ href, etag, icalendar: calData })
    }
  }
  return results
}

export interface ParsedIcsEvent {
  uid: string
  summary: string
  date: string
  startMin: number
  endMin: number
  location: string
  description: string
}

function unescapeIcs(text: string): string {
  return String(text || '')
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

export function parseIcsEvent(ics: string): ParsedIcsEvent {
  const lines = ics.split(/\r?\n/)
  const props: Record<string, string> = {}
  let lastKey = ''
  for (const raw of lines) {
    if (raw.match(/^\s/) && lastKey) {
      props[lastKey] += raw.slice(1)
    } else {
      const m = raw.match(/^([A-Z_-]+;?.*?):(.*)$/)
      if (m) {
        lastKey = m[1]
        props[lastKey] = m[2]
      }
    }
  }

  const uid = props['UID'] || ''
  const summary = unescapeIcs(props['SUMMARY'] || '')
  const location = unescapeIcs(props['LOCATION'] || '')
  const description = unescapeIcs(props['DESCRIPTION'] || '')

  const dtstartRaw = props['DTSTART'] || props['DTSTART;VALUE=DATE'] || ''
  const dtendRaw = props['DTEND'] || props['DTEND;VALUE=DATE'] || ''
  const isAllDay = 'DTSTART;VALUE=DATE' in props || dtstartRaw.length === 8

  let date = ''
  let startMin = 0
  let endMin = 0

  if (isAllDay) {
    const d = dtstartRaw.length === 8 ? dtstartRaw : dtstartRaw.slice(0, 8)
    date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
    startMin = 0
    endMin = 0
  } else {
    const timeVal = dtstartRaw.replace(/.*T/, '')
    date = dtstartRaw.slice(0, 4) + '-' + dtstartRaw.slice(4, 6) + '-' + dtstartRaw.slice(6, 8)
    const h = parseInt(timeVal.slice(0, 2), 10) || 0
    const m = parseInt(timeVal.slice(2, 4), 10) || 0
    startMin = h * 60 + m

    if (dtendRaw) {
      const etRaw = dtendRaw.replace(/.*T/, '')
      const eh = parseInt(etRaw.slice(0, 2), 10) || 0
      const em = parseInt(etRaw.slice(2, 4), 10) || 0
      endMin = eh * 60 + em
      if (endMin <= startMin) endMin = startMin + 60
    } else {
      endMin = startMin + 60
    }
  }

  return { uid, summary, date, startMin, endMin, location, description }
}

async function caldavRequest(
  config: CalDAVConfig,
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: string,
): Promise<{ status: number; headers: Headers; body: string }> {
  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(config),
      'Content-Type': 'application/xml; charset=utf-8',
      ...headers,
    },
    body,
  })
  const text = await resp.text()
  return { status: resp.status, headers: resp.headers, body: text }
}

export async function testConnection(
  config: CalDAVConfig,
): Promise<{ ok: boolean; message: string }> {
  try {
    const resp = await caldavRequest(
      config,
      'PROPFIND',
      config.calendarUrl,
      {
        Depth: '0',
      },
      '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:displayname/></d:prop></d:propfind>',
    )
    if (resp.status >= 200 && resp.status < 300) {
      return { ok: true, message: `连接成功 (HTTP ${resp.status})` }
    }
    return { ok: false, message: `连接失败 (HTTP ${resp.status})` }
  } catch (err: unknown) {
    return { ok: false, message: `连接失败: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function listRemoteEvents(config: CalDAVConfig): Promise<MultistatusItem[]> {
  const resp = await caldavRequest(
    config,
    'PROPFIND',
    config.calendarUrl,
    {
      Depth: '1',
    },
    `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
</d:propfind>`,
  )
  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(`PROPFIND failed: HTTP ${resp.status}`)
  }
  const items = parseMultistatusXml(resp.body)
  // iCloud returns empty calendar-data in PROPFIND; fetch ICS via GET for each event
  const calendarBase = config.calendarUrl.replace(/\/+$/, '')
  const serverBase = config.serverUrl.replace(/\/+$/, '')
  await Promise.all(
    items.map(async (item) => {
      if (item.icalendar || !item.href.endsWith('.ics')) return
      try {
        const href = item.href.startsWith('/')
          ? `${serverBase}${item.href}`
          : item.href
        const evResp = await caldavRequest(config, 'GET', href, {
          Accept: 'text/calendar',
        })
        if (evResp.status >= 200 && evResp.status < 300) {
          item.icalendar = evResp.body
        }
      } catch {
        // skip events we can't fetch
      }
    }),
  )
  return items
}

export async function createRemoteEvent(
  config: CalDAVConfig,
  uid: string,
  ics: string,
): Promise<{ ok: boolean; eventUrl: string; etag: string; message?: string }> {
  const calendarUrl = config.calendarUrl.replace(/\/+$/, '')
  const eventUrl = `${calendarUrl}/${uid}.ics`
  const resp = await caldavRequest(
    config,
    'PUT',
    eventUrl,
    {
      'Content-Type': 'text/calendar; charset=utf-8',
      'If-None-Match': '*',
    },
    ics,
  )
  if (resp.status >= 200 && resp.status < 300) {
    const etag = resp.headers.get('etag') || ''
    return { ok: true, eventUrl, etag }
  }
  return { ok: false, eventUrl: '', etag: '', message: `创建失败 (HTTP ${resp.status})` }
}

export async function updateRemoteEvent(
  config: CalDAVConfig,
  eventUrl: string,
  etag: string,
  ics: string,
): Promise<{ ok: boolean; etag: string; message?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'text/calendar; charset=utf-8',
  }
  if (etag) headers['If-Match'] = etag
  const resp = await caldavRequest(config, 'PUT', eventUrl, headers, ics)
  if (resp.status >= 200 && resp.status < 300) {
    const newEtag = resp.headers.get('etag') || etag
    return { ok: true, etag: newEtag }
  }
  return { ok: false, etag: '', message: `更新失败 (HTTP ${resp.status})` }
}

export async function deleteRemoteEvent(
  config: CalDAVConfig,
  eventUrl: string,
  etag: string,
): Promise<{ ok: boolean; message?: string }> {
  const headers: Record<string, string> = {}
  if (etag) headers['If-Match'] = etag
  const resp = await caldavRequest(config, 'DELETE', eventUrl, headers)
  if (resp.status >= 200 && resp.status < 400) {
    return { ok: true }
  }
  return { ok: false, message: `删除失败 (HTTP ${resp.status})` }
}
