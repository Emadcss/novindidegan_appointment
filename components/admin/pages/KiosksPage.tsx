"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { api } from "@/components/admin/api";
import { useMonitoring } from "@/components/admin/AdminApp";
import { fa } from "@/components/admin/format";
import type { KioskView, User } from "@/components/admin/types";
import {
  Badge,
  Btn,
  Card,
  Empty,
  Field,
  Input,
  Notice,
  StateBadge,
  Table,
} from "@/components/admin/ui";

type FormState = {
  name: string;
  location: string;
  ipAddress: string;
  port: string;
  printerIp: string;
  printerPort: string;
  notes: string;
};
const EMPTY: FormState = {
  name: "",
  location: "",
  ipAddress: "",
  port: "",
  printerIp: "",
  printerPort: "9100",
  notes: "",
};

const toForm = (kiosk: KioskView): FormState => ({
  name: kiosk.name,
  location: kiosk.location ?? "",
  ipAddress: kiosk.ipAddress ?? "",
  port: kiosk.port?.toString() ?? "",
  printerIp: kiosk.printerIp ?? "",
  printerPort: kiosk.printerPort?.toString() ?? "9100",
  notes: kiosk.notes ?? "",
});

function toPayload(form: FormState) {
  const nullable = (value: string) =>
    value.trim() === "" ? null : value.trim();
  return {
    name: form.name.trim(),
    location: nullable(form.location),
    ipAddress: nullable(form.ipAddress),
    port: form.port.trim() === "" ? null : Number(form.port),
    printerIp: nullable(form.printerIp),
    printerPort:
      form.printerIp.trim() === ""
        ? null
        : form.printerPort.trim() === ""
          ? null
          : Number(form.printerPort),
    notes: nullable(form.notes),
  };
}

