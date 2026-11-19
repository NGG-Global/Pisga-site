import { Link } from 'react-router-dom';
import { PageTitle } from '../components/ui';
import { strings } from '../content/strings';

export function NotFound() {
  return (
    <main className="app-main">
      <PageTitle title={strings.common.notFound} />
      <Link className="link" to="/">
        {strings.common.homeLink}
      </Link>
    </main>
  );
}
