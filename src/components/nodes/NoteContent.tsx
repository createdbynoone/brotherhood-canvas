// Lightweight markdown headings for note/text nodes: lines starting with
// "# ", "## " or "### " render as three heading sizes. Editing shows raw text.
const HEADING_STYLES: Record<number, string> = {
  1: 'text-[19.5px] font-heading font-bold leading-snug',
  2: 'text-[16.5px] font-heading font-semibold leading-snug',
  3: 'text-[14.5px] font-heading font-semibold leading-snug',
}

export default function NoteContent({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        const m = line.match(/^(#{1,3})\s+(.*)/)
        if (m) {
          return (
            <div key={i} className={`${HEADING_STYLES[m[1].length]} ${i > 0 ? 'mt-2' : ''} mb-0.5`}>
              {m[2]}
            </div>
          )
        }
        return (
          <div key={i} className="whitespace-pre-wrap">
            {line || '\u00A0'}
          </div>
        )
      })}
    </>
  )
}
