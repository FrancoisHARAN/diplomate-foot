const PageTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <section className="card">
    <h1>{title}</h1>
    {subtitle ? <p>{subtitle}</p> : null}
  </section>
);

export default PageTitle;
