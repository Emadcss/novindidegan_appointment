"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { api } from "@/components/admin/api";
import { formatDateTime } from "@/components/admin/format";
import { useFetch } from "@/components/admin/hooks";
import type { Role, User } from "@/components/admin/types";
import {
  Badge,
  Btn,
  Card,
  Empty,
  Field,
  Input,
  Loading,
  Notice,
  Select,
  Table,
} from "@/components/admin/ui";

export default function UsersPage({ me }: { me: User }) {
  const { data, loading, error, reload } = useFetch<User[]>("/users");
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "viewer" as Role,
  });
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);

  async function run(action: () => Promise<unknown>, success: string) {
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "success", text: success });
      reload();
    } catch (caught) {
      setMessage({
        tone: "error",
        text: caught instanceof Error ? caught.message : "خطا",
      });
    }
  }

  function add(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await api.post("/users", form);
      setForm({ username: "", displayName: "", password: "", role: "viewer" });
    }, "کاربر ساخته شد");
  }

  function resetPassword(user: User) {
    const password = window.prompt(
      `رمز جدید برای «${user.username}» (حداقل ۸ کاراکتر، شامل حرف و عدد):`,
    );
    if (password)
      void run(
        () => api.patch(`/users/${user.id}`, { password }),
        "رمز تغییر کرد و نشست‌های کاربر بسته شد",
      );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">کاربران پنل</h1>
      <p className="text-sm text-ink-muted">
        «مدیر» به همه‌چیز دسترسی دارد. «ناظر» فقط می‌بیند (مانیتورینگ، نوبت‌ها،
        گزارش‌ها) و نمی‌تواند چیزی را تغییر دهد یا هویت کامل بیماران را ببیند.
      </p>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card title="افزودن کاربر">
        <form onSubmit={add} className="grid gap-3 md:grid-cols-4">
          <Field label="نام کاربری">
            <Input
              dir="ltr"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              aria-label="نام کاربری جدید"
            />
          </Field>
          <Field label="نام نمایشی">
            <Input
              value={form.displayName}
              onChange={(e) =>
                setForm({ ...form, displayName: e.target.value })
              }
              aria-label="نام نمایشی جدید"
            />
          </Field>
          <Field label="رمز اولیه">
            <Input
              dir="ltr"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              aria-label="رمز اولیه"
            />
          </Field>
          <Field label="نقش">
            <Select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as Role })
              }>
              <option value="viewer">ناظر (فقط مشاهده)</option>
              <option value="admin">مدیر</option>
            </Select>
          </Field>
          <div className="md:col-span-4">
            <Btn
              variant="primary"
              type="submit"
              disabled={!form.username || !form.displayName || !form.password}>
              افزودن
            </Btn>
          </div>
        </form>
      </Card>

      <Card>
        {loading ? (
          <Loading />
        ) : error || !data ? (
          <Empty>{error}</Empty>
        ) : (
          <Table head={["نام کاربری", "نام", "نقش", "وضعیت", "آخرین ورود", ""]}>
            {data.map((user) => (
              <tr key={user.id}>
                <td dir="ltr" className="text-right font-medium">
                  {user.username}
                </td>
                <td>{user.displayName}</td>
                <td>
                  <Select
                    value={user.role}
                    disabled={user.id === me.id}
                    aria-label={`نقش ${user.username}`}
                    className="w-28 py-1"
                    onChange={(e) =>
                      void run(
                        () =>
                          api.patch(`/users/${user.id}`, {
                            role: e.target.value,
                          }),
                        "نقش تغییر کرد",
                      )
                    }>
                    <option value="admin">مدیر</option>
                    <option value="viewer">ناظر</option>
                  </Select>
                </td>
                <td>
                  {user.isActive ? (
                    <Badge tone="green">فعال</Badge>
                  ) : (
                    <Badge>غیرفعال</Badge>
                  )}
                </td>
                <td className="text-xs">
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}
                </td>
                <td className="whitespace-nowrap">
                  <Btn
                    small
                    variant="ghost"
                    onClick={() => resetPassword(user)}>
                    رمز جدید
                  </Btn>{" "}
                  {user.id !== me.id && (
                    <Btn
                      small
                      variant="ghost"
                      onClick={() =>
                        void run(
                          () =>
                            api.patch(`/users/${user.id}`, {
                              isActive: !user.isActive,
                            }),
                          user.isActive ? "کاربر غیرفعال شد" : "کاربر فعال شد",
                        )
                      }>
                      {user.isActive ? "غیرفعال" : "فعال"}
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
