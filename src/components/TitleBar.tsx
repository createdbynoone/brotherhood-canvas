interface Props {
  vaultName: string
  boardName?: string
}

export default function TitleBar({ vaultName, boardName }: Props) {
  return (
    <div
      className="drag-region h-10 flex items-center border-b border-border flex-shrink-0"
      style={{ paddingLeft: 80, paddingRight: 16 }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="font-heading font-semibold text-[12px] text-text-muted uppercase tracking-widest">
          {vaultName}
        </span>
        {boardName && (
          <>
            <span className="text-text-muted/50">·</span>
            <span className="font-heading text-[12px] text-text-secondary truncate">{boardName}</span>
          </>
        )}
      </div>
      <span className="font-mono text-[10.7px] text-text-muted tracking-widest uppercase">brotherhood.com.co</span>
    </div>
  )
}
