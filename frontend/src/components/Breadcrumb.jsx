import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ROUTE_LABELS = {
  dashboard: 'Dashboard',
  resumes: 'Resumes',
  upload: 'Upload',
  jobs: 'Jobs',
  candidates: 'Candidates',
  profile: 'Profile',
  new: 'New',
  edit: 'Edit',
};

const toReadableLabel = (segment) => {
  const normalized = decodeURIComponent(segment || '').trim();

  if (!normalized) {
    return '';
  }

  if (ROUTE_LABELS[normalized]) {
    return ROUTE_LABELS[normalized];
  }

  return normalized
    .replace(/-/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function Breadcrumb() {
  const { pathname } = useLocation();

  const pathSegments = pathname
    .split('/')
    .filter((part) => part && part.trim().length > 0);

  const crumbs = [
    { label: 'Platform', path: '/' },
    ...pathSegments.map((segment, index) => ({
      label: toReadableLabel(segment),
      path: `/${pathSegments.slice(0, index + 1).join('/')}`,
    })),
  ];

  return (
    <nav className="hidden sm:flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <React.Fragment key={`${crumb.path}-${index}`}>
          {index > 0 && <ChevronRight size={14} className="text-slate-600" />}
          <Link
            to={crumb.path}
            className={`transition-colors ${
              index === crumbs.length - 1
                ? 'text-slate-300 hover:text-slate-200'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {crumb.label}
          </Link>
        </React.Fragment>
      ))}
    </nav>
  );
}
