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
  return parseMultistatusXml(resp.body)
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
