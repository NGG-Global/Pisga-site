import { delay, PageTitle, Tag } from '../components/ui';
import { strings } from '../content/strings';
import { brand } from '../theme/brand';

/** Empty at launch by decision. The data model for teams and stages is prepared in the database. */
export function Project() {
  const p = strings.project;
  return (
    <main className="app-main">
      <PageTitle title={p.title}>
        <span className="meta">{p.subtitle}</span>
      </PageTitle>
      <section className="card stack" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="banner banner--lg">
          <img className="plane" src={brand.logos.programmeSymbol} alt="" />
        </div>
        <div className="stack stack--10 start rise" style={{ ...delay(600), padding: 20 }}>
          <Tag tone="muted">{p.soonTag}</Tag>
          <strong style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3 }}>{p.emptyTitle}</strong>
          <span className="muted">{p.emptyText}</span>
        </div>
      </section>
    </main>
  );
}
