export function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-5xl">
        {title}
      </h2>
      {text ? <p className="mt-4 text-base leading-7 text-muted">{text}</p> : null}
    </div>
  );
}