function KioskForm({
  initial,
  onSaved,
  onCancel,
  kioskId,
}: {
  initial: FormState;
  kioskId?: number;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set =
    (key: keyof FormState) => (event: { target: { value: string } }) =>
      setForm({ ...form, [key]: event.target.value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (kioskId) await api.patch(`/kiosks/${kioskId}`, toPayload(form));
      else await api.post("/kiosks", toPayload(form));
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <Field label="نام کیوسک">
        <Input
          value={form.name}
          onChange={set("name")}
          placeholder="مثلاً کیوسک ورودی"
        />
      </Field>
      <Field label="مکان نصب">
        <Input
          value={form.location}
          onChange={set("location")}
          placeholder="مثلاً طبقه‌ی همکف، کنار پذیرش"
        />
      </Field>
      <Field
        label="نشانی IP کیوسک"
        hint="برای بررسی روشن بودن دستگاه از سمت سرور؛ اختیاری">
        <Input
          dir="ltr"
          value={form.ipAddress}
          onChange={set("ipAddress")}
          placeholder="192.168.1.21"
        />
      </Field>
      <Field
        label="پورت کیوسک"
        hint="پورتی که روی کیوسک باز است (مثلاً ۳۳۸۹ برای دسترسی از راه دور)">
        <Input
          dir="ltr"
          value={form.port}
          onChange={set("port")}
          placeholder="3389"
          inputMode="numeric"
        />
      </Field>
      <Field
        label="نشانی IP چاپگر"
        hint="چاپگر حرارتی شبکه‌ای؛ برای بررسی کاغذ و خطا">
        <Input
          dir="ltr"
          value={form.printerIp}
          onChange={set("printerIp")}
          placeholder="192.168.1.31"
        />
      </Field>
      <Field label="پورت چاپگر" hint="پیش‌فرض بیشتر چاپگرها ۹۱۰۰ است">
        <Input
          dir="ltr"
          value={form.printerPort}
          onChange={set("printerPort")}
          inputMode="numeric"
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="توضیحات">
          <Input value={form.notes} onChange={set("notes")} />
        </Field>
      </div>
      {error && (
        <div className="md:col-span-2">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      <div className="flex gap-2 md:col-span-2">
        <Btn
          variant="primary"
          type="submit"
          disabled={busy || form.name.trim().length < 2}>
          {kioskId ? "ذخیره‌ی تغییرات" : "افزودن کیوسک"}
        </Btn>
        <Btn type="button" variant="ghost" onClick={onCancel}>
          انصراف
        </Btn>
      </div>
    </form>
  );
}

function PairingBox({
  kiosk,
  onClose,
}: {
  kiosk: KioskView;
  onClose: () => void;
}) {
  const [code, setCode] = useState<{
    displayCode: string;
    code: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [base, setBase] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (window.localStorage.getItem("kioskBaseUrl") ??
        `http://آدرس-سرور:${window.location.port || 3000}`),
  );

  async function issue() {
    setError(null);
    try {
      setCode(await api.post(`/kiosks/${kiosk.id}/pairing-code`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "خطا");
    }
  }

  function changeBase(value: string) {
    setBase(value);
    window.localStorage.setItem("kioskBaseUrl", value);
  }

  return (
    <Card
      title={`جفت‌سازی «${kiosk.name}»`}
      actions={
        <Btn small variant="ghost" onClick={onClose}>
          بستن
        </Btn>
      }
      className="border-brand">
      <div className="flex flex-col gap-3 text-sm">
        <p>
          اتصال کیوسک را به‌عنوان دستگاه مجاز ثبت می‌کند تا پالس و نوبت‌هایش به
          نام همین کیوسک ثبت شود. فقط یک‌بار لازم است.
        </p>
        {!code ? (
          <Btn variant="primary" onClick={() => void issue()}>
            صدور کد جفت‌سازی
          </Btn>
        ) : (
          <>
            <p
              className="rounded-lg bg-brand-soft p-4 text-center text-3xl font-bold tracking-widest text-brand"
              dir="ltr"
              data-testid="pairing-code">
              {code.displayCode}
            </p>
            <p className="text-xs text-ink-muted">
              این کد ۲۴ ساعت معتبر و یک‌بارمصرف است.
            </p>
            <Field
              label="آدرس سرور از دید کیوسک"
              hint="همان نشانی که روی کیوسک در مرورگر باز می‌شود">
              <Input
                dir="ltr"
                value={base}
                onChange={(event) => changeBase(event.target.value)}
              />
            </Field>
            <p>
              روی خود کیوسک در مرورگر این آدرس را باز کنید (کد هم داخلش هست):
            </p>
            <p
              className="select-all rounded-lg bg-paper p-3 text-left font-mono text-xs"
              dir="ltr">
              {base}/pair?code={code.code}
            </p>
          </>
        )}
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </Card>
  );
}

export default function KiosksPage({ user }: { user: User }) {
  const { data, reload } = useMonitoring();
  const isAdmin = user.role === "admin";
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [pairing, setPairing] = useState<KioskView | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "خطا");
    }
  }

  const kiosks = data?.kiosks ?? [];
  const editingKiosk =
    typeof editing === "number"
      ? kiosks.find((kiosk) => kiosk.id === editing)
      : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">کیوسک‌ها</h1>
        {isAdmin && (
          <Btn
            variant="primary"
            onClick={() => {
              setEditing("new");
              setPairing(null);
            }}>
            + کیوسک جدید
          </Btn>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {editing !== null && (
        <Card
          title={
            editing === "new" ? "کیوسک جدید" : `ویرایش «${editingKiosk?.name}»`
          }>
          <KioskForm
            key={String(editing)}
            kioskId={typeof editing === "number" ? editing : undefined}
            initial={editingKiosk ? toForm(editingKiosk) : EMPTY}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
            onCancel={() => setEditing(null)}
          />
        </Card>
      )}

      {pairing && (
        <PairingBox
          kiosk={pairing}
          onClose={() => {
            setPairing(null);
            reload();
          }}
        />
      )}

      <Card>
        {kiosks.length === 0 ? (
          <Empty>هنوز کیوسکی تعریف نشده است.</Empty>
        ) : (
          <Table
            head={[
              "نام",
              "مکان",
              "کیوسک (IP:پورت)",
              "چاپگر (IP:پورت)",
              "وضعیت",
              "جفت‌سازی",
              "عملیات",
            ]}>
            {kiosks.map((kiosk) => (
              <tr key={kiosk.id}>
                <td className="font-bold">{kiosk.name}</td>
                <td>{kiosk.location ?? "—"}</td>
                <td dir="ltr" className="text-right">
                  {kiosk.ipAddress
                    ? `${kiosk.ipAddress}${kiosk.port ? ":" + kiosk.port : ""}`
                    : "—"}
                </td>
                <td dir="ltr" className="text-right">
                  {kiosk.printerIp
                    ? `${kiosk.printerIp}${kiosk.printerPort ? ":" + kiosk.printerPort : ""}`
                    : "—"}
                </td>
                <td>
                  <StateBadge state={kiosk.statusState} />
                </td>
                <td>
                  {kiosk.paired ? (
                    <Badge tone="green">جفت‌شده</Badge>
                  ) : kiosk.pairingPending ? (
                    <Badge tone="amber">منتظر جفت‌سازی</Badge>
                  ) : (
                    <Badge>جفت نشده</Badge>
                  )}
                </td>
                <td>
                  {isAdmin ? (
                    <div className="flex flex-wrap gap-1">
                      <Btn
                        small
                        onClick={() => {
                          setEditing(kiosk.id);
                          setPairing(null);
                        }}>
                        ویرایش
                      </Btn>
                      {kiosk.isActive && (
                        <Btn
                          small
                          onClick={() => {
                            setPairing(kiosk);
                            setEditing(null);
                          }}>
                          کد جفت‌سازی
                        </Btn>
                      )}
                      {kiosk.paired && (
                        <Btn
                          small
                          variant="ghost"
                          onClick={() => {
                            if (
                              window.confirm(
                                `جفت‌سازی «${kiosk.name}» باطل شود؟ کیوسک دیگر اعلان نمی‌فرستد تا دوباره جفت شود.`,
                              )
                            )
                              void run(() =>
                                api.post(`/kiosks/${kiosk.id}/revoke`),
                              );
                          }}>
                          ابطال
                        </Btn>
                      )}
                      <Btn
                        small
                        variant={kiosk.isActive ? "ghost" : "primary"}
                        onClick={() =>
                          void run(() =>
                            api.patch(`/kiosks/${kiosk.id}`, {
                              isActive: !kiosk.isActive,
                            }),
                          )
                        }>
                        {kiosk.isActive ? "غیرفعال" : "فعال‌سازی"}
                      </Btn>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-3 text-xs text-ink-muted">
          نشانی IP و پورت کیوسک فقط برای «بررسی در دسترس بودن دستگاه» استفاده
          می‌شود (اتصال TCP). چاپگر باید شبکه‌ای و سازگار با ESC/POS باشد؛ اگر
          به پرسش وضعیت پاسخ ندهد، فقط روشن بودنش بررسی می‌شود. تعداد کیوسک‌ها:{" "}
          {fa(kiosks.length)}
        </p>
      </Card>
    </div>
  );
}
