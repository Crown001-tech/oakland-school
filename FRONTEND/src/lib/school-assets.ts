/**
 * The school's logo: a path under `public/`, set per deployment with NEXT_PUBLIC_SCHOOL_LOGO.
 * A path that does not start with a single slash is ignored.
 */
const configured = process.env.NEXT_PUBLIC_SCHOOL_LOGO || '';

export const SCHOOL_LOGO = /^\/(?!\/)[\w./-]+$/.test(configured) ? configured : '/logo.jpg';
