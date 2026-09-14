import React, { useId } from "react";
import "./dailyForm.css";

export function DailyField({ label, children, wide = false }) {
  const id = useId();
  return <div className={`daily-field${wide ? " md:col-span-2" : ""}`}>
    <label htmlFor={id}>{label}</label>
    {React.cloneElement(children, { id })}
  </div>;
}

export function DailySection({ title, subtitle, code, tone = "basic", sectionKey, children }) {
  const titleId = useId();
  return <section className="daily-section md:col-span-2" data-tone={tone} data-daily-section={sectionKey} aria-labelledby={titleId}>
    <header className="daily-section-heading"><span className="daily-section-code" aria-hidden="true">{code}</span><div><h3 id={titleId}>{title}</h3>{subtitle && <p>{subtitle}</p>}</div></header>
    <div className="daily-section-body">{children}</div>
  </section>;
}
