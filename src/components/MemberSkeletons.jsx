// Reuses the shimmer primitives (.skeleton-block / .skeleton-card) so the two
// member views share one loading language with the lazy rows.
import "./RowSkeleton.css";
import "./MemberSkeletons.css";

// Placeholder for the members index while its lazy chunk downloads — same grid
// and card geometry as MembersPage so nothing jumps when the data lands.
export function MembersPageSkeleton() {
  return (
    <div className="members-page member-skeleton" role="status" aria-label="Loading members">
      <div className="members-page-head">
        <span className="skeleton-block skeleton-line skeleton-line--lg" />
        <span className="skeleton-block skeleton-line skeleton-line--sm" />
      </div>
      <div className="members-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <div className="skeleton-bias-card" key={i} />
        ))}
      </div>
      <span className="sr-only">Loading members…</span>
    </div>
  );
}

// Placeholder for a member profile: back bar, hero (photo + facts) and the first
// video strip.
export function MemberPageSkeleton() {
  return (
    <div className="member-page member-skeleton" role="status" aria-label="Loading member profile">
      <div className="member-page-bar">
        <span className="skeleton-block skeleton-line skeleton-line--pill" />
      </div>
      <div className="skeleton-hero">
        <div className="skeleton-block skeleton-hero-img" />
        <div className="skeleton-hero-info">
          <span className="skeleton-block skeleton-line skeleton-line--pill" />
          <span className="skeleton-block skeleton-line skeleton-line--xl" />
          <span className="skeleton-block skeleton-line skeleton-line--sm" />
          <span className="skeleton-block skeleton-line" />
          <span className="skeleton-block skeleton-line" />
          <span className="skeleton-block skeleton-line skeleton-line--md" />
        </div>
      </div>
      <section className="row">
        <div className="row-title">
          <span className="skeleton-block skeleton-line skeleton-line--md" />
        </div>
        <div className="row-scroll">
          {Array.from({ length: 5 }, (_, i) => (
            <div className="skeleton-card" key={i} />
          ))}
        </div>
      </section>
      <span className="sr-only">Loading member profile…</span>
    </div>
  );
}
