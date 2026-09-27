import { parseContent } from "@/server/content/pages";

export function ContentBody({ body }: { body: string }) {
  return (
    <div className="prose-content max-w-3xl text-ink/90">
      {parseContent(body).map((b, i) =>
        b.type === "h2" ? (
          <h2 key={i}>{b.text}</h2>
        ) : b.type === "ul" ? (
          <ul key={i}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
        ) : (
          <p key={i} className="whitespace-pre-line">{b.text}</p>
        ),
      )}
    </div>
  );
}
