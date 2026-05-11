// function documentCountLabel(count: number) {
//   return `${count} document${count === 1 ? "" : "s"}`;
// }

interface KnowledgeSectionTitleProps {
  title: string;
  count: number;
}

export function KnowledgeSectionTitle({ title, count }: KnowledgeSectionTitleProps) {
  // const countText = documentCountLabel(count);

  return (
    <>
      <div className="flex items-center justify-between gap-3 md:hidden">
        <h2 className="text-app-section">
          {title} ({count})
        </h2>
        {/* <span className="text-app-muted">{countText}</span> */}
      </div>
      <div className="hidden items-baseline gap-3 md:flex">
        <h2 className="text-app-section">
          {title} ({count})
        </h2>
        {/* <span className="text-app-muted">{countText}</span> */}
      </div>
    </>
  );
}
