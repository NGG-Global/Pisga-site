import type { CSSProperties } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useMe } from '../auth/AuthProvider';
import { strings } from '../content/strings';
import { isParticipant, isStaff, type Role } from '../data/types';
import { DEMO_MODE } from '../lib/env';
import { brand, iconPath, type IconName } from '../theme/brand';

interface TabDef {
  to: string;
  label: string;
  icon: IconName;
}

function tabsFor(role: Role | null): TabDef[] {
  const t = strings.tabs;
  const tabs: TabDef[] = [
    { to: '/', label: t.home, icon: 'summit' },
    { to: '/sessions', label: t.sessions, icon: 'calendar' },
    { to: '/project', label: t.project, icon: 'goal' },
  ];
  if (isParticipant(role)) {
    tabs.push({ to: '/journal', label: t.journal, icon: 'milestone' }, { to: '/advisor', label: t.advisor, icon: 'dialogue' });
  }
  if (isStaff(role)) tabs.push({ to: '/admin', label: t.admin, icon: 'document' });
  return tabs;
}

function isCurrent(tab: TabDef, pathname: string): boolean {
  return tab.to === '/' ? pathname === '/' : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
}

export function Header() {
  return (
    <header className="app-header">
      <Link className="app-header__home" to="/" aria-label={strings.common.homeLink}>
        <img src={brand.logos.programmeHorizontal} alt={`${brand.programmeName}, ${brand.tagline}`} />
      </Link>
      <img className="app-header__client" src={brand.logos.client} alt={brand.clientName} />
    </header>
  );
}

function TabBar() {
  const { role } = useMe();
  const { pathname } = useLocation();
  const tabs = tabsFor(role);
  const current = Math.max(0, tabs.findIndex((tab) => isCurrent(tab, pathname)));
  return (
    <nav className="tabbar" aria-label={strings.tabs.aria} style={{ '--current': current, '--count': tabs.length } as CSSProperties}>
      <span className="tabbar__indicator" aria-hidden="true">
        <span />
      </span>
      {tabs.map((tab, i) => (
        <Link key={tab.to} to={tab.to} className="tab" aria-current={i === current ? 'page' : undefined}>
          <img src={iconPath(tab.icon)} alt="" />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function DemoStrip() {
  return DEMO_MODE ? <div className="demo-strip">{strings.demo.banner}</div> : null;
}

/**
 * The frame of every signed-in screen: header, the screen itself, and the tab bar.
 * Focused flows (questionnaire, leadership map, reflection, export) omit the tab bar.
 */
export function Shell({ tabs = false, flat = false, wide = false }: { tabs?: boolean; flat?: boolean; wide?: boolean }) {
  return (
    <div className={`app${flat ? ' app--flat' : ''}${wide ? ' app--wide' : ''}`}>
      <DemoStrip />
      <Header />
      <Outlet />
      {tabs && <TabBar />}
    </div>
  );
}
