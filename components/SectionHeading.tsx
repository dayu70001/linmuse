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
      <h2 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {text ? <p className="mt-3 text-sm leading-6 text-muted sm:text-base">{text}</p> : null}
    </div>
  );
}
