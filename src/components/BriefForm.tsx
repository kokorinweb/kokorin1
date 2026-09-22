"use client";

import { useId, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { brief, contact } from "@/content/site";

type Status = "idle" | "sending" | "ok" | "error";

const channelIcon: Record<string, IconName> = {
  telegram: "telegram",
  instagram: "instagram",
  email: "mail",
};

export function BriefForm() {
  const formId = useId();
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const body = {
      role,
      goal,
      task: String(data.get("task") ?? ""),
      contact: String(data.get("contact") ?? ""),
      consent: data.get("consent") === "on",
    };

    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !result.ok) {
        setStatus("error");
        setMessage(result.error ?? brief.states.error);
        return;
      }

      setStatus("ok");
      setMessage(brief.states.ok);
      form.reset();
      setRole("");
      setGoal("");
    } catch {
      setStatus("error");
      setMessage(brief.states.error);
    }
  };

  return (
    <section id="brief" className="section">
      <div className="shell">
        <SectionHead
          index={brief.index}
          kicker={brief.kicker}
          title={brief.title}
          lead={brief.lead}
        />

        <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:items-start">
          <Reveal>
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-9">
              {/* 01 — кто вы */}
              <Question n={brief.steps[0].n} question={brief.steps[0].question}>
                <ChipGroup
                  name={`${formId}-role`}
                  options={[...brief.steps[0].options]}
                  value={role}
                  onChange={setRole}
                />
              </Question>

              {/* 02 — что хотите сделать */}
              <Question n={brief.steps[1].n} question={brief.steps[1].question}>
                <ChipGroup
                  name={`${formId}-goal`}
                  options={[...brief.steps[1].options]}
                  value={goal}
                  onChange={setGoal}
                />
              </Question>

              {/* 03 — задача */}
              <Question n={brief.steps[2].n} question={brief.steps[2].question}>
                <textarea
                  name="task"
                  rows={5}
                  required
                  minLength={10}
                  maxLength={4000}
                  placeholder={brief.steps[2].placeholder}
                  className="field resize-y"
                />
              </Question>

              {/* 04 — контакт */}
              <Question n={brief.steps[3].n} question={brief.steps[3].question}>
                <input
                  name="contact"
                  type="text"
                  required
                  inputMode="text"
                  autoComplete="username"
                  placeholder={brief.steps[3].placeholder}
                  className="field max-w-sm"
                />
              </Question>

              <label className="flex cursor-pointer items-start gap-3 text-[0.8125rem] leading-[1.5]"
                style={{ color: "var(--color-fg-soft)" }}
              >
                <input
                  name="consent"
                  type="checkbox"
                  required
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-acid)]"
                />
                <span>
                  {brief.consent.before}
                  <a
                    href={brief.consent.href}
                    className="underline"
                    style={{ color: "var(--color-fg)" }}
                  >
                    {brief.consent.linkLabel}
                  </a>
                  {brief.consent.after}
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={status === "sending"}
                  style={status === "sending" ? { opacity: 0.6 } : undefined}
                >
                  {status === "sending" ? brief.states.sending : brief.submitLabel}
                  <Icon name="arrow-up-right" size={15} />
                </button>

                {/* Ответ формы объявляется вспомогательным технологиям */}
                <p
                  role="status"
                  aria-live="polite"
                  className="text-[0.875rem]"
                  style={{
                    color:
                      status === "error"
                        ? "#ff8f6b"
                        : status === "ok"
                          ? "var(--color-acid)"
                          : "var(--color-fg-soft)",
                  }}
                >
                  {message}
                </p>
              </div>
            </form>
          </Reveal>

          <Reveal delay={90}>
            <aside className="surface p-6 md:p-7">
              <p className="label">{brief.directLabel}</p>
              <ul className="mt-5 flex flex-col gap-1">
                {contact.channels.map((channel) => (
                  <li key={channel.kind}>
                    <a
                      href={channel.href}
                      target={channel.kind === "email" ? undefined : "_blank"}
                      rel={channel.kind === "email" ? undefined : "noreferrer noopener"}
                      className="group -mx-2 flex items-center gap-3.5 rounded-xl px-2 py-3 transition-colors duration-200"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 group-hover:border-[var(--color-acid)] group-hover:text-[var(--color-acid)]"
                        style={{
                          borderColor: "var(--color-line-strong)",
                          color: "var(--color-fg-soft)",
                        }}
                      >
                        <Icon name={channelIcon[channel.kind]} size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="label block">{channel.label}</span>
                        <span className="block truncate text-[0.9375rem]">{channel.value}</span>
                      </span>
                      <Icon
                        name="arrow-up-right"
                        size={15}
                        className="ml-auto shrink-0 opacity-40 transition-all duration-200 group-hover:opacity-100"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Question({
  n,
  question,
  children,
}: {
  n: string;
  question: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-4 flex items-baseline gap-3">
        <span className="label tnum" style={{ color: "var(--color-acid)" }}>
          {n}
        </span>
        <span className="display text-[1.15rem]" style={{ fontWeight: 600 }}>
          {question}
        </span>
      </legend>
      {children}
    </fieldset>
  );
}

function ChipGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const checked = value === option;
        return (
          <label
            key={option}
            className="cursor-pointer rounded-full border px-4 py-2.5 text-[0.875rem] transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-acid)]"
            style={{
              borderColor: checked ? "var(--color-acid)" : "var(--color-line-strong)",
              backgroundColor: checked ? "var(--color-acid)" : "transparent",
              color: checked ? "var(--color-ink)" : "var(--color-fg-soft)",
              transitionTimingFunction: "var(--ease-out-soft)",
            }}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={checked}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {option}
          </label>
        );
      })}
    </div>
  );
}
