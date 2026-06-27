interface Props {
  vaultName: string
  boardName?: string
}

export default function TitleBar({ vaultName, boardName }: Props) {
  return (
    <div
      className="drag-region h-10 flex items-center px-4 border-b border-border flex-shrink-0"
      style={{ paddingLeft: 80 }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[11.7px] text-text-muted font-medium tracking-wide uppercase">
          {vaultName}
        </span>
        {boardName && (
          <>
            <span className="text-text-muted">/</span>
            <span className="text-[12.7px] text-text-secondary truncate">{boardName}</span>
          </>
        )}
      </div>
    </div>
  )
}
