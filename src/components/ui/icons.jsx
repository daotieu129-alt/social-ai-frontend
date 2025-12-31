import React from "react";

export function IconUser(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 12a4.3 4.3 0 1 0-4.3-4.3A4.3 4.3 0 0 0 12 12Z"
        className="stroke-current"
        strokeWidth="1.6"
      />
      <path
        d="M4.5 20c1.4-3.9 4.2-6 7.5-6s6.1 2.1 7.5 6"
        className="stroke-current"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMail(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 6.75A2.75 2.75 0 0 1 6.75 4h10.5A2.75 2.75 0 0 1 20 6.75v10.5A2.75 2.75 0 0 1 17.25 20H6.75A2.75 2.75 0 0 1 4 17.25V6.75Z"
        className="stroke-current"
        strokeWidth="1.6"
      />
      <path
        d="M6.5 7.5 12 12l5.5-4.5"
        className="stroke-current"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLock(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7 10V8.5A5 5 0 0 1 12 3.5a5 5 0 0 1 5 5V10"
        className="stroke-current"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6.5 10h11A2.5 2.5 0 0 1 20 12.5v5A3 3 0 0 1 17 20.5H7A3 3 0 0 1 4 17.5v-5A2.5 2.5 0 0 1 6.5 10Z"
        className="stroke-current"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function IconEye({ open, ...props }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        className="stroke-current"
        strokeWidth="1.6"
      />
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        className="stroke-current"
        strokeWidth="1.6"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 4l16 16"
        className="stroke-current"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5c1.8 0 3.4.5 4.8 1.2M21.5 12s-3.5 6.5-9.5 6.5c-1.8 0-3.4-.5-4.8-1.2"
        className="stroke-current"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
